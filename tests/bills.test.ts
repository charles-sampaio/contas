import { describe, it, expect } from "vitest";
import {
  formatMonthKey,
  parseMonthKey,
  formatMonthLabel,
  formatMonthShort,
  navigateMonth,
  formatCurrency,
  formatDate,
  getDaysUntilDue,
  parseCurrencyInput,
  formatCurrencyInput,
  generateRecurringBill,
  generateId,
} from "../lib/utils-bills";
import { Bill } from "../lib/types";

describe("formatMonthKey", () => {
  it("returns YYYY-MM format for given date", () => {
    const date = new Date(2026, 2, 13); // March 2026
    expect(formatMonthKey(date)).toBe("2026-03");
  });

  it("pads month with zero", () => {
    const date = new Date(2026, 0, 1); // January 2026
    expect(formatMonthKey(date)).toBe("2026-01");
  });
});

describe("parseMonthKey", () => {
  it("parses YYYY-MM correctly", () => {
    expect(parseMonthKey("2026-03")).toEqual({ year: 2026, month: 3 });
    expect(parseMonthKey("2025-12")).toEqual({ year: 2025, month: 12 });
  });
});

describe("navigateMonth", () => {
  it("navigates forward one month", () => {
    expect(navigateMonth("2026-01", 1)).toBe("2026-02");
    expect(navigateMonth("2026-12", 1)).toBe("2027-01");
  });

  it("navigates backward one month", () => {
    expect(navigateMonth("2026-03", -1)).toBe("2026-02");
    expect(navigateMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("formatCurrency", () => {
  it("formats BRL currency", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1.234,56");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0,00");
  });
});

describe("formatDate", () => {
  it("formats ISO date to DD/MM/YYYY", () => {
    expect(formatDate("2026-03-13")).toBe("13/03/2026");
    expect(formatDate("2025-12-01")).toBe("01/12/2025");
  });
});

describe("parseCurrencyInput", () => {
  it("parses Brazilian currency format", () => {
    expect(parseCurrencyInput("1.234,56")).toBeCloseTo(1234.56);
    expect(parseCurrencyInput("100,00")).toBeCloseTo(100);
    expect(parseCurrencyInput("R$ 50,00")).toBeCloseTo(50);
  });

  it("returns 0 for invalid input", () => {
    expect(parseCurrencyInput("")).toBe(0);
    expect(parseCurrencyInput("abc")).toBe(0);
  });
});

describe("formatCurrencyInput", () => {
  it("formats number for currency input", () => {
    expect(formatCurrencyInput(1234.56)).toBe("1.234,56");
    expect(formatCurrencyInput(100)).toBe("100,00");
  });

  it("returns empty string for zero", () => {
    expect(formatCurrencyInput(0)).toBe("");
  });
});

describe("generateId", () => {
  it("generates unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe("string");
    expect(id1.length).toBeGreaterThan(0);
  });
});

describe("generateRecurringBill", () => {
  const baseBill: Bill = {
    id: "test-1",
    name: "Aluguel",
    amount: 1500,
    dueDate: "2026-03-10",
    category: "moradia",
    recurrence: "mensal",
    isPaid: true,
    paidAt: "2026-03-10T10:00:00.000Z",
    notificationEnabled: true,
    notificationAdvanceDays: 3,
    monthKey: "2026-03",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };

  it("generates a new bill for the next month", () => {
    const nextBill = generateRecurringBill(baseBill, "2026-04");
    expect(nextBill.monthKey).toBe("2026-04");
    expect(nextBill.dueDate).toBe("2026-04-10");
    expect(nextBill.isPaid).toBe(false);
    expect(nextBill.paidAt).toBeUndefined();
    expect(nextBill.id).not.toBe(baseBill.id);
    expect(nextBill.originalBillId).toBe(baseBill.id);
  });

  it("preserves bill properties", () => {
    const nextBill = generateRecurringBill(baseBill, "2026-04");
    expect(nextBill.name).toBe(baseBill.name);
    expect(nextBill.amount).toBe(baseBill.amount);
    expect(nextBill.category).toBe(baseBill.category);
    expect(nextBill.recurrence).toBe(baseBill.recurrence);
  });

  it("handles months with fewer days", () => {
    const billOn31st = { ...baseBill, dueDate: "2026-01-31", monthKey: "2026-01" };
    const nextBill = generateRecurringBill(billOn31st, "2026-02");
    // February 2026 has 28 days
    expect(nextBill.dueDate).toBe("2026-02-28");
  });
});
