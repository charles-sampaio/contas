import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SectionList,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBills } from "@/lib/bills-context";
import { useColors } from "@/hooks/use-colors";
import {
  formatMonthKey,
  formatMonthShort,
  formatCurrency,
  formatDate,
} from "@/lib/utils-bills";
import { Bill } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

interface MonthSection {
  title: string;
  monthKey: string;
  totalPaid: number;
  totalAmount: number;
  paidCount: number;
  totalCount: number;
  data: Bill[];
  isExpanded: boolean;
}

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { bills, getMonthKeys } = useBills();
  const currentMonth = formatMonthKey();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const monthKeys = getMonthKeys();

  const sections: MonthSection[] = useMemo(() => {
    return monthKeys.map((monthKey) => {
      const monthBills = bills.filter((b) => b.monthKey === monthKey);
      const paidBills = monthBills.filter((b) => b.isPaid);
      const totalPaid = paidBills.reduce((sum, b) => sum + b.amount, 0);
      const totalAmount = monthBills.reduce((sum, b) => sum + b.amount, 0);
      const isExpanded = expandedMonths.has(monthKey);

      return {
        title: formatMonthShort(monthKey),
        monthKey,
        totalPaid,
        totalAmount,
        paidCount: paidBills.length,
        totalCount: monthBills.length,
        data: isExpanded ? monthBills.sort((a, b) => a.dueDate.localeCompare(b.dueDate)) : [],
        isExpanded,
      };
    });
  }, [bills, monthKeys, expandedMonths]);

  const toggleMonth = (monthKey: string) => {
    haptic();
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  const renderMonthHeader = (section: MonthSection) => {
    const isCurrentMonth = section.monthKey === currentMonth;
    const progressPercent = section.totalAmount > 0 ? (section.totalPaid / section.totalAmount) * 100 : 0;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.monthHeader,
          {
            backgroundColor: colors.surface,
            borderColor: isCurrentMonth ? colors.primary : colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => toggleMonth(section.monthKey)}
      >
        <View style={styles.monthHeaderTop}>
          <View style={styles.monthTitleRow}>
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>{section.title}</Text>
            {isCurrentMonth && (
              <View style={[styles.currentBadge, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.currentBadgeText, { color: colors.primary }]}>Atual</Text>
              </View>
            )}
          </View>
          <IconSymbol
            name={section.isExpanded ? "chevron.left" : "chevron.right"}
            size={16}
            color={colors.muted}
            style={{ transform: [{ rotate: section.isExpanded ? "90deg" : "0deg" }] }}
          />
        </View>

        <View style={styles.monthStats}>
          <View style={styles.monthStat}>
            <Text style={[styles.monthStatValue, { color: colors.success }]}>{formatCurrency(section.totalPaid)}</Text>
            <Text style={[styles.monthStatLabel, { color: colors.muted }]}>Pago</Text>
          </View>
          <View style={[styles.monthStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.monthStat}>
            <Text style={[styles.monthStatValue, { color: colors.foreground }]}>{formatCurrency(section.totalAmount)}</Text>
            <Text style={[styles.monthStatLabel, { color: colors.muted }]}>Total</Text>
          </View>
          <View style={[styles.monthStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.monthStat}>
            <Text style={[styles.monthStatValue, { color: colors.primary }]}>{section.paidCount}/{section.totalCount}</Text>
            <Text style={[styles.monthStatLabel, { color: colors.muted }]}>Contas</Text>
          </View>
        </View>

        {section.totalCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: progressPercent === 100 ? colors.success : colors.primary,
                    width: `${progressPercent}%` as any,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.muted }]}>{Math.round(progressPercent)}%</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderBillItem = (bill: Bill) => {
    const isPaid = bill.isPaid;
    const today = new Date().toISOString().split("T")[0];
    const isOverdue = !isPaid && bill.dueDate < today;

    let statusColor = colors.warning;
    let statusText = "Pendente";
    if (isPaid) { statusColor = colors.success; statusText = "Pago"; }
    else if (isOverdue) { statusColor = colors.error; statusText = "Vencido"; }

    return (
      <Pressable
        key={bill.id}
        style={({ pressed }) => [
          styles.billItem,
          { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={() => { haptic(); router.push(`/bill/${bill.id}` as any); }}
      >
        <View style={[styles.billStatusDot, { backgroundColor: statusColor }]} />
        <View style={styles.billItemInfo}>
          <Text style={[styles.billItemName, { color: colors.foreground }]} numberOfLines={1}>{bill.name}</Text>
          <Text style={[styles.billItemDate, { color: colors.muted }]}>{formatDate(bill.dueDate)}</Text>
        </View>
        <View style={styles.billItemRight}>
          <Text style={[styles.billItemAmount, { color: colors.foreground }]}>{formatCurrency(bill.amount)}</Text>
          <Text style={[styles.billItemStatus, { color: statusColor }]}>{statusText}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Histórico</Text>
        <Text style={styles.headerSubtitle}>{monthKeys.length} mês{monthKeys.length !== 1 ? "es" : ""} registrado{monthKeys.length !== 1 ? "s" : ""}</Text>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="clock.fill" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum histórico ainda</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Adicione contas para ver o histórico mensal aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.monthKey}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: section }) => (
            <View style={styles.sectionContainer}>
              {renderMonthHeader(section)}
              {section.isExpanded && (
                <View style={[styles.billsList, { borderColor: colors.border }]}>
                  {section.data.map(renderBillItem)}
                </View>
              )}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
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
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionContainer: {
    gap: 0,
  },
  monthHeader: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  monthHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  monthStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  monthStatValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  monthStatLabel: {
    fontSize: 11,
  },
  monthStatDivider: {
    width: 1,
    height: 32,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "right",
  },
  billsList: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
    marginTop: -8,
  },
  billItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  billStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  billItemInfo: {
    flex: 1,
  },
  billItemName: {
    fontSize: 14,
    fontWeight: "500",
  },
  billItemDate: {
    fontSize: 12,
    marginTop: 2,
  },
  billItemRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  billItemAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  billItemStatus: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
