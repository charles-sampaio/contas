import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Bill, BillCategory, BillRecurrence, MonthSummary } from "./types";
import { formatMonthKey, getBillStatus, generateId, generateRecurringBill, navigateMonth } from "./utils-bills";

const STORAGE_KEY = "@contas_boletos_bills";
const SETTINGS_KEY = "@contas_boletos_settings";

export interface AppSettings {
  notificationsEnabled: boolean;
  defaultNotificationHour: number;
  defaultNotificationMinute: number;
  theme: "light" | "dark" | "system";
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  defaultNotificationHour: 9,
  defaultNotificationMinute: 0,
  theme: "system",
};

interface BillsState {
  bills: Bill[];
  settings: AppSettings;
  isLoaded: boolean;
}

type BillsAction =
  | { type: "LOAD"; bills: Bill[]; settings: AppSettings }
  | { type: "ADD"; bill: Bill }
  | { type: "UPDATE"; bill: Bill }
  | { type: "DELETE"; id: string }
  | { type: "MARK_PAID"; id: string; paidAt: string }
  | { type: "MARK_UNPAID"; id: string }
  | { type: "MARK_PAID_ALL_RECURRING"; originalBillId: string; fromMonthKey: string; paidAt: string }
  | { type: "MARK_UNPAID_ALL_RECURRING"; originalBillId: string; fromMonthKey: string }
  | { type: "UPDATE_SETTINGS"; settings: Partial<AppSettings> }
  | { type: "BULK_DELETE"; ids: string[] }
  | { type: "BULK_MARK_PAID"; ids: string[]; paidAt: string }
  | { type: "BULK_ADD"; bills: Bill[] }
  | { type: "DELETE_ALL_RECURRING"; originalBillId: string; fromMonthKey: string }
  | { type: "UPDATE_ALL_RECURRING"; originalBillId: string; fromMonthKey: string; patch: Partial<Bill> };

function billsReducer(state: BillsState, action: BillsAction): BillsState {
  switch (action.type) {
    case "LOAD":
      return { ...state, bills: action.bills, settings: action.settings, isLoaded: true };
    case "ADD":
      return { ...state, bills: [...state.bills, action.bill] };
    case "UPDATE":
      return {
        ...state,
        bills: state.bills.map((b) => (b.id === action.bill.id ? action.bill : b)),
      };
    case "DELETE":
      return { ...state, bills: state.bills.filter((b) => b.id !== action.id) };
    case "MARK_PAID":
      return {
        ...state,
        bills: state.bills.map((b) =>
          b.id === action.id ? { ...b, isPaid: true, paidAt: action.paidAt, updatedAt: new Date().toISOString() } : b
        ),
      };
    case "MARK_UNPAID":
      return {
        ...state,
        bills: state.bills.map((b) =>
          b.id === action.id ? { ...b, isPaid: false, paidAt: undefined, updatedAt: new Date().toISOString() } : b
        ),
      };
    case "MARK_PAID_ALL_RECURRING":
      return {
        ...state,
        bills: state.bills.map((b) => {
          const billOriginalId = b.originalBillId ?? b.id;
          if (billOriginalId !== action.originalBillId) return b;
          if (b.monthKey < action.fromMonthKey) return b;
          return { ...b, isPaid: true, paidAt: action.paidAt, updatedAt: new Date().toISOString() };
        }),
      };
    case "MARK_UNPAID_ALL_RECURRING":
      return {
        ...state,
        bills: state.bills.map((b) => {
          const billOriginalId = b.originalBillId ?? b.id;
          if (billOriginalId !== action.originalBillId) return b;
          if (b.monthKey < action.fromMonthKey) return b;
          return { ...b, isPaid: false, paidAt: undefined, updatedAt: new Date().toISOString() };
        }),
      };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "BULK_DELETE":
      return { ...state, bills: state.bills.filter((b) => !action.ids.includes(b.id)) };
    case "BULK_MARK_PAID":
      return {
        ...state,
        bills: state.bills.map((b) =>
          action.ids.includes(b.id) ? { ...b, isPaid: true, paidAt: action.paidAt, updatedAt: new Date().toISOString() } : b
        ),
      };
    case "BULK_ADD":
      return { ...state, bills: [...state.bills, ...action.bills] };
    case "DELETE_ALL_RECURRING":
      return {
        ...state,
        bills: state.bills.filter((b) => {
          const billOriginalId = b.originalBillId ?? b.id;
          if (billOriginalId !== action.originalBillId) return true;
          if (b.monthKey < action.fromMonthKey) return true;
          return false;
        }),
      };
    case "UPDATE_ALL_RECURRING":
      return {
        ...state,
        bills: state.bills.map((b) => {
          const billOriginalId = b.originalBillId ?? b.id;
          if (billOriginalId !== action.originalBillId) return b;
          if (b.monthKey < action.fromMonthKey) return b;
          return { ...b, ...action.patch, updatedAt: new Date().toISOString() };
        }),
      };
    default:
      return state;
  }
}

