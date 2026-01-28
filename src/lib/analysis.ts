import type { CollectionEntry } from "astro:content";

type Transaction = CollectionEntry<"transactions">["data"];

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface SourceBreakdown {
  source: string;
  amount: number;
  count: number;
}

export interface ExpenseBreakdown {
  recipient: string;
  amount: number;
  count: number;
}

export interface ContributorAnalysis {
  recurring: { amount: number; count: number; contributors: SourceBreakdown[] };
  oneTime: { amount: number; count: number; contributors: SourceBreakdown[] };
}

export interface SalaryAnalysis {
  recipient: string;
  totalPaid: number;
  monthlyAverage: number;
  paymentCount: number;
  firstPayment: string;
  lastPayment: string;
  description: string;
}

export interface RunwayProjection {
  currentBalance: number;
  averageMonthlyExpenses: number;
  averageMonthlyIncome: number;
  averageMonthlyNet: number;
  monthsOfRunway: number;
  requiredMonthlyContribution: number;
}

function getYearMonth(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isReversedOrReverse(tx: Transaction): boolean {
  return tx["Is Reverse"] === "true" || tx["Is Reversed"] === "true" || Boolean(tx["Reverse Transaction ID"]);
}

export function calculateMonthlyData(transactions: Transaction[]): MonthlyData[] {
  const monthlyMap = new Map<string, { income: number; expenses: number }>();

  for (const tx of transactions) {
    if (isReversedOrReverse(tx)) continue;

    const month = getYearMonth(tx["Effective Date & Time"]);
    const current = monthlyMap.get(month) ?? { income: 0, expenses: 0 };

    if (tx["Credit/Debit"] === "CREDIT") {
      current.income += tx["Amount Single Column"];
    } else {
      current.expenses += Math.abs(tx["Amount Single Column"]);
    }

    monthlyMap.set(month, current);
  }

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      income: Math.round(data.income * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
      net: Math.round((data.income - data.expenses) * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function analyzeIncomeSources(transactions: Transaction[]): SourceBreakdown[] {
  const sourceMap = new Map<string, { amount: number; count: number }>();

  for (const tx of transactions) {
    if (isReversedOrReverse(tx)) continue;
    if (tx["Credit/Debit"] !== "CREDIT") continue;

    const source = tx["Opposite Account Name"] || tx["Opposite Account Handle"] || "Unknown";
    const current = sourceMap.get(source) ?? { amount: 0, count: 0 };
    current.amount += tx["Amount Single Column"];
    current.count += 1;
    sourceMap.set(source, current);
  }

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function analyzeExpenses(transactions: Transaction[]): ExpenseBreakdown[] {
  const expenseMap = new Map<string, { amount: number; count: number }>();

  for (const tx of transactions) {
    if (isReversedOrReverse(tx)) continue;
    if (tx["Credit/Debit"] !== "DEBIT") continue;

    const recipient = tx["Opposite Account Name"] || tx["Opposite Account Handle"] || "Unknown";
    const current = expenseMap.get(recipient) ?? { amount: 0, count: 0 };
    current.amount += Math.abs(tx["Amount Single Column"]);
    current.count += 1;
    expenseMap.set(recipient, current);
  }

  return Array.from(expenseMap.entries())
    .map(([recipient, data]) => ({
      recipient,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function analyzeExpensesByCategory(transactions: Transaction[]): SourceBreakdown[] {
  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const tx of transactions) {
    if (isReversedOrReverse(tx)) continue;
    if (tx["Credit/Debit"] !== "DEBIT") continue;

    let category = (tx["Accounting Category Name"] ?? tx["Kind"]) || "Uncategorized";
    const description = tx["Description"].toLowerCase();

    // Paid Maintainers: consultants and core maintainer stipends
    if (category.startsWith("Consultants") || description.includes("core maintainer stipend")) {
      category = "Paid Maintainers";
    }
    // Community Incentives: awards, grants, and community support
    else if (
      category.startsWith("Grants") ||
      category.startsWith("Other, Support & Commu") ||
      description.includes("community award")
    ) {
      category = "Community Incentives";
    }
    // Miscellaneous: uncategorized expenses, donations, travel, contributions
    else if (
      category === "EXPENSE" ||
      category === "CONTRIBUTION" ||
      category.startsWith("Expenses - Donation") ||
      category.startsWith("Expenses - Travel") ||
      category.startsWith("Contributions - Hosted")
    ) {
      category = "Miscellaneous";
    }
    const current = categoryMap.get(category) ?? { amount: 0, count: 0 };
    current.amount += Math.abs(tx["Amount Single Column"]);
    current.count += 1;
    categoryMap.set(category, current);
  }

  return Array.from(categoryMap.entries())
    .map(([source, data]) => ({
      source,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function isRecurringContribution(tx: Transaction): boolean {
  const description = tx["Description"].toLowerCase();
  return description.includes("monthly contribution");
}

export function analyzeContributions(transactions: Transaction[]): ContributorAnalysis {
  const recurringMap = new Map<string, { amount: number; count: number }>();
  const oneTimeMap = new Map<string, { amount: number; count: number }>();

  for (const tx of transactions) {
    if (isReversedOrReverse(tx)) continue;
    if (tx["Credit/Debit"] !== "CREDIT") continue;
    if (tx["Kind"] !== "CONTRIBUTION") continue;

    const source = tx["Opposite Account Name"] || tx["Opposite Account Handle"] || "Unknown";
    const isRecurring = isRecurringContribution(tx);

    const targetMap = isRecurring ? recurringMap : oneTimeMap;
    const current = targetMap.get(source) ?? { amount: 0, count: 0 };
    current.amount += tx["Amount Single Column"];
    current.count += 1;
    targetMap.set(source, current);
  }

  const toBreakdown = (map: Map<string, { amount: number; count: number }>): SourceBreakdown[] =>
    Array.from(map.entries())
      .map(([source, data]) => ({
        source,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

  const recurringList = toBreakdown(recurringMap);
  const oneTimeList = toBreakdown(oneTimeMap);

  return {
    recurring: {
      amount: Math.round(recurringList.reduce((sum, c) => sum + c.amount, 0) * 100) / 100,
      count: recurringList.reduce((sum, c) => sum + c.count, 0),
      contributors: recurringList,
    },
    oneTime: {
      amount: Math.round(oneTimeList.reduce((sum, c) => sum + c.amount, 0) * 100) / 100,
      count: oneTimeList.reduce((sum, c) => sum + c.count, 0),
      contributors: oneTimeList,
    },
  };
}

export function analyzeMonthlyRecurringContributions(
  transactions: Transaction[]
): { month: string; recurring: number; oneTime: number }[] {
  const monthlyMap = new Map<string, { recurring: number; oneTime: number }>();

  for (const tx of transactions) {
    if (isReversedOrReverse(tx)) continue;
    if (tx["Credit/Debit"] !== "CREDIT") continue;
    if (tx["Kind"] !== "CONTRIBUTION") continue;

    const month = getYearMonth(tx["Effective Date & Time"]);
    const isRecurring = isRecurringContribution(tx);

    const current = monthlyMap.get(month) ?? { recurring: 0, oneTime: 0 };
    if (isRecurring) {
      current.recurring += tx["Amount Single Column"];
    } else {
      current.oneTime += tx["Amount Single Column"];
    }
    monthlyMap.set(month, current);
  }

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      recurring: Math.round(data.recurring * 100) / 100,
      oneTime: Math.round(data.oneTime * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function monthsBetween(earliest: string, latest: string): number {
  const [earliestYear, earliestMonth] = earliest.split("-").map(Number);
  const [latestYear, latestMonth] = latest.split("-").map(Number);
  return (latestYear - earliestYear) * 12 + (latestMonth - earliestMonth) + 1;
}

export function analyzeSalariedExpenses(transactions: Transaction[]): SalaryAnalysis[] {
  const salaryKeywords = ["stipend", "salary", "maintainer", "contractor", "developer"];
  const recipientMap = new Map<
    string,
    { total: number; paymentCount: number; earliestMonth: string; latestMonth: string; description: string }
  >();

  for (const tx of transactions) {
    if (isReversedOrReverse(tx)) continue;
    if (tx["Credit/Debit"] !== "DEBIT") continue;
    if (tx["Kind"] !== "EXPENSE") continue;

    const descLower = tx["Description"].toLowerCase();
    const categoryLower = (tx["Accounting Category Name"] || "").toLowerCase();
    const isSalaryLike =
      salaryKeywords.some((kw) => descLower.includes(kw)) ||
      categoryLower.includes("consultant") ||
      categoryLower.includes("maintenance");

    if (!isSalaryLike) continue;

    const recipient = tx["Opposite Account Name"] || tx["Opposite Account Handle"] || "Unknown";
    const month = getYearMonth(tx["Effective Date & Time"]);
    const current = recipientMap.get(recipient) ?? {
      total: 0,
      paymentCount: 0,
      earliestMonth: month,
      latestMonth: month,
      description: tx["Description"],
    };
    current.total += Math.abs(tx["Amount Single Column"]);
    current.paymentCount += 1;
    if (month < current.earliestMonth) current.earliestMonth = month;
    if (month > current.latestMonth) current.latestMonth = month;
    recipientMap.set(recipient, current);
  }

  return Array.from(recipientMap.entries())
    .map(([recipient, data]) => {
      const monthSpan = monthsBetween(data.earliestMonth, data.latestMonth);
      return {
        recipient,
        totalPaid: Math.round(data.total * 100) / 100,
        monthlyAverage: Math.round((data.total / monthSpan) * 100) / 100,
        paymentCount: data.paymentCount,
        firstPayment: data.earliestMonth,
        lastPayment: data.latestMonth,
        description: data.description,
      };
    })
    .sort((a, b) => b.totalPaid - a.totalPaid);
}

export function calculateRunwayProjection(
  transactions: Transaction[],
  monthsToAverage = 6
): RunwayProjection {
  const monthlyData = calculateMonthlyData(transactions);
  const recentMonths = monthlyData.slice(-monthsToAverage);

  const currentBalance = monthlyData.reduce((sum, m) => sum + m.net, 0);
  const averageMonthlyExpenses =
    recentMonths.reduce((sum, m) => sum + m.expenses, 0) / recentMonths.length;
  const averageMonthlyIncome =
    recentMonths.reduce((sum, m) => sum + m.income, 0) / recentMonths.length;
  const averageMonthlyNet = averageMonthlyIncome - averageMonthlyExpenses;

  const monthsOfRunway =
    averageMonthlyNet >= 0 ? Infinity : Math.floor(currentBalance / Math.abs(averageMonthlyNet));

  const requiredMonthlyContribution =
    averageMonthlyExpenses > averageMonthlyIncome
      ? averageMonthlyExpenses - averageMonthlyIncome
      : 0;

  return {
    currentBalance: Math.round(currentBalance * 100) / 100,
    averageMonthlyExpenses: Math.round(averageMonthlyExpenses * 100) / 100,
    averageMonthlyIncome: Math.round(averageMonthlyIncome * 100) / 100,
    averageMonthlyNet: Math.round(averageMonthlyNet * 100) / 100,
    monthsOfRunway,
    requiredMonthlyContribution: Math.round(requiredMonthlyContribution * 100) / 100,
  };
}

export function calculateSalaryPercentageOfIncome(transactions: Transaction[]): {
  monthlySalaryExpenses: number;
  avgMonthlyIncome: number;
  avgMonthlyRecurringIncome: number;
  percentageOfTotalIncome: number;
  percentageOfRecurringIncome: number;
} {
  const salaries = analyzeSalariedExpenses(transactions);
  const monthlyData = calculateMonthlyData(transactions);
  const monthlyContributions = analyzeMonthlyRecurringContributions(transactions);

  const recentMonths = monthlyData.slice(-6);
  const recentContributions = monthlyContributions.slice(-6);

  const avgMonthlyIncome =
    recentMonths.reduce((sum, m) => sum + m.income, 0) / recentMonths.length;
  const avgMonthlyRecurring =
    recentContributions.reduce((sum, m) => sum + m.recurring, 0) / recentContributions.length;

  const recurringSalaries = salaries.filter((s) => s.paymentCount > 1);
  const monthlySalaryExpenses = recurringSalaries.reduce((sum, s) => sum + s.monthlyAverage, 0);

  const percentageOfTotalIncome =
    avgMonthlyIncome > 0 ? (monthlySalaryExpenses / avgMonthlyIncome) * 100 : 0;
  const percentageOfRecurringIncome =
    avgMonthlyRecurring > 0 ? (monthlySalaryExpenses / avgMonthlyRecurring) * 100 : 0;

  return {
    monthlySalaryExpenses: Math.round(monthlySalaryExpenses * 100) / 100,
    avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
    avgMonthlyRecurringIncome: Math.round(avgMonthlyRecurring * 100) / 100,
    percentageOfTotalIncome: Math.round(percentageOfTotalIncome * 10) / 10,
    percentageOfRecurringIncome: Math.round(percentageOfRecurringIncome * 10) / 10,
  };
}

export function getTopContributors(transactions: Transaction[], limit = 10): SourceBreakdown[] {
  return analyzeIncomeSources(transactions).slice(0, limit);
}

export function getTopExpenses(transactions: Transaction[], limit = 10): ExpenseBreakdown[] {
  return analyzeExpenses(transactions).slice(0, limit);
}

export interface SingleContribution {
  date: string;
  source: string;
  amount: number;
  description: string;
  isRecurring: boolean;
}

export function getLargestSingleContributions(
  transactions: Transaction[],
  limit = 10
): SingleContribution[] {
  const contributions: SingleContribution[] = [];

  for (const tx of transactions) {
    if (isReversedOrReverse(tx)) continue;
    if (tx["Credit/Debit"] !== "CREDIT") continue;

    contributions.push({
      date: tx["Effective Date & Time"].split("T")[0],
      source: tx["Opposite Account Name"] || tx["Opposite Account Handle"] || "Unknown",
      amount: tx["Amount Single Column"],
      description: tx["Description"],
      isRecurring: isRecurringContribution(tx),
    });
  }

  return contributions.sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export function getLargestOneTimeContributions(
  transactions: Transaction[],
  limit = 10
): SingleContribution[] {
  return getLargestSingleContributions(transactions, 1000)
    .filter((c) => !c.isRecurring)
    .slice(0, limit);
}
