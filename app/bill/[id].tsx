import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBills } from "@/lib/bills-context";
import { useColors } from "@/hooks/use-colors";
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  getDueDateLabel,
} from "@/lib/utils-bills";
import {
  CATEGORY_LABELS,
  RECURRENCE_LABELS,
  NOTIFICATION_ADVANCE_LABELS,
} from "@/lib/types";
import { cancelBillNotification } from "@/lib/notifications";
import * as Haptics from "expo-haptics";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function BillDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { bills, markPaid, markUnpaid, markPaidAllRecurring, markUnpaidAllRecurring, deleteBill } = useBills();

  const bill = bills.find((b) => b.id === id);

  if (!bill) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>Conta não encontrada</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Text style={[styles.backLink, { color: colors.primary }]}>Voltar</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = !bill.isPaid && bill.dueDate < today;
  const statusColor = bill.isPaid ? colors.success : isOverdue ? colors.error : colors.warning;
  const statusText = bill.isPaid ? "Pago" : isOverdue ? "Vencido" : "Pendente";

  const handleMarkPaid = async () => {
    haptic();
    if (bill.recurrence !== "unica") {
      Alert.alert(
        "Marcar como Pago",
        "Deseja marcar como pago apenas este mês ou este e todos os meses seguintes?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Só este mês",
            onPress: async () => {
              await markPaid(bill.id);
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
          {
            text: "Este e seguintes",
            onPress: async () => {
              await markPaidAllRecurring(bill);
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    } else {
      await markPaid(bill.id);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleMarkUnpaid = async () => {
    haptic();
    if (bill.recurrence !== "unica") {
      Alert.alert(
        "Desfazer Pagamento",
        "Deseja desfazer apenas neste mês ou neste e todos os meses seguintes?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Só este mês",
            onPress: async () => { await markUnpaid(bill.id); },
          },
          {
            text: "Este e seguintes",
            onPress: async () => { await markUnpaidAllRecurring(bill); },
          },
        ]
      );
    } else {
      await markUnpaid(bill.id);
    }
  };

  const handleEdit = () => {
    haptic();
    router.push(`/bill/edit/${bill.id}` as any);
  };

  const handleDelete = () => {
    haptic();
    Alert.alert("Excluir Conta", `Excluir "${bill.name}"? Esta ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await cancelBillNotification(bill.notificationId);
          await deleteBill(bill.id);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => { haptic(); router.back(); }}
        >
          <IconSymbol name="arrow.left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{bill.name}</Text>
        <Pressable
          style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleEdit}
        >
          <IconSymbol name="pencil" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
          <Text style={[styles.heroAmount, { color: colors.foreground }]}>{formatCurrency(bill.amount)}</Text>
          <Text style={[styles.heroName, { color: colors.muted }]}>{bill.name}</Text>
          {!bill.isPaid && (
            <Text style={[styles.heroDueLabel, { color: isOverdue ? colors.error : colors.warning }]}>
              {getDueDateLabel(bill.dueDate)}
            </Text>
          )}
          {bill.isPaid && bill.paidAt && (
            <Text style={[styles.heroDueLabel, { color: colors.success }]}>
              Pago em {formatDateLong(bill.paidAt.split("T")[0])}
            </Text>
          )}
        </View>

        {/* Details */}
        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DetailRow label="Vencimento" value={formatDateLong(bill.dueDate)} colors={colors} />
          <DetailRow label="Categoria" value={CATEGORY_LABELS[bill.category]} colors={colors} />
          <DetailRow label="Recorrência" value={RECURRENCE_LABELS[bill.recurrence]} colors={colors} />
          <DetailRow
            label="Notificação"
            value={bill.notificationEnabled ? NOTIFICATION_ADVANCE_LABELS[bill.notificationAdvanceDays] : "Desativada"}
            colors={colors}
            isLast
          />
        </View>

        {bill.notes && (
          <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.notesLabel, { color: colors.muted }]}>Observações</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{bill.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          {!bill.isPaid ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryAction,
                { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleMarkPaid}
            >
              <IconSymbol name="checkmark.circle.fill" size={22} color="#fff" />
              <Text style={styles.primaryActionText}>Marcar como Pago</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.primaryAction,
                { backgroundColor: colors.muted, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleMarkUnpaid}
            >
              <IconSymbol name="xmark.circle.fill" size={22} color="#fff" />
              <Text style={styles.primaryActionText}>Desfazer Pagamento</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.secondaryAction,
              { backgroundColor: colors.primary + "18", borderColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleEdit}
          >
            <IconSymbol name="pencil" size={20} color={colors.primary} />
            <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Editar Conta</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryAction,
              { backgroundColor: colors.error + "18", borderColor: colors.error, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleDelete}
          >
            <IconSymbol name="trash.fill" size={20} color={colors.error} />
            <Text style={[styles.secondaryActionText, { color: colors.error }]}>Excluir Conta</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function DetailRow({
  label,
  value,
  colors,
  isLast = false,
}: {
  label: string;
  value: string;
  colors: any;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
      <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  editBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  heroName: {
    fontSize: 16,
    fontWeight: "400",
  },
  heroDueLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  notesCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsSection: {
    gap: 10,
    marginTop: 4,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
  },
  backLink: {
    fontSize: 16,
    fontWeight: "600",
  },
});
