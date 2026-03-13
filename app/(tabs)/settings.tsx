import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBills } from "@/lib/bills-context";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import {
  requestNotificationPermissions,
  cancelAllBillNotifications,
} from "@/lib/notifications";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, updateSettings, bills, bulkDelete } = useBills();
  const { colorScheme, setColorScheme } = useThemeContext();

  const handleToggleNotifications = async (value: boolean) => {
    haptic();
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permissão Negada",
          "Para receber notificações, ative as permissões nas configurações do dispositivo."
        );
        return;
      }
    }
    await updateSettings({ notificationsEnabled: value });
  };

  const handleNotificationHour = (hour: number) => {
    haptic();
    updateSettings({ defaultNotificationHour: hour });
  };

  const handleTheme = (theme: "light" | "dark" | "system") => {
    haptic();
    updateSettings({ theme });
    const scheme = theme === "system" ? (colorScheme ?? "light") : theme;
    setColorScheme(scheme);
  };

  const handleClearAllData = () => {
    haptic();
    Alert.alert(
      "Apagar Todos os Dados",
      "Esta ação irá apagar TODAS as contas e configurações. Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar Tudo",
          style: "destructive",
          onPress: async () => {
            await cancelAllBillNotifications();
            await bulkDelete(bills.map((b) => b.id));
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const totalBills = bills.length;
  const paidBills = bills.filter((b) => b.isPaid).length;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Resumo Geral</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalBills}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Total de Contas</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>{paidBills}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Pagas</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{totalBills - paidBills}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Pendentes</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notificações</Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <IconSymbol name="bell.fill" size={18} color={settings.notificationsEnabled ? colors.primary : colors.muted} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Ativar Notificações</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Receber lembretes de vencimento</Text>
              </View>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {settings.notificationsEnabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <IconSymbol name="clock.fill" size={18} color={colors.primary} />
                <View>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Horário das Notificações</Text>
                  <Text style={[styles.settingDesc, { color: colors.muted }]}>
                    {String(settings.defaultNotificationHour).padStart(2, "0")}:{String(settings.defaultNotificationMinute).padStart(2, "0")}h
                  </Text>
                </View>
              </View>
            </View>
          )}

          {settings.notificationsEnabled && (
            <View style={styles.hourPicker}>
              <Text style={[styles.hourPickerLabel, { color: colors.muted }]}>Selecione o horário:</Text>
              <View style={styles.hourGrid}>
                {[7, 8, 9, 10, 12, 14, 16, 18, 20, 22].map((h) => (
                  <Pressable
                    key={h}
                    style={({ pressed }) => [
                      styles.hourBtn,
                      {
                        backgroundColor: settings.defaultNotificationHour === h ? colors.primary : colors.background,
                        borderColor: settings.defaultNotificationHour === h ? colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => handleNotificationHour(h)}
                  >
                    <Text style={[styles.hourBtnText, { color: settings.defaultNotificationHour === h ? "#fff" : colors.foreground }]}>
                      {String(h).padStart(2, "0")}h
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Theme */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Aparência</Text>
          <View style={styles.themeRow}>
            {([
              { key: "light", label: "Claro", icon: "sun.max.fill" as const },
              { key: "system", label: "Sistema", icon: "gearshape.fill" as const },
              { key: "dark", label: "Escuro", icon: "moon.fill" as const },
            ] as const).map(({ key, label, icon }) => (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.themeBtn,
                  {
                    backgroundColor: settings.theme === key ? colors.primary : colors.background,
                    borderColor: settings.theme === key ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => handleTheme(key)}
              >
                <IconSymbol name={icon} size={20} color={settings.theme === key ? "#fff" : colors.muted} />
                <Text style={[styles.themeBtnText, { color: settings.theme === key ? "#fff" : colors.foreground }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.error + "44" }]}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Zona de Perigo</Text>
          <Pressable
            style={({ pressed }) => [
              styles.dangerBtn,
              { backgroundColor: colors.error + "18", borderColor: colors.error, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleClearAllData}
          >
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
            <Text style={[styles.dangerBtnText, { color: colors.error }]}>Apagar Todos os Dados</Text>
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.muted }]}>Contas & Boletos</Text>
          <Text style={[styles.appInfoVersion, { color: colors.muted }]}>Versão 1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  hourPicker: {
    gap: 10,
  },
  hourPickerLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  hourGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hourBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 52,
    alignItems: "center",
  },
  hourBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  appInfo: {
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
  },
  appInfoText: {
    fontSize: 14,
    fontWeight: "600",
  },
  appInfoVersion: {
    fontSize: 12,
  },
});
