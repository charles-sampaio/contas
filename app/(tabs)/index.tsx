import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Bill } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getMonthSummary, getUpcomingBills, getBillsByMonth, markPaid } = useBills();
  const [currentMonth, setCurrentMonth] = useState(formatMonthKey());

  const summary = getMonthSummary(currentMonth);
  const upcomingBills = getUpcomingBills(7);

  const progressPercent =
    summary.billCount > 0 ? (summary.paidCount / summary.billCount) * 100 : 0;

  const handlePrevMonth = useCallback(() => {
    haptic();
    setCurrentMonth((m) => navigateMonth(m, -1));
  }, []);

  const handleNextMonth = useCallback(() => {
    haptic();
    setCurrentMonth((m) => navigateMonth(m, 1));
  }, []);

  const handleAddBill = useCallback(() => {
    haptic();
    router.push("/bill/add" as any);
  }, [router]);

  const handleBillPress = useCallback(
    (bill: Bill) => {
      haptic();
      router.push(`/bill/${bill.id}` as any);
    },
    [router]
  );

  const isCurrentMonth = currentMonth === formatMonthKey();

  const renderUpcomingBill = ({ item }: { item: Bill }) => {
    const days = getDaysUntilDue(item.dueDate);
    const isToday = days === 0;
    const isTomorrow = days === 1;
    const isOverdue = days < 0;

    let badgeColor = colors.warning;
    let badgeText = `${days}d`;
    if (isToday) { badgeColor = colors.error; badgeText = "Hoje"; }
    else if (isTomorrow) { badgeColor = colors.warning; badgeText = "Amanhã"; }
    else if (isOverdue) { badgeColor = colors.error; badgeText = `${Math.abs(days)}d atrás`; }

    return (
      <Pressable
        style={({ pressed }) => [styles.upcomingCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
        onPress={() => handleBillPress(item)}
      >
        <View style={styles.upcomingCardContent}>
          <View style={[styles.upcomingBadge, { backgroundColor: badgeColor + "22" }]}>
            <Text style={[styles.upcomingBadgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
          <View style={styles.upcomingInfo}>
            <Text style={[styles.upcomingName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.upcomingDate, { color: colors.muted }]}>{formatDate(item.dueDate)}</Text>
          </View>
          <Text style={[styles.upcomingAmount, { color: colors.foreground }]}>{formatCurrency(item.amount)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Contas & Boletos</Text>
          <View style={styles.monthNav}>
            <Pressable
              style={({ pressed }) => [styles.monthNavBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handlePrevMonth}
            >
              <IconSymbol name="chevron.left" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.monthLabel}>{formatMonthShort(currentMonth)}</Text>
            <Pressable
              style={({ pressed }) => [styles.monthNavBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleNextMonth}
            >
              <IconSymbol name="chevron.right" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total Mês</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatCurrency(summary.totalAmount)}</Text>
            <Text style={[styles.summaryCount, { color: colors.muted }]}>{summary.billCount} conta{summary.billCount !== 1 ? "s" : ""}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Pago</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(summary.paidAmount)}</Text>
            <Text style={[styles.summaryCount, { color: colors.muted }]}>{summary.paidCount} pago{summary.paidCount !== 1 ? "s" : ""}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{summary.overdueAmount > 0 ? "Vencido" : "A Pagar"}</Text>
            <Text style={[styles.summaryValue, { color: summary.overdueAmount > 0 ? colors.error : colors.warning }]}>
              {formatCurrency(summary.overdueAmount > 0 ? summary.overdueAmount : summary.pendingAmount)}
            </Text>
            <Text style={[styles.summaryCount, { color: colors.muted }]}>
              {summary.overdueAmount > 0 ? `${summary.overdueCount} vencido${summary.overdueCount !== 1 ? "s" : ""}` : `${summary.pendingCount} pendente${summary.pendingCount !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        {summary.billCount > 0 && (
          <View style={[styles.progressSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>Progresso do Mês</Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: progressPercent === 100 ? colors.success : colors.primary, width: `${progressPercent}%` as any },
                ]}
              />
            </View>
            <Text style={[styles.progressSubtitle, { color: colors.muted }]}>
              {summary.paidCount} de {summary.billCount} contas pagas
            </Text>
          </View>
        )}

        {/* Upcoming Bills */}
        {isCurrentMonth && upcomingBills.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Próximos Vencimentos</Text>
              <Pressable
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                onPress={() => router.push("/(tabs)/bills" as any)}
              >
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
              </Pressable>
            </View>
            <FlatList
              data={upcomingBills}
              keyExtractor={(item) => item.id}
              renderItem={renderUpcomingBill}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </View>
        )}

        {/* Empty State */}
        {summary.billCount === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="dollarsign.circle.fill" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma conta em {formatMonthShort(currentMonth)}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Toque no botão + para adicionar uma conta</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            transform: [{ scale: pressed ? 0.95 : 1 }],
            bottom: Math.max(insets.bottom, 8) + 56 + 12,
          },
        ]}
        onPress={handleAddBill}
      >
        <IconSymbol name="plus" size={28} color="#fff" />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "500",
    color: "#fff",
    minWidth: 160,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  summaryCount: {
    fontSize: 11,
  },
  progressSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressSubtitle: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  upcomingSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "500",
  },
  upcomingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  upcomingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  upcomingBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 52,
    alignItems: "center",
  },
  upcomingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: "500",
  },
  upcomingDate: {
    fontSize: 12,
    marginTop: 2,
  },
  upcomingAmount: {
    fontSize: 14,
    fontWeight: "600",
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
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
