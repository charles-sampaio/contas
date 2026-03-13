import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBills } from "@/lib/bills-context";
import { useColors } from "@/hooks/use-colors";
import {
  formatMonthKey,
  formatCurrency,
  parseCurrencyInput,
  formatCurrencyInput,
  generateRecurringBill,
  navigateMonth,
} from "@/lib/utils-bills";
import {
  Bill,
  BillCategory,
  BillRecurrence,
  NotificationAdvance,
  CATEGORY_LABELS,
  RECURRENCE_LABELS,
  NOTIFICATION_ADVANCE_LABELS,
} from "@/lib/types";
import { scheduleBillNotification, cancelBillNotification } from "@/lib/notifications";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

interface BillFormProps {
  mode: "add" | "edit";
}

const CATEGORIES: BillCategory[] = [
  "moradia", "transporte", "saude", "educacao", "alimentacao", "lazer", "servicos", "outros"
];
const RECURRENCES: BillRecurrence[] = ["unica", "mensal", "anual"];
const NOTIFICATION_ADVANCES: NotificationAdvance[] = [0, 1, 3, 7];

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateInput(value: string): string | null {
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;
  const d = parseInt(day), m = parseInt(month), y = parseInt(year);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${month}-${day}`;
}

export default function BillForm({ mode }: BillFormProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const colors = useColors();
  const { addBill, addRecurringBills, updateBill, bills, settings } = useBills();

  const existingBill = mode === "edit" && params.id
    ? bills.find((b) => b.id === params.id)
    : undefined;

  const today = new Date();
  const defaultDueDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const [name, setName] = useState(existingBill?.name ?? "");
  const [amountText, setAmountText] = useState(existingBill ? formatCurrencyInput(existingBill.amount) : "");
  const [dueDateText, setDueDateText] = useState(
    existingBill
      ? (() => {
          const [y, m, d] = existingBill.dueDate.split("-");
          return `${d}/${m}/${y}`;
        })()
      : defaultDueDate
  );
  const [category, setCategory] = useState<BillCategory>(existingBill?.category ?? "outros");
  const [recurrence, setRecurrence] = useState<BillRecurrence>(existingBill?.recurrence ?? "unica");
  const [notificationEnabled, setNotificationEnabled] = useState(
    existingBill?.notificationEnabled ?? settings.notificationsEnabled
  );
  const [notificationAdvance, setNotificationAdvance] = useState<NotificationAdvance>(
    existingBill?.notificationAdvanceDays ?? 1
  );
  const [isPaid, setIsPaid] = useState(existingBill?.isPaid ?? false);
  const [notes, setNotes] = useState(existingBill?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Nome é obrigatório";
    const amount = parseCurrencyInput(amountText);
    if (amount <= 0) newErrors.amount = "Valor deve ser maior que zero";
    const dueDate = parseDateInput(dueDateText);
    if (!dueDate) newErrors.dueDate = "Data inválida (use DD/MM/AAAA)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    if (digits === "") { setAmountText(""); return; }
    const num = parseInt(digits) / 100;
    setAmountText(formatCurrencyInput(num));
  };

  const handleSave = async () => {
    if (!validate()) {
      haptic();
      return;
    }
    setIsSaving(true);
    haptic();

    try {
      const amount = parseCurrencyInput(amountText);
      const dueDate = parseDateInput(dueDateText)!;
      const monthKey = dueDate.slice(0, 7);

      if (mode === "add") {
        const bill = await addBill({
          name: name.trim(),
          amount,
          dueDate,
          category,
          recurrence,
          isPaid,
          paidAt: isPaid ? new Date().toISOString() : undefined,
          notificationEnabled,
          notificationAdvanceDays: notificationAdvance,
          notes: notes.trim() || undefined,
          monthKey,
        });

        // Schedule notification
        if (notificationEnabled && !isPaid) {
          const notifId = await scheduleBillNotification(
            bill,
            notificationAdvance,
            settings.defaultNotificationHour,
            settings.defaultNotificationMinute
          );
          if (notifId) {
            await updateBill({ ...bill, notificationId: notifId });
          }
        }

        // Generate future instances for recurring bills
        if (recurrence !== "unica") {
          const monthsToGenerate = recurrence === "mensal" ? 11 : 1;
          const futureInstances: Bill[] = [];
          let currentMonthKey = monthKey;
          for (let i = 0; i < monthsToGenerate; i++) {
            currentMonthKey = navigateMonth(currentMonthKey, 1);
            futureInstances.push(generateRecurringBill(bill, currentMonthKey));
          }
          await addRecurringBills(futureInstances);
        }
      } else if (existingBill) {
        // Cancel old notification
        await cancelBillNotification(existingBill.notificationId);

        const updatedBill: Bill = {
          ...existingBill,
          name: name.trim(),
          amount,
          dueDate,
          category,
          recurrence,
          isPaid,
          paidAt: isPaid ? (existingBill.paidAt ?? new Date().toISOString()) : undefined,
          notificationEnabled,
          notificationAdvanceDays: notificationAdvance,
          notes: notes.trim() || undefined,
          monthKey,
          notificationId: undefined,
        };

        // Schedule new notification
        if (notificationEnabled && !isPaid) {
          const notifId = await scheduleBillNotification(
            updatedBill,
            notificationAdvance,
            settings.defaultNotificationHour,
            settings.defaultNotificationMinute
          );
          updatedBill.notificationId = notifId;
        }

        await updateBill(updatedBill);
      }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar a conta. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const title = mode === "add" ? "Nova Conta" : "Editar Conta";

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => { haptic(); router.back(); }}
          >
            <IconSymbol name="xmark" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { opacity: pressed || isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{isSaving ? "Salvando..." : "Salvar"}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Nome da Conta *</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surface, borderColor: errors.name ? colors.error : colors.border, color: colors.foreground },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Aluguel, Luz, Internet..."
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              maxLength={60}
            />
            {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
          </View>

          {/* Amount */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Valor (R$) *</Text>
            <View style={[styles.amountInput, { backgroundColor: colors.surface, borderColor: errors.amount ? colors.error : colors.border }]}>
              <Text style={[styles.currencyPrefix, { color: colors.muted }]}>R$</Text>
              <TextInput
                style={[styles.amountTextInput, { color: colors.foreground }]}
                value={amountText}
                onChangeText={handleAmountChange}
                placeholder="0,00"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
            {errors.amount && <Text style={[styles.errorText, { color: colors.error }]}>{errors.amount}</Text>}
          </View>

          {/* Due Date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Data de Vencimento *</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surface, borderColor: errors.dueDate ? colors.error : colors.border, color: colors.foreground },
              ]}
              value={dueDateText}
              onChangeText={(t) => setDueDateText(formatDateInput(t))}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              returnKeyType="next"
              maxLength={10}
            />
            {errors.dueDate && <Text style={[styles.errorText, { color: colors.error }]}>{errors.dueDate}</Text>}
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Categoria</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: category === cat ? colors.primary : colors.surface,
                      borderColor: category === cat ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => { haptic(); setCategory(cat); }}
                >
                  <Text style={[styles.chipText, { color: category === cat ? "#fff" : colors.foreground }]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recurrence */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Recorrência</Text>
            <View style={styles.segmentRow}>
              {RECURRENCES.map((rec) => (
                <Pressable
                  key={rec}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor: recurrence === rec ? colors.primary : colors.surface,
                      borderColor: recurrence === rec ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => { haptic(); setRecurrence(rec); }}
                >
                  <Text style={[styles.segmentText, { color: recurrence === rec ? "#fff" : colors.foreground }]}>
                    {RECURRENCE_LABELS[rec]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notification */}
          <View style={[styles.fieldGroup, styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchInfo}>
              <IconSymbol name="bell.fill" size={18} color={notificationEnabled ? colors.primary : colors.muted} />
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>Notificação de Vencimento</Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={(v) => { haptic(); setNotificationEnabled(v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {notificationEnabled && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Avisar com antecedência</Text>
              <View style={styles.segmentRow}>
                {NOTIFICATION_ADVANCES.map((adv) => (
                  <Pressable
                    key={adv}
                    style={({ pressed }) => [
                      styles.segment,
                      {
                        backgroundColor: notificationAdvance === adv ? colors.primary : colors.surface,
                        borderColor: notificationAdvance === adv ? colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => { haptic(); setNotificationAdvance(adv); }}
                  >
                    <Text style={[styles.segmentText, { color: notificationAdvance === adv ? "#fff" : colors.foreground }]}>
                      {NOTIFICATION_ADVANCE_LABELS[adv]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Mark as paid */}
          <View style={[styles.fieldGroup, styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchInfo}>
              <IconSymbol name="checkmark.circle.fill" size={18} color={isPaid ? colors.success : colors.muted} />
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>Conta já paga</Text>
            </View>
            <Switch
              value={isPaid}
              onValueChange={(v) => { haptic(); setIsPaid(v); }}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor="#fff"
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Observações (opcional)</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.notesInput,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Anotações sobre esta conta..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  saveBtn: {
    width: 70,
    alignItems: "flex-end",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    gap: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 70,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "500",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  switchInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
});
