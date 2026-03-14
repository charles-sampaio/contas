import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBills } from "@/lib/bills-context";
import { useColors } from "@/hooks/use-colors";
import {
  formatMonthKey,
  navigateMonth,
  formatMonthShort,
  formatCurrency,
  formatDate,
  getDaysUntilDue,
} from "@/lib/utils-bills";
import { Bill, BillStatus } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style);
}

type FilterType = "todas" | "pendentes" | "pagas" | "vencidas";
type SortType = "vencimento" | "valor" | "nome";

function getBillStatusLocal(bill: Bill): BillStatus {
  if (bill.isPaid) return "pago";
  const today = new Date().toISOString().split("T")[0];
  if (bill.dueDate < today) return "vencido";
  return "pendente";
}

export default function BillsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { getBillsByMonth, markPaid, markUnpaid, markPaidAllRecurring, markUnpaidAllRecurring, deleteBill, deleteAllRecurring, bulkMarkPaid, bulkDelete } = useBills();
  const [currentMonth, setCurrentMonth] = useState(formatMonthKey());
  const [filter, setFilter] = useState<FilterType>("todas");
  const [sort, setSort] = useState<SortType>("vencimento");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const allBills = getBillsByMonth(currentMonth);

  const filteredBills = useMemo(() => {
    let bills = allBills;
    if (filter === "pendentes") bills = bills.filter((b) => getBillStatusLocal(b) === "pendente");
    else if (filter === "pagas") bills = bills.filter((b) => b.isPaid);
    else if (filter === "vencidas") bills = bills.filter((b) => getBillStatusLocal(b) === "vencido");

    return [...bills].sort((a, b) => {
      if (sort === "vencimento") return a.dueDate.localeCompare(b.dueDate);
      if (sort === "valor") return b.amount - a.amount;
      if (sort === "nome") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [allBills, filter, sort]);

  const handlePrevMonth = () => {
    haptic();
    setCurrentMonth((m) => navigateMonth(m, -1));
    setSelectedIds(new Set());
    setIsSelecting(false);
  };
  const handleNextMonth = () => {
    haptic();
    setCurrentMonth((m) => navigateMonth(m, 1));
    setSelectedIds(new Set());
    setIsSelecting(false);
  };

  const handleBillPress = (bill: Bill) => {
    if (isSelecting) {
      haptic();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(bill.id)) next.delete(bill.id);
        else next.add(bill.id);
        return next;
      });
      return;
    }
    haptic();
    router.push(`/bill/${bill.id}` as any);
  };

  const handleBillLongPress = (bill: Bill) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setIsSelecting(true);
    setSelectedIds(new Set([bill.id]));
  };

  const handleMarkPaid = async (item: Bill) => {
    haptic();
    if (item.recurrence !== "unica") {
      Alert.alert(
        "Marcar como Pago",
        "Deseja marcar como pago apenas este mês ou este e todos os meses seguintes?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Só este mês",
            onPress: async () => {
              await markPaid(item.id);
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
          {
            text: "Este e seguintes",
            onPress: async () => {
              await markPaidAllRecurring(item);
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    } else {
      await markPaid(item.id);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleMarkUnpaid = async (item: Bill) => {
    haptic();
    if (item.recurrence !== "unica") {
      Alert.alert(
        "Desfazer Pagamento",
        "Deseja desfazer apenas neste mês ou neste e todos os meses seguintes?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Só este mês",
            onPress: async () => { await markUnpaid(item.id); },
          },
          {
            text: "Este e seguintes",
            onPress: async () => { await markUnpaidAllRecurring(item); },
          },
        ]
      );
    } else {
      await markUnpaid(item.id);
    }
  };

  const handleDelete = (item: Bill) => {
    haptic();
    if (item.recurrence !== "unica") {
      Alert.alert(
        "Excluir Conta",
        `Excluir "${item.name}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Só este mês",
            style: "destructive",
            onPress: async () => {
              await deleteBill(item.id);
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
          {
            text: "Este e seguintes",
            style: "destructive",
            onPress: async () => {
              await deleteAllRecurring(item);
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    } else {
      Alert.alert("Excluir Conta", "Tem certeza que deseja excluir esta conta?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteBill(item.id);
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]);
    }
  };

  const handleBulkMarkPaid = async () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    await bulkMarkPaid(Array.from(selectedIds));
    setIsSelecting(false);
    setSelectedIds(new Set());
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleBulkDelete = () => {
    haptic();
    Alert.alert(
      "Excluir Contas",
      `Excluir ${selectedIds.size} conta${selectedIds.size !== 1 ? "s" : ""}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await bulkDelete(Array.from(selectedIds));
            setIsSelecting(false);
            setSelectedIds(new Set());
          },
        },
      ]
    );
  };

  const handleSelectAll = () => {
    haptic();
    if (selectedIds.size === filteredBills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBills.map((b) => b.id)));
    }
  };

  const handleCancelSelect = () => {
    haptic();
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  const renderBill = ({ item }: { item: Bill }) => {
    const status = getBillStatusLocal(item);
    const days = getDaysUntilDue(item.dueDate);
    const isSelected = selectedIds.has(item.id);

    let statusColor = colors.warning;
    let statusBg = colors.warning + "22";
    let statusText = "Pendente";
    if (status === "pago") { statusColor = colors.success; statusBg = colors.success + "22"; statusText = "Pago"; }
    else if (status === "vencido") { statusColor = colors.error; statusBg = colors.error + "22"; statusText = "Vencido"; }
    else if (days <= 3) { statusColor = colors.error; statusBg = colors.error + "22"; }

    return (
      <Pressable
        style={({ pressed }) => [
          styles.billCard,
          {
            backgroundColor: isSelected ? colors.primary + "18" : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => handleBillPress(item)}
        onLongPress={() => handleBillLongPress(item)}
      >
        <View style={styles.billCardContent}>
          {isSelecting && (
            <View style={[styles.checkbox, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : "transparent" }]}>
              {isSelected && <IconSymbol name="checkmark" size={12} color="#fff" />}
            </View>
          )}
          <View style={styles.billInfo}>
            <View style={styles.billNameRow}>
              <Text style={[styles.billName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              {item.recurrence !== "unica" && (
                <IconSymbol name="repeat" size={14} color={colors.muted} />
              )}
            </View>
            <View style={styles.billMeta}>
              <Text style={[styles.billDate, { color: colors.muted }]}>
                Vence: {formatDate(item.dueDate)}
              </Text>
              {!item.isPaid && days <= 7 && days >= 0 && (
                <Text style={[styles.billDaysLeft, { color: days <= 3 ? colors.error : colors.warning }]}>
                  {days === 0 ? "Hoje!" : `${days}d`}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.billRight}>
            <Text style={[styles.billAmount, { color: colors.foreground }]}>{formatCurrency(item.amount)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
        </View>

        {/* Actions row */}
        {!isSelecting && (
          <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
            {!item.isPaid ? (
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => handleMarkPaid(item)}
              >
                <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Marcar Pago</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => handleMarkUnpaid(item)}
              >
                <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
                <Text style={[styles.actionText, { color: colors.muted }]}>Desfazer</Text>
              </Pressable>
            )}
            <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.push(`/bill/edit/${item.id}` as any)}
            >
              <IconSymbol name="pencil" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Editar</Text>
            </Pressable>
            <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => handleDelete(item)}
            >
              <IconSymbol name="trash.fill" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Excluir</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  const filterCounts = {
    todas: allBills.length,
    pendentes: allBills.filter((b) => getBillStatusLocal(b) === "pendente").length,
    pagas: allBills.filter((b) => b.isPaid).length,
    vencidas: allBills.filter((b) => getBillStatusLocal(b) === "vencido").length,
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        {isSelecting ? (
          <View style={styles.selectHeader}>
            <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} onPress={handleCancelSelect}>
              <Text style={styles.cancelSelectText}>Cancelar</Text>
            </Pressable>
            <Text style={styles.selectCount}>{selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}</Text>
            <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} onPress={handleSelectAll}>
              <Text style={styles.selectAllText}>{selectedIds.size === filteredBills.length ? "Desmarcar" : "Todas"}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.headerTitle}>Contas</Text>
            <View style={styles.monthNav}>
              <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} onPress={handlePrevMonth}>
                <IconSymbol name="chevron.left" size={22} color="#fff" />
              </Pressable>
              <Text style={styles.monthLabel}>{formatMonthShort(currentMonth)}</Text>
              <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} onPress={handleNextMonth}>
                <IconSymbol name="chevron.right" size={22} color="#fff" />
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Bulk actions bar */}
      {isSelecting && selectedIds.size > 0 && (
        <View style={[styles.bulkBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [styles.bulkBtn, { backgroundColor: colors.success + "22", opacity: pressed ? 0.7 : 1 }]}
            onPress={handleBulkMarkPaid}
          >
            <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
            <Text style={[styles.bulkBtnText, { color: colors.success }]}>Marcar Pagas</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.bulkBtn, { backgroundColor: colors.error + "22", opacity: pressed ? 0.7 : 1 }]}
            onPress={handleBulkDelete}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.error} />
            <Text style={[styles.bulkBtnText, { color: colors.error }]}>Excluir</Text>
          </Pressable>
        </View>
      )}

      {/* Filters */}
      <View style={[styles.filtersRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["todas", "pendentes", "pagas", "vencidas"] as FilterType[]).map((f) => (
          <Pressable
            key={f}
            style={({ pressed }) => [
              styles.filterBtn,
              filter === f && { backgroundColor: colors.primary },
              { opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => { haptic(); setFilter(f); }}
          >
            <Text style={[styles.filterText, filter === f ? { color: "#fff" } : { color: colors.muted }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {filterCounts[f] > 0 ? ` (${filterCounts[f]})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sort */}
      <View style={[styles.sortRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.sortLabel, { color: colors.muted }]}>Ordenar:</Text>
        {(["vencimento", "valor", "nome"] as SortType[]).map((s) => (
          <Pressable
            key={s}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            onPress={() => { haptic(); setSort(s); }}
          >
            <Text style={[styles.sortBtn, sort === s ? { color: colors.primary, fontWeight: "700" } : { color: colors.muted }]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item.id}
        renderItem={renderBill}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="list.bullet" size={56} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma conta encontrada</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {filter === "todas" ? "Adicione contas pelo botão + na tela inicial" : `Nenhuma conta ${filter} neste mês`}
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    minWidth: 160,
    textAlign: "center",
  },
  selectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelSelectText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  selectCount: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  selectAllText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  bulkBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bulkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bulkBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  filterText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  sortLabel: {
    fontSize: 12,
  },
  sortBtn: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  billCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  billCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  billInfo: {
    flex: 1,
  },
  billNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  billName: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  billMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  billDate: {
    fontSize: 12,
  },
  billDaysLeft: {
    fontSize: 11,
    fontWeight: "600",
  },
  billRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionDivider: {
    width: 0.5,
    marginVertical: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