interface BillsContextValue {
  bills: Bill[];
  settings: AppSettings;
  isLoaded: boolean;
  addBill: (data: Omit<Bill, "id" | "createdAt" | "updatedAt">) => Promise<Bill>;
  updateBill: (bill: Bill) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  markPaid: (id: string) => Promise<void>;
  markUnpaid: (id: string) => Promise<void>;
  markPaidAllRecurring: (bill: Bill) => Promise<void>;
  markUnpaidAllRecurring: (bill: Bill) => Promise<void>;
  addRecurringBills: (bills: Bill[]) => Promise<void>;
  deleteAllRecurring: (bill: Bill) => Promise<void>;
  updateAllRecurring: (bill: Bill, patch: Partial<Bill>) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkMarkPaid: (ids: string[]) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  getBillsByMonth: (monthKey: string) => Bill[];
  getMonthSummary: (monthKey: string) => MonthSummary;
  getUpcomingBills: (days?: number) => Bill[];
  getMonthKeys: () => string[];
}

const BillsContext = createContext<BillsContextValue | null>(null);

export function BillsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(billsReducer, {
    bills: [],
    settings: DEFAULT_SETTINGS,
    isLoaded: false,
  });

  // Load from storage on mount
  useEffect(() => {
    async function load() {
      try {
        const [billsJson, settingsJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        const bills: Bill[] = billsJson ? JSON.parse(billsJson) : [];
        const settings: AppSettings = settingsJson
          ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) }
          : DEFAULT_SETTINGS;
        dispatch({ type: "LOAD", bills, settings });
      } catch {
        dispatch({ type: "LOAD", bills: [], settings: DEFAULT_SETTINGS });
      }
    }
    load();
  }, []);

  // Persist bills whenever they change
  useEffect(() => {
    if (!state.isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.bills)).catch(() => {});
  }, [state.bills, state.isLoaded]);

  // Persist settings whenever they change
  useEffect(() => {
    if (!state.isLoaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)).catch(() => {});
  }, [state.settings, state.isLoaded]);

  const addBill = useCallback(
    async (data: Omit<Bill, "id" | "createdAt" | "updatedAt">): Promise<Bill> => {
      const now = new Date().toISOString();
      const bill: Bill = { ...data, id: generateId(), createdAt: now, updatedAt: now };
      dispatch({ type: "ADD", bill });
      return bill;
    },
    []
  );

  const updateBill = useCallback(async (bill: Bill) => {
    dispatch({ type: "UPDATE", bill: { ...bill, updatedAt: new Date().toISOString() } });
  }, []);

  const deleteBill = useCallback(async (id: string) => {
    dispatch({ type: "DELETE", id });
  }, []);

  const markPaid = useCallback(async (id: string) => {
    dispatch({ type: "MARK_PAID", id, paidAt: new Date().toISOString() });
  }, []);

  const markUnpaid = useCallback(async (id: string) => {
    dispatch({ type: "MARK_UNPAID", id });
  }, []);

  const markPaidAllRecurring = useCallback(async (bill: Bill) => {
    const originalId = bill.originalBillId ?? bill.id;
    dispatch({ type: "MARK_PAID_ALL_RECURRING", originalBillId: originalId, fromMonthKey: bill.monthKey, paidAt: new Date().toISOString() });
  }, []);

  const markUnpaidAllRecurring = useCallback(async (bill: Bill) => {
    const originalId = bill.originalBillId ?? bill.id;
    dispatch({ type: "MARK_UNPAID_ALL_RECURRING", originalBillId: originalId, fromMonthKey: bill.monthKey });
  }, []);

  const addRecurringBills = useCallback(async (bills: Bill[]) => {
    dispatch({ type: "BULK_ADD", bills });
  }, []);

  const deleteAllRecurring = useCallback(async (bill: Bill) => {
    const originalId = bill.originalBillId ?? bill.id;
    dispatch({ type: "DELETE_ALL_RECURRING", originalBillId: originalId, fromMonthKey: bill.monthKey });
  }, []);

  const updateAllRecurring = useCallback(async (bill: Bill, patch: Partial<Bill>) => {
    const originalId = bill.originalBillId ?? bill.id;
    dispatch({ type: "UPDATE_ALL_RECURRING", originalBillId: originalId, fromMonthKey: bill.monthKey, patch });
  }, []);

  const bulkDelete = useCallback(async (ids: string[]) => {
    dispatch({ type: "BULK_DELETE", ids });
  }, []);

  const bulkMarkPaid = useCallback(async (ids: string[]) => {
    dispatch({ type: "BULK_MARK_PAID", ids, paidAt: new Date().toISOString() });
  }, []);

  const updateSettings = useCallback(async (settings: Partial<AppSettings>) => {
    dispatch({ type: "UPDATE_SETTINGS", settings });
  }, []);

  const getBillsByMonth = useCallback(
    (monthKey: string): Bill[] => {
      return state.bills.filter((b) => b.monthKey === monthKey);
    },
    [state.bills]
  );

  const getMonthSummary = useCallback(
    (monthKey: string): MonthSummary => {
      const bills = state.bills.filter((b) => b.monthKey === monthKey);
      const today = new Date().toISOString().split("T")[0];
      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let overdueAmount = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;

      for (const bill of bills) {
        totalAmount += bill.amount;
        if (bill.isPaid) {
          paidAmount += bill.amount;
          paidCount++;
        } else if (bill.dueDate < today) {
          overdueAmount += bill.amount;
          overdueCount++;
        } else {
          pendingAmount += bill.amount;
          pendingCount++;
        }
      }

      return {
        monthKey,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        billCount: bills.length,
        paidCount,
        pendingCount,
        overdueCount,
      };
    },
    [state.bills]
  );

  const getUpcomingBills = useCallback(
    (days = 7): Bill[] => {
      const today = new Date();
      const future = new Date();
      future.setDate(future.getDate() + days);
      const todayStr = today.toISOString().split("T")[0];
      const futureStr = future.toISOString().split("T")[0];

      return state.bills
        .filter(
          (b) => !b.isPaid && b.dueDate >= todayStr && b.dueDate <= futureStr
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    },
    [state.bills]
  );

  const getMonthKeys = useCallback((): string[] => {
    const keys = new Set(state.bills.map((b) => b.monthKey));
    return Array.from(keys).sort().reverse();
  }, [state.bills]);

  const value = useMemo(
    () => ({
      bills: state.bills,
      settings: state.settings,
      isLoaded: state.isLoaded,
      addBill,
      updateBill,
      deleteBill,
      markPaid,
      markUnpaid,
      markPaidAllRecurring,
      markUnpaidAllRecurring,
      addRecurringBills,
      deleteAllRecurring,
      updateAllRecurring,
      bulkDelete,
      bulkMarkPaid,
      updateSettings,
      getBillsByMonth,
      getMonthSummary,
      getUpcomingBills,
      getMonthKeys,
    }),
    [
      state.bills,
      state.settings,
      state.isLoaded,
      addBill,
      updateBill,
      deleteBill,
      markPaid,
      markUnpaid,
      markPaidAllRecurring,
      markUnpaidAllRecurring,
      addRecurringBills,
      deleteAllRecurring,
      updateAllRecurring,
      bulkDelete,
      bulkMarkPaid,
      updateSettings,
      getBillsByMonth,
      getMonthSummary,
      getUpcomingBills,
      getMonthKeys,
    ]
  );

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

export function useBills() {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error("useBills must be used within BillsProvider");
  return ctx;
}
