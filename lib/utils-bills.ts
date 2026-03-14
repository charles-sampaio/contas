import { Bill, BillStatus, MonthSummary } from "./types";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

export function formatMonthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function formatMonthShort(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleDateString("pt-BR", { month: "short" });
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1).replace(".", "")} ${year}`;
}

export function navigateMonth(monthKey: string, direction: 1 | -1): string {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(year, month - 1 + direction, 1);
  return formatMonthKey(date);
}

export function getBillStatus(bill: Bill): BillStatus {
  if (bill.isPaid) return "pago";
  const today = new Date().toISOString().split("T")[0];
  if (bill.dueDate < today) return "vencido";
  return "pendente";
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function getDaysUntilDue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getDueDateLabel(dueDate: string): string {
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return `Venceu há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""}`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  if (days <= 7) return `Vence em ${days} dias`;
  return `Vence em ${formatDate(dueDate)}`;
}

export function parseCurrencyInput(value: string): number {
  // Remove currency symbols and parse
  const cleaned = value.replace(/[R$\s.]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatCurrencyInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getNextMonthKey(monthKey: string): string {
  return navigateMonth(monthKey, 1);
}

export function generateRecurringBill(bill: Bill, targetMonthKey: string, installmentNumber?: number): Bill {
  const { year, month } = parseMonthKey(targetMonthKey);
  // Keep same day of month
  const originalDay = parseInt(bill.dueDate.split("-")[2]);
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(originalDay, lastDay);
  const newDueDate = `${targetMonthKey}-${String(day).padStart(2, "0")}`;

  return {
    ...bill,
    id: generateId(),
    dueDate: newDueDate,
    monthKey: targetMonthKey,
    isPaid: false,
    paidAt: undefined,
    notificationId: undefined,
    originalBillId: bill.originalBillId ?? bill.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(installmentNumber !== undefined ? { installmentNumber } : {}),
  };
}
