export type BillCategory =
  | "moradia"
  | "transporte"
  | "saude"
  | "educacao"
  | "alimentacao"
  | "lazer"
  | "servicos"
  | "outros";

export type BillRecurrence = "unica" | "mensal" | "anual" | "prazo";

export type BillStatus = "pendente" | "pago" | "vencido";

export type NotificationAdvance = 0 | 1 | 3 | 7;

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO date string YYYY-MM-DD
  category: BillCategory;
  recurrence: BillRecurrence;
  isPaid: boolean;
  paidAt?: string; // ISO date string
  notificationEnabled: boolean;
  notificationAdvanceDays: NotificationAdvance;
  notificationId?: string; // expo notification identifier
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // For recurring bills, track which month/year this instance belongs to
  monthKey: string; // "YYYY-MM"
  // For recurring bills, link to the original bill template
  originalBillId?: string;
  // For installment bills ("prazo"), track total and current installment number
  installments?: number;
  installmentNumber?: number;
}

export interface MonthSummary {
  monthKey: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  billCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

export const CATEGORY_LABELS: Record<BillCategory, string> = {
  moradia: "Moradia",
  transporte: "Transporte",
  saude: "Saúde",
  educacao: "Educação",
  alimentacao: "Alimentação",
  lazer: "Lazer",
  servicos: "Serviços",
  outros: "Outros",
};

export const CATEGORY_ICONS: Record<BillCategory, string> = {
  moradia: "home",
  transporte: "directions-car",
  saude: "local-hospital",
  educacao: "school",
  alimentacao: "restaurant",
  lazer: "sports-esports",
  servicos: "build",
  outros: "more-horiz",
};

export const RECURRENCE_LABELS: Record<BillRecurrence, string> = {
  unica: "Única",
  mensal: "Mensal",
  anual: "Anual",
  prazo: "A Prazo",
};

export const NOTIFICATION_ADVANCE_LABELS: Record<NotificationAdvance, string> = {
  0: "No dia",
  1: "1 dia",
  3: "3 dias",
  7: "7 dias",
};
