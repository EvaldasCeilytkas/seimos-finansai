import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUpRight,
  CalendarDays, CheckCircle2, Copy, Download, Gauge, Pencil, PiggyBank,
  Plus, Search, Trash2, WalletCards, X, MessageSquareText
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { assetTypes, categories, demoAssets, demoFinancialAccounts, demoTransactions, people } from "./data/demo";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const TRANSACTIONS_KEY = "seimos-finansai-transactions-v1";
const ASSETS_KEY = "seimos-finansai-assets-v1";
const BUDGETS_KEY = "seimos-finansai-budgets-v1";
const FINANCIAL_ACCOUNTS_KEY = "seimos-finansai-accounts-v1";
const NET_WORTH_HISTORY_KEY = "seimos-finansai-net-worth-history-v1";
const INVESTMENT_HISTORY_KEY = "seimos-finansai-investment-history-v1";
const MONTHS = ["Sausis", "Vasaris", "Kovas", "Balandis", "Gegužė", "Birželis", "Liepa", "Rugpjūtis", "Rugsėjis", "Spalis", "Lapkritis", "Gruodis"];
const EXPENSE_CATEGORIES = categories.filter((item) => item !== "Atlyginimas");

const money = (value) => new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
const dateLt = (value) => value ? new Intl.DateTimeFormat("lt-LT").format(new Date(`${value}T00:00:00`)) : "—";
const ym = (date) => date?.slice(0, 7) || "";

function loadStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function typeLabel(type) {
  return assetTypes.find((item) => item.value === type)?.label || "Kitas turtas";
}

function interest(asset) {
  if (asset.type !== "deposit" || !asset.startDate || !asset.endDate) return 0;
  const days = Math.max(0, (new Date(asset.endDate) - new Date(asset.startDate)) / 86400000);
  return Number(asset.amount) * Number(asset.interestRate || 0) / 100 * days / 365;
}

function categoryEmoji(category) {
  const icons = {
    "Alkoholis": "🍷", "Atostogos": "✈️", "Auto/Transportas": "🚗", "Buitis": "🏠",
    "Drabužiai": "👕", "Dovanos": "🎁", "Gyvūnai": "🐾", "Grožis": "✨",
    "Higiena": "🧴", "Maistas": "🍽️", "Medicina": "💊", "Mokesčiai": "🧾",
    "Pramogos": "🎬", "Vaikas": "🧸", "Evaldo asmeninės": "👤", "Rimos asmeninės": "👤",
    "Atlyginimas": "💼", "Investavimas": "📈", "Kita": "•"
  };
  return icons[category] || "•";
}

function FinanceApp({ initialData, onPersist, userEmail, onSignOut }) {
  const [activePage, setActivePage] = useState("overview");
  const [transactions, setTransactions] = useState(() => initialData?.transactions ?? loadStorage(TRANSACTIONS_KEY, demoTransactions));
  const [assets, setAssets] = useState(() => initialData?.assets ?? loadStorage(ASSETS_KEY, demoAssets));
  const [budgets, setBudgets] = useState(() => initialData?.budgets ?? loadStorage(BUDGETS_KEY, []));
  const [financialAccounts, setFinancialAccounts] = useState(() => initialData?.financialAccounts ?? loadStorage(FINANCIAL_ACCOUNTS_KEY, demoFinancialAccounts));
  const [netWorthHistory, setNetWorthHistory] = useState(() => initialData?.netWorthHistory ?? loadStorage(NET_WORTH_HISTORY_KEY, []));
  const [investmentHistoryRows, setInvestmentHistoryRows] = useState(() => initialData?.investmentHistory ?? loadStorage(INVESTMENT_HISTORY_KEY, []));
  const [periodMode, setPeriodMode] = useState("month");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(7);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [assetOpen, setAssetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetDefaultType, setAssetDefaultType] = useState("deposit");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [cloudStatus, setCloudStatus] = useState("saved");
  const [netWorthSnapshotOpen, setNetWorthSnapshotOpen] = useState(false);
  const [editingNetWorthSnapshot, setEditingNetWorthSnapshot] = useState(null);
  const [investmentSnapshotOpen, setInvestmentSnapshotOpen] = useState(false);
  const [editingInvestmentSnapshot, setEditingInvestmentSnapshot] = useState(null);

  const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const periodTransactions = useMemo(
    () => transactions.filter((item) => periodMode === "year" ? item.date.startsWith(String(selectedYear)) : ym(item.date) === periodKey),
    [transactions, periodMode, selectedYear, periodKey]
  );

  const totals = useMemo(() => {
    const income = periodTransactions.filter((i) => i.type === "income").reduce((s, i) => s + Number(i.amount), 0);
    const expenses = periodTransactions.filter((i) => i.type === "expense").reduce((s, i) => s + Number(i.amount), 0);
    const invested = periodTransactions.filter((i) => i.type === "investment").reduce((s, i) => s + Number(i.amount), 0);
    const savings = income - expenses;
    const savingsAfterInvestment = savings - invested;
    return {
      income,
      expenses,
      invested,
      savings,
      savingsAfterInvestment,
      savingsRate: income ? savings / income * 100 : 0,
      savingsAfterInvestmentRate: income ? savingsAfterInvestment / income * 100 : 0
    };
  }, [periodTransactions]);

  const yearlyData = useMemo(() => MONTHS.map((month, index) => {
    const key = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
    const rows = transactions.filter((item) => ym(item.date) === key);
    const income = rows.filter((i) => i.type === "income").reduce((s, i) => s + Number(i.amount), 0);
    const expenses = rows.filter((i) => i.type === "expense").reduce((s, i) => s + Number(i.amount), 0);
    const invested = rows.filter((i) => i.type === "investment").reduce((s, i) => s + Number(i.amount), 0);
    const savings = income - expenses;
    return { month: month.slice(0, 3), income, expenses, savings, invested, savingsAfterInvestment: savings - invested };
  }), [transactions, selectedYear]);

  const categoryData = useMemo(() => {
    const grouped = {};
    periodTransactions.filter((i) => i.type === "expense").forEach((i) => {
      grouped[i.category] = (grouped[i.category] || 0) + Number(i.amount);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  const trendData = useMemo(() => {
    if (periodMode === "year") return yearlyData;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const previousDate = new Date(selectedYear, selectedMonth, 0);
    const previousKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
    const previousRows = transactions.filter((item) => ym(item.date) === previousKey);
    let income = 0, expenses = 0, previousExpenses = 0;
    return Array.from({ length: daysInMonth }, (_, index) => {
      const dayNumber = index + 1;
      periodTransactions.filter((i) => Number(i.date.slice(8, 10)) === dayNumber).forEach((i) => {
        if (i.type === "income") income += Number(i.amount);
        if (i.type === "expense") expenses += Number(i.amount);
      });
      previousRows.filter((i) => Number(i.date.slice(8, 10)) === dayNumber && i.type === "expense").forEach((i) => previousExpenses += Number(i.amount));
      return { day: String(dayNumber).padStart(2, "0"), income, expenses, previousExpenses };
    });
  }, [periodTransactions, periodMode, yearlyData, transactions, selectedYear, selectedMonth]);

  const assetSummary = useMemo(() => {
    const deposits = assets.filter((item) => item.type === "deposit");
    const depositTotal = deposits.reduce((sum, item) => sum + Number(item.amount), 0);
    return {
      total: depositTotal,
      deposits,
      depositTotal,
      interest: deposits.reduce((sum, item) => sum + interest(item), 0)
    };
  }, [assets]);

  const assetChartData = useMemo(() => {
    const grouped = {};
    assets.filter((item) => item.type === "deposit").forEach((item) => {
      const owner = item.owner || "Šeima";
      grouped[owner] = (grouped[owner] || 0) + Number(item.amount);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [assets]);

  const investmentData = useMemo(() => {
    const rows = assets.filter((asset) => asset.type === "investment");
    const total = rows.reduce((sum, asset) => sum + Number(asset.amount), 0);
    const byOwner = people.map((owner) => ({
      name: owner,
      value: rows.filter((asset) => asset.owner === owner).reduce((sum, asset) => sum + Number(asset.amount), 0)
    }));
    const byInstitutionMap = {};
    rows.forEach((asset) => {
      const institution = asset.institution?.trim() || "Kita";
      byInstitutionMap[institution] = (byInstitutionMap[institution] || 0) + Number(asset.amount);
    });
    const byInstitution = Object.entries(byInstitutionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return {
      rows,
      total,
      byOwner,
      byInstitution,
      platforms: byInstitution.length,
      largest: byInstitution[0] || null
    };
  }, [assets]);

  const investmentHistory = useMemo(() => investmentHistoryRows
    .filter((row) => String(row.monthKey || "").startsWith(String(selectedYear)))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((row) => {
      const legacyTotal = Number(row.value || 0);
      const evaldas = Number(row.evaldas || 0);
      const rima = Number(row.rima || 0);
      return {
        ...row,
        month: MONTHS[Number(row.monthKey.slice(5, 7)) - 1]?.slice(0, 3) || row.monthKey,
        evaldas,
        rima,
        total: row.evaldas == null && row.rima == null ? legacyTotal : evaldas + rima
      };
    }), [investmentHistoryRows, selectedYear]);

  const latestInvestmentSnapshotForDefaults = useMemo(() => {
    if (!investmentHistoryRows.length) return null;
    return [...investmentHistoryRows].sort((a, b) => String(a.monthKey || "").localeCompare(String(b.monthKey || ""))).slice(-1)[0] || null;
  }, [investmentHistoryRows]);

  const assetHistory = useMemo(() => MONTHS.map((month, index) => {
    const cutoff = `${selectedYear}-${String(index + 1).padStart(2, "0")}-31`;
    return {
      month: month.slice(0, 3),
      value: assets
        .filter((asset) => asset.type === "deposit")
        .filter((asset) => (asset.startDate || asset.valueDate || "1900-01-01") <= cutoff && (!asset.endDate || asset.endDate >= cutoff))
        .reduce((sum, asset) => sum + Number(asset.amount), 0)
    };
  }), [assets, selectedYear]);

  const budgetRows = useMemo(() => {
    const monthBudgets = budgets.filter((budget) => budget.monthKey === periodKey);
    const monthExpenses = transactions.filter((item) => item.type === "expense" && ym(item.date) === periodKey);
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === selectedYear && now.getMonth() === selectedMonth;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const elapsedDays = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;

    return monthBudgets.map((budget) => {
      const spent = monthExpenses.filter((item) => item.category === budget.category).reduce((sum, item) => sum + Number(item.amount), 0);
      const limit = Number(budget.amount);
      const percentage = limit > 0 ? spent / limit * 100 : 0;
      const projected = isCurrentMonth ? spent / elapsedDays * daysInMonth : spent;
      return { ...budget, spent, limit, percentage, remaining: limit - spent, projected };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [budgets, transactions, periodKey, selectedYear, selectedMonth]);

  const budgetSummary = useMemo(() => {
    const limit = budgetRows.reduce((sum, row) => sum + row.limit, 0);
    const spent = budgetRows.reduce((sum, row) => sum + row.spent, 0);
    return {
      limit,
      spent,
      remaining: limit - spent,
      percentage: limit > 0 ? spent / limit * 100 : 0,
      exceeded: budgetRows.filter((row) => row.percentage > 100).length,
      warning: budgetRows.filter((row) => row.percentage >= 80 && row.percentage <= 100).length
    };
  }, [budgetRows]);

  const accountRows = useMemo(() => financialAccounts.map((account) => {
    let balance = Number(account.openingBalance || 0);
    transactions.forEach((transaction) => {
      if (transaction.date < account.openingDate) return;
      const accountId = transaction.accountId || transaction.account;
      const fromId = transaction.fromAccountId || transaction.fromAccount;
      const toId = transaction.toAccountId || transaction.toAccount;

      if (transaction.type === "income" && accountId === account.id) balance += Number(transaction.amount);
      if (transaction.type === "expense" && accountId === account.id) balance -= Number(transaction.amount);
      if (transaction.type === "investment" && accountId === account.id) balance -= Number(transaction.amount);
      if (transaction.type === "transfer" && fromId === account.id) balance -= Number(transaction.amount);
      if (transaction.type === "transfer" && toId === account.id) balance += Number(transaction.amount);
    });
    return { ...account, balance };
  }), [financialAccounts, transactions]);

  const accountSummary = useMemo(() => {
    const included = accountRows.filter((account) => account.active && account.includeInNetWorth);
    const total = included.reduce((sum, account) => sum + account.balance, 0);
    const cash = included.filter((account) => account.type === "cash").reduce((sum, account) => sum + account.balance, 0);
    const credit = included.filter((account) => account.type === "credit").reduce((sum, account) => sum + account.balance, 0);
    return { total, cash, credit, count: included.length };
  }, [accountRows]);


  const netWorthData = useMemo(() => {
    const includedAccounts = accountRows.filter((account) => account.active && account.includeInNetWorth);
    const positiveAccounts = includedAccounts.filter((account) => account.balance >= 0).reduce((sum, account) => sum + account.balance, 0);
    const liabilities = includedAccounts.filter((account) => account.balance < 0).reduce((sum, account) => sum + Math.abs(account.balance), 0);
    const investments = assets.filter((asset) => asset.type === "investment").reduce((sum, asset) => sum + Number(asset.amount), 0);
    const deposits = assets.filter((asset) => asset.type === "deposit").reduce((sum, asset) => sum + Number(asset.amount), 0);
    const otherAssets = assets.filter((asset) => !["investment", "deposit"].includes(asset.type)).reduce((sum, asset) => sum + Number(asset.amount), 0);
    const netWorth = positiveAccounts + deposits + investments + otherAssets - liabilities;

    const history = netWorthHistory
      .filter((row) => String(row.monthKey || "").startsWith(String(selectedYear)))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((row) => {
        const savedDeposits = Number(row.deposits ?? row.otherAssets ?? 0);
        const savedOtherAssets = row.deposits == null ? 0 : Number(row.otherAssets || 0);
        return {
          ...row,
          deposits: savedDeposits,
          otherAssets: savedOtherAssets,
          month: MONTHS[Number(row.monthKey.slice(5, 7)) - 1]?.slice(0, 3) || row.monthKey,
          value: Number(row.financialAccounts || 0) + savedDeposits + Number(row.investments || 0) + savedOtherAssets - Number(row.liabilities || 0)
        };
      });

    const breakdown = [
      { name: "Finansinės paskyros", value: positiveAccounts },
      { name: "Indėliai", value: deposits },
      { name: "Investicijos", value: investments },
      { name: "Kitas turtas", value: otherAssets }
    ].filter((item) => item.value > 0);

    return { netWorth, positiveAccounts, deposits, investments, otherAssets, liabilities, history, breakdown };
  }, [accountRows, assets, netWorthHistory, selectedYear]);



  async function persistState(patch) {
    const payload = {
      transactions,
      assets,
      budgets,
      financialAccounts,
      netWorthHistory,
      investmentHistory: investmentHistoryRows,
      ...patch
    };

    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(payload.transactions));
    localStorage.setItem(ASSETS_KEY, JSON.stringify(payload.assets));
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(payload.budgets));
    localStorage.setItem(FINANCIAL_ACCOUNTS_KEY, JSON.stringify(payload.financialAccounts));
    localStorage.setItem(NET_WORTH_HISTORY_KEY, JSON.stringify(payload.netWorthHistory));
    localStorage.setItem(INVESTMENT_HISTORY_KEY, JSON.stringify(payload.investmentHistory));

    if (!onPersist) return;
    setCloudStatus("saving");
    try {
      await onPersist(payload);
      setCloudStatus("saved");
    } catch (error) {
      console.error(error);
      setCloudStatus("error");
      window.alert("Nepavyko išsaugoti duomenų Supabase. Vietinė kopija naršyklėje išsaugota.");
    }
  }

  function saveTransactions(next) {
    setTransactions(next);
    void persistState({ transactions: next });
  }

  function saveBudgets(next) {
    setBudgets(next);
    void persistState({ budgets: next });
  }

  function saveFinancialAccounts(next) {
    setFinancialAccounts(next);
    void persistState({ financialAccounts: next });
  }

  function saveNetWorthHistory(next) {
    setNetWorthHistory(next);
    void persistState({ netWorthHistory: next });
  }

  function saveInvestmentHistory(next) {
    setInvestmentHistoryRows(next);
    void persistState({ investmentHistory: next });
  }

  function submitInvestmentSnapshot(item) {
    const normalized = {
      ...item,
      evaldas: Number(item.evaldas || 0),
      rima: Number(item.rima || 0),
      evaldasContributed: item.evaldasContributed === "" || item.evaldasContributed == null ? null : Number(item.evaldasContributed),
      rimaContributed: item.rimaContributed === "" || item.rimaContributed == null ? null : Number(item.rimaContributed)
    };
    normalized.total = normalized.evaldas + normalized.rima;
    delete normalized.value;
    const duplicate = investmentHistoryRows.find((row) => row.monthKey === normalized.monthKey && row.id !== editingInvestmentSnapshot?.id);
    if (duplicate) {
      window.alert("Šiam mėnesiui investicijų vertės įrašas jau sukurtas. Redaguokite esamą įrašą.");
      return;
    }
    const next = editingInvestmentSnapshot
      ? investmentHistoryRows.map((row) => row.id === editingInvestmentSnapshot.id ? { ...normalized, id: row.id } : row)
      : [...investmentHistoryRows, { ...normalized, id: crypto.randomUUID() }];
    saveInvestmentHistory(next);
    setInvestmentSnapshotOpen(false);
    setEditingInvestmentSnapshot(null);
  }

  function deleteInvestmentSnapshot(item) {
    if (window.confirm(`Ištrinti ${item.monthKey} investicijų vertės įrašą?`)) {
      saveInvestmentHistory(investmentHistoryRows.filter((row) => row.id !== item.id));
    }
  }

  function submitNetWorthSnapshot(item) {
    const normalized = {
      ...item,
      financialAccounts: Number(item.financialAccounts || 0),
      deposits: Number(item.deposits || 0),
      investments: Number(item.investments || 0),
      otherAssets: Number(item.otherAssets || 0),
      liabilities: Number(item.liabilities || 0)
    };
    const duplicate = netWorthHistory.find((row) => row.monthKey === normalized.monthKey && row.id !== editingNetWorthSnapshot?.id);
    if (duplicate) {
      window.alert("Šiam mėnesiui įrašas jau sukurtas. Redaguokite esamą įrašą.");
      return;
    }
    const next = editingNetWorthSnapshot
      ? netWorthHistory.map((row) => row.id === editingNetWorthSnapshot.id ? { ...normalized, id: row.id } : row)
      : [...netWorthHistory, { ...normalized, id: crypto.randomUUID() }];
    saveNetWorthHistory(next);
    setNetWorthSnapshotOpen(false);
    setEditingNetWorthSnapshot(null);
  }

  function deleteNetWorthSnapshot(item) {
    if (window.confirm(`Ištrinti ${item.monthKey} grynojo turto įrašą?`)) {
      saveNetWorthHistory(netWorthHistory.filter((row) => row.id !== item.id));
    }
  }

  function submitFinancialAccount(item) {
    const normalized = {
      ...item,
      openingBalance: Number(item.openingBalance || 0),
      active: Boolean(item.active),
      includeInNetWorth: Boolean(item.includeInNetWorth)
    };
    const next = editingAccount
      ? financialAccounts.map((account) => account.id === editingAccount.id ? { ...normalized, id: account.id } : account)
      : [...financialAccounts, { ...normalized, id: crypto.randomUUID() }];
    saveFinancialAccounts(next);
    setAccountOpen(false);
    setEditingAccount(null);
  }

  function deleteFinancialAccount(account) {
    const used = transactions.some((transaction) =>
      (transaction.accountId || transaction.account) === account.id ||
      (transaction.fromAccountId || transaction.fromAccount) === account.id ||
      (transaction.toAccountId || transaction.toAccount) === account.id
    );
    if (used) {
      window.alert("Ši paskyra jau naudojama operacijose. Vietoje trynimo pažymėkite ją neaktyvia.");
      return;
    }
    if (window.confirm(`Ištrinti paskyrą „${account.name}“?`)) {
      saveFinancialAccounts(financialAccounts.filter((item) => item.id !== account.id));
    }
  }

  function shiftMonth(direction) {
    let nextMonth = selectedMonth + direction;
    let nextYear = selectedYear;
    if (nextMonth < 0) { nextMonth = 11; nextYear -= 1; }
    if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  }

  function submitTransaction(item) {
    if (editingTransaction) {
      saveTransactions(transactions.map((row) =>
        row.id === editingTransaction.id ? { ...item, id: row.id, amount: Number(item.amount) } : row
      ));
    } else {
      saveTransactions([{ ...item, id: crypto.randomUUID(), amount: Number(item.amount) }, ...transactions]);
    }
    setTransactionOpen(false);
    setEditingTransaction(null);
  }

  function editTransaction(item) {
    setEditingTransaction(item);
    setTransactionOpen(true);
  }

  function duplicateTransaction(item) {
    saveTransactions([{ ...item, id: crypto.randomUUID(), description: `${item.description} (kopija)` }, ...transactions]);
  }

  function deleteTransaction(item) {
    if (window.confirm(`Ištrinti operaciją „${item.description}“?`)) {
      saveTransactions(transactions.filter((row) => row.id !== item.id));
    }
  }

  function saveAssets(next) {
    setAssets(next);
    void persistState({ assets: next });
  }

  function submitAsset(item) {
    const normalized = {
      ...item,
      amount: Number(item.amount),
      interestRate: Number(item.interestRate || 0)
    };

    if (editingAsset) {
      saveAssets(assets.map((asset) =>
        asset.id === editingAsset.id ? { ...normalized, id: editingAsset.id } : asset
      ));
    } else {
      saveAssets([{ ...normalized, id: crypto.randomUUID() }, ...assets]);
    }

    setAssetOpen(false);
    setEditingAsset(null);
  }

  function editAsset(asset) {
    setEditingAsset(asset);
    setAssetDefaultType(asset.type || "deposit");
    setAssetOpen(true);
  }

  function duplicateAsset(asset) {
    saveAssets([{ ...asset, id: crypto.randomUUID(), name: `${asset.name} (kopija)` }, ...assets]);
  }

  function deleteAsset(asset) {
    if (window.confirm(`Ar tikrai norite ištrinti „${asset.name}“?`)) {
      saveAssets(assets.filter((item) => item.id !== asset.id));
    }
  }

  function submitBudget(item) {
    const sameCategory = budgets.find((budget) =>
      budget.monthKey === periodKey &&
      budget.category === item.category &&
      budget.id !== editingBudget?.id
    );

    let next;
    if (sameCategory) {
      next = budgets.map((budget) =>
        budget.id === sameCategory.id ? { ...budget, amount: Number(item.amount) } : budget
      );
    } else if (editingBudget) {
      next = budgets.map((budget) =>
        budget.id === editingBudget.id
          ? { ...budget, category: item.category, amount: Number(item.amount), monthKey: periodKey }
          : budget
      );
    } else {
      next = [...budgets, {
        id: crypto.randomUUID(),
        monthKey: periodKey,
        category: item.category,
        amount: Number(item.amount)
      }];
    }

    saveBudgets(next);
    setBudgetOpen(false);
    setEditingBudget(null);
  }

  function copyPreviousBudgets() {
    const previousDate = new Date(selectedYear, selectedMonth - 1, 1);
    const previousKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
    const previous = budgets.filter((budget) => budget.monthKey === previousKey);
    if (!previous.length) {
      window.alert("Ankstesniam mėnesiui biudžetų nėra.");
      return;
    }

    const withoutCurrent = budgets.filter((budget) => budget.monthKey !== periodKey);
    const copied = previous.map((budget) => ({
      ...budget,
      id: crypto.randomUUID(),
      monthKey: periodKey
    }));
    saveBudgets([...withoutCurrent, ...copied]);
  }

  function deleteBudget(item) {
    if (window.confirm(`Pašalinti kategorijos „${item.category}“ biudžetą?`)) {
      saveBudgets(budgets.filter((budget) => budget.id !== item.id));
    }
  }

  function openNewTransaction() {
    setEditingTransaction(null);
    setTransactionOpen(true);
  }

  function openNewBudget() {
    setEditingBudget(null);
    setBudgetOpen(true);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">ŠF</div>
          <div><strong>Šeimos finansai</strong><span>Finansų centras</span></div>
        </div>
        <nav>
          <button className={`nav-item ${activePage === "overview" ? "active" : ""}`} onClick={() => setActivePage("overview")}>Apžvalga</button>
          <button className={`nav-item ${activePage === "transactions" ? "active" : ""}`} onClick={() => setActivePage("transactions")}>Operacijos</button>
          <button className={`nav-item ${activePage === "budgets" ? "active" : ""}`} onClick={() => setActivePage("budgets")}>Biudžetai</button>
          <button className={`nav-item ${activePage === "accounts" ? "active" : ""}`} onClick={() => setActivePage("accounts")}>Paskyros</button>
          <button className={`nav-item ${activePage === "assets" ? "active" : ""}`} onClick={() => setActivePage("assets")}>Indėliai</button>
          <button className={`nav-item ${activePage === "investments" ? "active" : ""}`} onClick={() => setActivePage("investments")}>Investicijos</button>
          <button className={`nav-item ${activePage === "networth" ? "active" : ""}`} onClick={() => setActivePage("networth")}>Grynasis turtas</button>
          <button className={`nav-item ${activePage === "analytics" ? "active" : ""}`} onClick={() => setActivePage("analytics")}>Analitika</button>
        </nav>
        <div className="sidebar-footer cloud-footer">
          <span>V2.5.3 · Pinigų srautų grafikas</span>
          <span className={`cloud-status ${cloudStatus}`}>{cloudStatus === "saving" ? "Saugoma…" : cloudStatus === "error" ? "Saugojimo klaida" : "Duomenys išsaugoti"}</span>
          <small>{userEmail}</small>
          <button onClick={onSignOut}>Atsijungti</button>
        </div>
      </aside>

      <main className="main-content">
        <PeriodBar
          mode={periodMode}
          setMode={setPeriodMode}
          year={selectedYear}
          setYear={setSelectedYear}
          month={selectedMonth}
          setMonth={setSelectedMonth}
          shiftMonth={shiftMonth}
        />

        {activePage === "overview" && (
          <Overview
            totals={totals}
            periodMode={periodMode}
            year={selectedYear}
            month={selectedMonth}
            trendData={trendData}
            categoryData={categoryData}
            rows={periodTransactions}
            yearlyData={yearlyData}
            assetSummary={assetSummary}
            budgetSummary={budgetSummary}
            accountSummary={accountSummary}
            onNew={openNewTransaction}
            onAssets={() => setActivePage("assets")}
            onTransactions={() => setActivePage("transactions")}
            onBudgets={() => setActivePage("budgets")}
            onAccounts={() => setActivePage("accounts")}
          />
        )}

        {activePage === "transactions" && (
          <TransactionsCenter
            transactions={transactions}
            financialAccounts={financialAccounts}
            periodMode={periodMode}
            year={selectedYear}
            month={selectedMonth}
            onNew={openNewTransaction}
            onEdit={editTransaction}
            onDuplicate={duplicateTransaction}
            onDelete={deleteTransaction}
          />
        )}

        {activePage === "budgets" && (
          <BudgetsCenter
            rows={budgetRows}
            summary={budgetSummary}
            periodKey={periodKey}
            onNew={openNewBudget}
            onCopy={copyPreviousBudgets}
            onEdit={(budget) => { setEditingBudget(budget); setBudgetOpen(true); }}
            onDelete={deleteBudget}
          />
        )}


        {activePage === "accounts" && (
          <FinancialAccounts
            accounts={accountRows}
            summary={accountSummary}
            onNew={() => { setEditingAccount(null); setAccountOpen(true); }}
            onEdit={(account) => { setEditingAccount(account); setAccountOpen(true); }}
            onDelete={deleteFinancialAccount}
          />
        )}

        {activePage === "assets" && (
          <Assets
            assets={assets}
            summary={assetSummary}
            chartData={assetChartData}
            history={assetHistory}
            year={selectedYear}
            onNew={() => { setEditingAsset(null); setAssetDefaultType("deposit"); setAssetOpen(true); }}
            onEdit={editAsset}
            onDuplicate={duplicateAsset}
            onDelete={deleteAsset}
          />
        )}

        {activePage === "investments" && (
          <Investments
            data={investmentData}
            history={investmentHistory}
            snapshots={investmentHistoryRows}
            transactions={transactions}
            year={selectedYear}
            month={selectedMonth}
            periodMode={periodMode}
            onNew={() => { setEditingAsset(null); setAssetDefaultType("investment"); setAssetOpen(true); }}
            onNewSnapshot={() => { setEditingInvestmentSnapshot(null); setInvestmentSnapshotOpen(true); }}
            onEditSnapshot={(item) => { setEditingInvestmentSnapshot(item); setInvestmentSnapshotOpen(true); }}
            onDeleteSnapshot={deleteInvestmentSnapshot}
            onNewOperation={openNewTransaction}
            onEditOperation={editTransaction}
            onDuplicateOperation={duplicateTransaction}
            onDeleteOperation={deleteTransaction}
            onEdit={editAsset}
            onDuplicate={duplicateAsset}
            onDelete={deleteAsset}
          />
        )}

        {activePage === "networth" && (
          <NetWorth
            data={netWorthData}
            year={selectedYear}
            snapshots={netWorthHistory}
            onNewSnapshot={() => { setEditingNetWorthSnapshot(null); setNetWorthSnapshotOpen(true); }}
            onEditSnapshot={(item) => { setEditingNetWorthSnapshot(item); setNetWorthSnapshotOpen(true); }}
            onDeleteSnapshot={deleteNetWorthSnapshot}
            onAccounts={() => setActivePage("accounts")}
            onAssets={() => setActivePage("assets")}
            onInvestments={() => setActivePage("investments")}
          />
        )}

        {activePage === "analytics" && (
          <AnalyticsCenter
            transactions={transactions}
            periodMode={periodMode}
            year={selectedYear}
            month={selectedMonth}
            periodRows={periodTransactions}
            totals={totals}
            yearlyData={yearlyData}
            categoryData={categoryData}
          />
        )}
      </main>

      {transactionOpen && (
        <TransactionModal
          initial={editingTransaction}
          assets={assets}
          financialAccounts={financialAccounts.filter((account) => account.active)}
          initialDate={`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`}
          onClose={() => { setTransactionOpen(false); setEditingTransaction(null); }}
          onSubmit={submitTransaction}
        />
      )}

      {assetOpen && (
        <AssetModal
          initial={editingAsset}
          initialType={assetDefaultType}
          initialDate={`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`}
          onClose={() => { setAssetOpen(false); setEditingAsset(null); }}
          onSubmit={submitAsset}
        />
      )}


      {accountOpen && (
        <FinancialAccountModal
          initial={editingAccount}
          onClose={() => { setAccountOpen(false); setEditingAccount(null); }}
          onSubmit={submitFinancialAccount}
        />
      )}

      {netWorthSnapshotOpen && (
        <NetWorthSnapshotModal
          initial={editingNetWorthSnapshot}
          defaults={{ monthKey: `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`, financialAccounts: netWorthData.positiveAccounts, deposits: netWorthData.deposits, investments: netWorthData.investments, otherAssets: netWorthData.otherAssets, liabilities: netWorthData.liabilities }}
          onClose={() => { setNetWorthSnapshotOpen(false); setEditingNetWorthSnapshot(null); }}
          onSubmit={submitNetWorthSnapshot}
        />
      )}



      {investmentSnapshotOpen && (
        <InvestmentSnapshotModal
          initial={editingInvestmentSnapshot}
          defaults={{ monthKey: `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`, evaldas: 0, rima: 0, evaldasContributed: latestInvestmentSnapshotForDefaults?.evaldasContributed ?? "", rimaContributed: latestInvestmentSnapshotForDefaults?.rimaContributed ?? "" }}
          onClose={() => { setInvestmentSnapshotOpen(false); setEditingInvestmentSnapshot(null); }}
          onSubmit={submitInvestmentSnapshot}
        />
      )}

      {budgetOpen && (
        <BudgetModal
          initial={editingBudget}
          onClose={() => { setBudgetOpen(false); setEditingBudget(null); }}
          onSubmit={submitBudget}
        />
      )}
    </div>
  );
}

function PeriodBar({ mode, setMode, year, setYear, month, setMonth, shiftMonth }) {
  return (
    <section className="period-bar">
      <div className="period-title"><CalendarDays size={18}/><span>Laikotarpis</span></div>
      <div className="period-mode">
        <button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>Mėnuo</button>
        <button className={mode === "year" ? "active" : ""} onClick={() => setMode("year")}>Visi metai</button>
      </div>
      <div className="period-controls">
        {mode === "month" && <button className="period-arrow" onClick={() => shiftMonth(-1)}><ArrowLeft size={17}/></button>}
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2026, 2027, 2028, 2029, 2030].map((item) => <option key={item}>{item}</option>)}
        </select>
        {mode === "month" && (
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((item, index) => <option key={item} value={index}>{item}</option>)}
          </select>
        )}
        {mode === "month" && <button className="period-arrow" onClick={() => shiftMonth(1)}><ArrowRight size={17}/></button>}
      </div>
    </section>
  );
}

function Overview({ totals, periodMode, year, month, trendData, categoryData, rows, yearlyData, assetSummary, budgetSummary, accountSummary, onNew, onAssets, onTransactions, onBudgets, onAccounts }) {
  const title = periodMode === "year" ? `${year} metų apžvalga` : `${year} m. ${MONTHS[month].toLowerCase()}`;
  return (
    <>
      <header className="topbar overview-topbar">
        <div><p className="eyebrow">{title}</p><h1>Šeimos finansų apžvalga</h1><p className="subtitle">Pajamos, išlaidos, biudžetai ir turtas vienoje vietoje.</p></div>
        <button className="primary-button" onClick={onNew}><Plus size={18}/>Nauja operacija</button>
      </header>

      <section className="overview-hero">
        <div className="overview-hero-copy">
          <span className="hero-label">Laikotarpio rezultatas</span>
          <strong className={totals.savings >= 0 ? "positive" : "negative"}>{money(totals.savings)}</strong>
          <p>{totals.income ? `Sutaupyta ${totals.savingsRate.toFixed(1)} % gautų pajamų.` : "Įveskite pirmąsias pajamas ir išlaidas."}</p>
        </div>
        <div className="overview-hero-stats">
          <div><span>Pajamos</span><b>{money(totals.income)}</b></div>
          <div><span>Išlaidos</span><b>{money(totals.expenses)}</b></div>
          <div><span>Finansinės paskyros</span><b>{money(accountSummary.total)}</b></div>
        </div>
      </section>

      <section className="metrics-grid five">
        <Metric tone="income" label="Pajamos" value={money(totals.income)} helper="Pasirinktas laikotarpis" icon={<ArrowUpRight/>}/>
        <Metric tone="expense" label="Išlaidos" value={money(totals.expenses)} helper="Pasirinktas laikotarpis" icon={<ArrowDownRight/>} onClick={onTransactions}/>
        <Metric tone="saving" label="Sutaupyta" value={money(totals.savings)} helper={`${totals.savingsRate.toFixed(1)} % pajamų`} icon={<PiggyBank/>}/>
        <Metric tone="budget" label="Biudžetas" value={budgetSummary.limit ? `${budgetSummary.percentage.toFixed(0)} %` : "Nenustatyta"} helper={budgetSummary.limit ? `${money(budgetSummary.spent)} iš ${money(budgetSummary.limit)}` : "Nustatykite limitus"} icon={<Gauge/>} onClick={onBudgets}/>
        <Metric tone="account" label="Finansinės paskyros" value={money(accountSummary.total)} helper={`${accountSummary.count} aktyvios paskyros`} icon={<WalletCards/>} onClick={onAccounts}/>
      </section>

      {periodMode === "month" && budgetSummary.limit > 0 && (
        <section className="card dashboard-budget-card" onClick={onBudgets}>
          <div className="budget-card-head">
            <div><p className="card-kicker">Šio mėnesio biudžetas</p><h2>{money(budgetSummary.spent)} iš {money(budgetSummary.limit)}</h2></div>
            <strong className={budgetSummary.percentage > 100 ? "danger-text" : ""}>{budgetSummary.percentage.toFixed(0)} %</strong>
          </div>
          <ProgressBar percentage={budgetSummary.percentage}/>
          <div className="budget-card-foot">
            <span>Liko: <strong>{money(budgetSummary.remaining)}</strong></span>
            <span>{budgetSummary.exceeded ? `${budgetSummary.exceeded} kategorijos viršytos` : "Biudžetas neviršytas"}</span>
          </div>
        </section>
      )}



      <section className="dashboard-grid">
        <ChartCard title={periodMode === "year" ? "Metų pajamos ir išlaidos" : "Sukauptos mėnesio pajamos ir išlaidos"}>
          <ResponsiveContainer width="100%" height="100%">
            {periodMode === "year" ? <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={money}/>
              <Area type="monotone" dataKey="income" name="Pajamos" stroke="#10b981" fill="#d1fae5" strokeWidth={3}/>
              <Area type="monotone" dataKey="expenses" name="Išlaidos" stroke="#f97316" fill="#ffedd5" strokeWidth={3}/>
            </AreaChart> : <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day"/><YAxis/><Tooltip formatter={money}/><Legend/>
              <Line type="monotone" dataKey="income" name="Pajamos" stroke="#10b981" strokeWidth={3} dot={false}/>
              <Line type="monotone" dataKey="expenses" name="Išlaidos" stroke="#f97316" strokeWidth={3} dot={false}/>
              <Line type="monotone" dataKey="previousExpenses" name="Praėjusio mėn. išlaidos" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 5" dot={false}/>
            </LineChart>}
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Išlaidos pagal kategorijas">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
                {categoryData.map((item, index) => <Cell key={item.name} fill={`hsl(${205 + index * 34} 68% 52%)`}/>)}
              </Pie>
              <Tooltip formatter={money}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {periodMode === "year" && (
        <section className="card yearly-card">
          <div className="card-header"><div><p className="card-kicker">Metinė suvestinė</p><h2>Santaupos pagal mėnesius</h2></div></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month"/><YAxis/><Tooltip formatter={money}/>
                <Bar dataKey="savings" fill="#2563eb" radius={[7,7,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="card transactions-card">
        <div className="card-header">
          <div><p className="card-kicker">Naujausios operacijos</p><h2>{rows.length} įrašai</h2></div>
          <button className="text-button" onClick={onTransactions}>Rodyti visas</button>
        </div>
        <div className="transactions-list">
          {rows.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,8).map((item) => <TransactionRow key={item.id} item={item}/>)}
          {!rows.length && <div className="empty-state">Šiam laikotarpiui operacijų nėra.</div>}
        </div>
      </section>
    </>
  );
}


function AnalyticsCenter({ transactions, periodMode, year, month, periodRows, totals, yearlyData, categoryData }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [categorySort, setCategorySort] = useState("amount");
  const [cashFlowRange, setCashFlowRange] = useState("12m");
  const [cashFlowView, setCashFlowView] = useState("bars");
  const expenseRows = useMemo(() => periodRows.filter((item) => item.type === "expense"), [periodRows]);
  const incomeRows = useMemo(() => periodRows.filter((item) => item.type === "income"), [periodRows]);

  const previousRows = useMemo(() => {
    if (periodMode === "year") {
      return transactions.filter((item) => item.date.startsWith(String(year - 1)));
    }
    const previousDate = new Date(year, month - 1, 1);
    const key = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
    return transactions.filter((item) => ym(item.date) === key);
  }, [transactions, periodMode, year, month]);

  const previousTotals = useMemo(() => {
    const income = previousRows.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const expenses = previousRows.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    const invested = previousRows.filter((item) => item.type === "investment").reduce((sum, item) => sum + Number(item.amount), 0);
    const savings = income - expenses;
    return { income, expenses, invested, savings, savingsAfterInvestment: savings - invested };
  }, [previousRows]);

  const change = (current, previous) => {
    if (!previous) return current ? null : 0;
    return (current - previous) / Math.abs(previous) * 100;
  };

  const incomeChange = change(totals.income, previousTotals.income);
  const expenseChange = change(totals.expenses, previousTotals.expenses);
  const savingsChange = change(totals.savings, previousTotals.savings);
  const investedChange = change(totals.invested, previousTotals.invested);
  const savingsAfterInvestmentChange = change(totals.savingsAfterInvestment, previousTotals.savingsAfterInvestment);
  const investmentRate = totals.income > 0 ? totals.invested / totals.income * 100 : null;

  const daysCovered = useMemo(() => {
    if (periodMode === "year") return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    return isCurrentMonth ? Math.max(1, today.getDate()) : new Date(year, month + 1, 0).getDate();
  }, [periodMode, year, month]);
  const averageDailyExpense = totals.expenses / daysCovered;

  const cashFlowAll = useMemo(() => {
    const monthly = {};
    transactions.forEach((item) => {
      if (!item.date || !["income", "expense", "investment"].includes(item.type)) return;
      const key = ym(item.date);
      if (!key) return;
      if (!monthly[key]) monthly[key] = { key, income: 0, expenses: 0, invested: 0 };
      if (item.type === "income") monthly[key].income += Number(item.amount || 0);
      if (item.type === "expense") monthly[key].expenses += Number(item.amount || 0);
      if (item.type === "investment") monthly[key].invested += Number(item.amount || 0);
    });
    const keys = Object.keys(monthly).sort();
    if (!keys.length) return [];
    const [startY, startM] = keys[0].split("-").map(Number);
    const [endY, endM] = keys[keys.length - 1].split("-").map(Number);
    const result = [];
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const row = monthly[key] || { key, income: 0, expenses: 0, invested: 0 };
      const savings = row.income - row.expenses;
      result.push({
        ...row,
        savings,
        savingsAfterInvestment: savings - row.invested,
        monthLabel: `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}`,
        fullLabel: `${MONTHS[m - 1]} ${y}`
      });
      m += 1;
      if (m === 13) { m = 1; y += 1; }
    }
    return result;
  }, [transactions]);

  const cashFlowData = useMemo(() => {
    const count = cashFlowRange === "3m" ? 3 : cashFlowRange === "6m" ? 6 : cashFlowRange === "12m" ? 12 : null;
    return count ? cashFlowAll.slice(-count) : cashFlowAll;
  }, [cashFlowAll, cashFlowRange]);

  const CashFlowTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    const values = [
      ["Pajamos", row.income],
      ["Išlaidos", row.expenses],
      ["Santaupos", row.savings],
      ["Investuota", row.invested],
      ["Po investavimo", row.savingsAfterInvestment]
    ];
    return <div className="cashflow-tooltip"><strong>{row.fullLabel}</strong>{values.map(([label,value])=><div key={label}><span>{label}</span><b>{money(value)}</b></div>)}</div>;
  };

  const topCategories = useMemo(() => categoryData.map((item) => ({
    ...item,
    share: totals.expenses ? item.value / totals.expenses * 100 : 0
  })), [categoryData, totals.expenses]);

  const previousCategoryTotals = useMemo(() => {
    const grouped = {};
    previousRows.filter((item) => item.type === "expense").forEach((item) => {
      const category = item.category || "Nenurodyta";
      grouped[category] = (grouped[category] || 0) + Number(item.amount);
    });
    return grouped;
  }, [previousRows]);

  const monthlyCategoryRows = useMemo(() => {
    const grouped = {};
    expenseRows.forEach((item) => {
      const category = item.category || "Nenurodyta";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });

    const knownCategories = [...EXPENSE_CATEGORIES];
    Object.keys(grouped).forEach((category) => {
      if (!knownCategories.includes(category)) knownCategories.push(category);
    });

    const rows = knownCategories.map((category) => {
      const operations = (grouped[category] || []).slice().sort((a, b) => b.date.localeCompare(a.date));
      const value = operations.reduce((sum, item) => sum + Number(item.amount), 0);
      const previousValue = previousCategoryTotals[category] || 0;
      const difference = value - previousValue;
      return {
        name: category,
        value,
        previousValue,
        difference,
        change: previousValue ? difference / previousValue * 100 : value ? null : 0,
        share: totals.expenses ? value / totals.expenses * 100 : 0,
        operations
      };
    });

    return rows.sort((a, b) => categorySort === "name"
      ? a.name.localeCompare(b.name, "lt")
      : b.value - a.value || a.name.localeCompare(b.name, "lt"));
  }, [expenseRows, totals.expenses, categorySort, previousCategoryTotals]);

  const largestExpenses = useMemo(() => expenseRows
    .slice()
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10), [expenseRows]);

  const personComparison = useMemo(() => {
    const names = [...people];
    periodRows.forEach((item) => {
      if (item.person && !names.includes(item.person)) names.push(item.person);
    });
    return names.map((name) => {
      const rows = periodRows.filter((item) => item.person === name);
      const income = rows.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
      const expenses = rows.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
      const grouped = {};
      rows.filter((item) => item.type === "expense").forEach((item) => {
        const category = item.category || "Nenurodyta";
        grouped[category] = (grouped[category] || 0) + Number(item.amount);
      });
      const topCategory = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
      return { name, income, expenses, savings: income - expenses, topCategory: topCategory?.[0] || "—" };
    });
  }, [periodRows]);

  const personData = useMemo(() => personComparison.map((item) => ({ name: item.name, value: item.expenses })), [personComparison]);
  const categoriesWithActivity = monthlyCategoryRows.filter((item) => item.value || item.previousValue);
  const biggestIncrease = categoriesWithActivity.slice().sort((a, b) => b.difference - a.difference)[0];
  const biggestDecrease = categoriesWithActivity.slice().sort((a, b) => a.difference - b.difference)[0];
  const [trendCategory, setTrendCategory] = useState("Maistas");
  const categoryTrend12m = useMemo(() => {
    const end = new Date(year, month, 1);
    return Array.from({ length: 12 }, (_, idx) => {
      const d = new Date(end.getFullYear(), end.getMonth() - (11 - idx), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const value = transactions.filter((item) => item.type === "expense" && item.category === trendCategory && ym(item.date) === key).reduce((sum, item) => sum + Number(item.amount), 0);
      return { label: `${MONTHS[d.getMonth()].slice(0,3)} ${String(d.getFullYear()).slice(2)}`, value };
    });
  }, [transactions, trendCategory, year, month]);
  const activeTrendValues = categoryTrend12m.filter((row) => row.value > 0);
  const trendAverage = activeTrendValues.length ? activeTrendValues.reduce((sum,row)=>sum+row.value,0) / activeTrendValues.length : 0;

  const title = periodMode === "year" ? `${year} metų analizė` : `${year} m. ${MONTHS[month].toLowerCase()} analizė`;
  const comparisonLabel = periodMode === "year" ? "palyginti su ankstesniais metais" : "palyginti su ankstesniu mėnesiu";
  const leadingCategory = categoryData[0];

  const summaryText = useMemo(() => {
    const periodName = periodMode === "year" ? `${year} metais` : `${year} m. ${MONTHS[month].toLowerCase()}`;
    const comparison = expenseChange === null
      ? "Ankstesnio laikotarpio palyginimui duomenų nepakanka."
      : `Išlaidos buvo ${Math.abs(expenseChange).toFixed(1)} % ${expenseChange > 0 ? "didesnės" : expenseChange < 0 ? "mažesnės" : "tokios pačios"} nei ankstesniu laikotarpiu.`;
    const categorySentence = leadingCategory
      ? `Daugiausia išleista kategorijai „${leadingCategory.name}“ – ${money(leadingCategory.value)}.`
      : "Išlaidų operacijų šiame laikotarpyje nėra.";
    return `${periodName} gauta ${money(totals.income)}, išleista ${money(totals.expenses)}, sutaupyta ${money(totals.savings)} ir investuota ${money(totals.invested)}. Po investavimo liko ${money(totals.savingsAfterInvestment)}. ${categorySentence} ${comparison}`;
  }, [periodMode, year, month, totals, leadingCategory, expenseChange]);

  const ChangeLabel = ({ value, inverse = false }) => {
    if (value === null) return <small>Nėra ankstesnio laikotarpio duomenų</small>;
    const positive = inverse ? value <= 0 : value >= 0;
    return <small className={positive ? "analytics-change good" : "analytics-change bad"}>{value >= 0 ? "+" : ""}{value.toFixed(1)} % · {comparisonLabel}</small>;
  };

  return (
    <>
      <header className="topbar analytics-header">
        <div><p className="eyebrow">{title}</p><h1>Finansų analitika</h1><p className="subtitle">Išlaidų struktūra, tendencijos ir svarbiausi pasirinkto laikotarpio rodikliai.</p></div>
      </header>

      <section className="card analytics-insight-banner">
        <div><p className="card-kicker">Automatinė laikotarpio santrauka</p><h2>{periodMode === "year" ? `${year} metų rezultatas` : `${MONTHS[month]} ${year}`}</h2></div>
        <p>{summaryText}</p>
      </section>

      <section className="analytics-kpi-grid">
        <Metric tone="income" label="Pajamos" value={money(totals.income)} helper={<ChangeLabel value={incomeChange}/>} icon={<ArrowUpRight/>}/>
        <Metric tone="expense" label="Išlaidos" value={money(totals.expenses)} helper={<ChangeLabel value={expenseChange} inverse/>} icon={<ArrowDownRight/>}/>
        <Metric tone="saving" label="Sutaupyta" value={money(totals.savings)} helper={<ChangeLabel value={savingsChange}/>} icon={<PiggyBank/>}/>
        <Metric tone="investment" label="Investuota" value={money(totals.invested)} helper={<ChangeLabel value={investedChange}/>} icon={<ArrowUpRight/>}/>
        <Metric tone="after-investment" label="Santaupos po investavimo" value={money(totals.savingsAfterInvestment)} helper={<ChangeLabel value={savingsAfterInvestmentChange}/>} icon={<PiggyBank/>}/>
        <Metric tone="budget" label="Taupymo rodiklis" value={`${totals.savingsRate.toFixed(1)} %`} helper="Pajamų dalis po išlaidų" icon={<Gauge/>}/>
        <Metric tone="account" label="Vidutinė dienos išlaida" value={money(averageDailyExpense)} helper={`${daysCovered} laikotarpio dienos`} icon={<CalendarDays/>}/>
        <Metric tone="investment" label="Investavimo rodiklis" value={investmentRate === null ? "—" : `${investmentRate.toFixed(1)} %`} helper={investmentRate === null ? "Laikotarpiu pajamų nėra" : "Pajamų dalis, nukreipta investicijoms"} icon={<ArrowUpRight/>}/>
      </section>

      <section className="analytics-grid-main">
        <article className="card analytics-trend-card cashflow-card">
          <div className="card-header chart-filter-header">
            <div><p className="card-kicker">Pinigų srautai</p><h2>Pinigų srautų dinamika</h2></div>
            <div className="cashflow-controls">
              <div className="chart-view-tabs" aria-label="Grafiko tipas">
                <button className={cashFlowView === "bars" ? "active" : ""} onClick={()=>setCashFlowView("bars")}>Stulpeliai</button>
                <button className={cashFlowView === "lines" ? "active" : ""} onClick={()=>setCashFlowView("lines")}>Linijos</button>
              </div>
              <div className="chart-range-tabs" aria-label="Pinigų srautų grafiko laikotarpis">
                {[["3m","3 mėn."],["6m","6 mėn."],["12m","1 m."],["all","Visi"]].map(([key,label])=><button key={key} className={cashFlowRange===key?"active":""} onClick={()=>setCashFlowRange(key)}>{label}</button>)}
              </div>
            </div>
          </div>
          <div className="cashflow-legend" aria-label="Grafiko legenda">
            <span className="income">Pajamos</span><span className="expenses">Išlaidos</span><span className="savings">Santaupos</span><span className="invested">Investuota</span><span className="after">Po investavimo</span>
          </div>
          <div className="chart-wrap analytics-chart-large cashflow-chart-wrap">
            {cashFlowData.length ? <ResponsiveContainer width="100%" height="100%">
              {cashFlowView === "bars" ? <BarChart data={cashFlowData} barCategoryGap="24%" margin={{top:8,right:12,left:2,bottom:4}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="monthLabel"/><YAxis/><Tooltip content={<CashFlowTooltip/>}/>
                <Bar dataKey="income" name="Pajamos" fill="#10b981" radius={[7,7,0,0]} maxBarSize={34}/>
                <Bar dataKey="expenses" name="Išlaidos" fill="#f97316" radius={[7,7,0,0]} maxBarSize={34}/>
                <Bar dataKey="savings" name="Santaupos" fill="#2563eb" radius={[7,7,0,0]} maxBarSize={34}/>
                <Bar dataKey="invested" name="Investuota" fill="#8b5cf6" radius={[7,7,0,0]} maxBarSize={34}/>
                <Bar dataKey="savingsAfterInvestment" name="Po investavimo" fill="#0891b2" radius={[7,7,0,0]} maxBarSize={34}/>
              </BarChart> : <LineChart data={cashFlowData} margin={{top:8,right:14,left:2,bottom:4}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="monthLabel"/><YAxis/><Tooltip content={<CashFlowTooltip/>}/>
                <Line type="monotone" dataKey="income" name="Pajamos" stroke="#10b981" strokeWidth={3} dot={{r:3}} activeDot={{r:5}}/>
                <Line type="monotone" dataKey="expenses" name="Išlaidos" stroke="#f97316" strokeWidth={3} dot={{r:3}} activeDot={{r:5}}/>
                <Line type="monotone" dataKey="savings" name="Santaupos" stroke="#2563eb" strokeWidth={3} dot={{r:3}} activeDot={{r:5}}/>
                <Line type="monotone" dataKey="invested" name="Investuota" stroke="#8b5cf6" strokeWidth={3} dot={{r:3}} activeDot={{r:5}}/>
                <Line type="monotone" dataKey="savingsAfterInvestment" name="Po investavimo" stroke="#0891b2" strokeWidth={3} dot={{r:3}} activeDot={{r:5}}/>
              </LineChart>}
            </ResponsiveContainer> : <div className="empty-state">Pinigų srautų istorijos dar nėra.</div>}
          </div>
        </article>

        <article className="card analytics-pie-card">
          <div className="card-header"><div><p className="card-kicker">Išlaidų struktūra</p><h2>Pagal kategorijas</h2></div><strong className="analytics-pie-total">{money(totals.expenses)}</strong></div>
          {categoryData.length ? (
            <>
              <div className="analytics-pie-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={2}>
                      {categoryData.map((item, index) => <Cell key={item.name} fill={`hsl(${205 + index * 31} 68% 52%)`}/>)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [money(value), name]}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="analytics-mini-legend analytics-full-legend">
                {topCategories.map((item) => <div key={item.name}><span>{item.name}</span><span className="analytics-legend-values"><b>{money(item.value)}</b><strong>{item.share.toFixed(1)} %</strong></span></div>)}
              </div>
            </>
          ) : <div className="empty-state">Pasirinktam laikotarpiui išlaidų nėra.</div>}
        </article>
      </section>

      <section className="card category-trend-card">
        <div className="card-header chart-filter-header"><div><p className="card-kicker">12 mėnesių tendencija</p><h2>Kategorijos išlaidų istorija</h2></div><div className="category-trend-controls"><select value={trendCategory} onChange={(e)=>setTrendCategory(e.target.value)}>{EXPENSE_CATEGORIES.map((category)=><option key={category} value={category}>{category}</option>)}</select><span>Aktyvių mėn. vidurkis <strong>{money(trendAverage)}</strong></span></div></div>
        <div className="category-trend-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryTrend12m}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis/><Tooltip formatter={money}/><Bar dataKey="value" name={trendCategory} fill="#2563eb" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div>
      </section>

      <section className="card analytics-comparison-card">
        <div className="card-header">
          <div><p className="card-kicker">Laikotarpių palyginimas</p><h2>Kategorijų pokyčiai</h2></div>
          <div className="analytics-comparison-highlights">
            {biggestIncrease?.difference > 0 && <span className="bad">Daugiausia augo: {biggestIncrease.name} {money(biggestIncrease.difference)}</span>}
            {biggestDecrease?.difference < 0 && <span className="good">Daugiausia mažėjo: {biggestDecrease.name} {money(Math.abs(biggestDecrease.difference))}</span>}
          </div>
        </div>
        <div className="analytics-comparison-table-wrap">
          <table className="analytics-comparison-table">
            <thead><tr><th>Kategorija</th><th>Ankstesnis laikotarpis</th><th>Pasirinktas laikotarpis</th><th>Skirtumas</th><th>Pokytis</th></tr></thead>
            <tbody>
              {categoriesWithActivity.map((item) => (
                <tr key={item.name}>
                  <td><strong>{item.name}</strong></td>
                  <td>{money(item.previousValue)}</td>
                  <td>{money(item.value)}</td>
                  <td className={item.difference > 0 ? "trend-bad" : item.difference < 0 ? "trend-good" : ""}>{item.difference > 0 ? "+" : ""}{money(item.difference)}</td>
                  <td>{item.change === null ? "Nauja" : `${item.change > 0 ? "+" : ""}${item.change.toFixed(1)} %`}</td>
                </tr>
              ))}
              {!categoriesWithActivity.length && <tr><td colSpan="5"><div className="empty-state">Palyginimui duomenų nėra.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card analytics-category-summary-card">
        <div className="card-header analytics-category-summary-header">
          <div>
            <p className="card-kicker">{periodMode === "year" ? `${year} metų kategorijos` : `${MONTHS[month]} ${year}`}</p>
            <h2>Visų išlaidų kategorijų suvestinė</h2>
          </div>
          <label className="analytics-sort-label">
            Rikiuoti
            <select value={categorySort} onChange={(event) => setCategorySort(event.target.value)}>
              <option value="amount">Pagal sumą</option>
              <option value="name">Pagal pavadinimą</option>
            </select>
          </label>
        </div>

        <div className="analytics-category-table-wrap">
          <table className="analytics-category-table">
            <thead><tr><th>Kategorija</th><th>Operacijos</th><th>Suma</th><th>% nuo išlaidų</th></tr></thead>
            <tbody>
              {monthlyCategoryRows.map((item) => {
                const isOpen = expandedCategory === item.name;
                return (
                  <Fragment key={item.name}>
                    <tr className={item.operations.length ? "clickable" : "muted"} onClick={() => item.operations.length && setExpandedCategory(isOpen ? null : item.name)}>
                      <td><div className="analytics-category-name"><ArrowRight size={16} className={isOpen ? "open" : ""}/><strong>{item.name}</strong></div></td>
                      <td>{item.operations.length}</td>
                      <td className="money-cell">{money(item.value)}</td>
                      <td><div className="analytics-share-cell"><span>{item.share.toFixed(1)} %</span><div><i style={{ width: `${Math.max(0, item.share)}%` }}/></div></div></td>
                    </tr>
                    {isOpen && (
                      <tr className="analytics-category-details-row"><td colSpan="4"><div className="analytics-category-operations">
                        {item.operations.map((operation) => <div key={operation.id}><span>{dateLt(operation.date)}</span><strong>{operation.description || "Be aprašymo"}</strong><small>{operation.person || "Nenurodyta"}</small><b>{money(operation.amount)}</b></div>)}
                      </div></td></tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot><tr><td><strong>Iš viso</strong></td><td>{expenseRows.length}</td><td className="money-cell"><strong>{money(totals.expenses)}</strong></td><td><strong>{totals.expenses ? "100,0 %" : "0,0 %"}</strong></td></tr></tfoot>
          </table>
        </div>
      </section>

      <section className="analytics-grid-secondary">
        <article className="card">
          <div className="card-header"><div><p className="card-kicker">TOP kategorijos</p><h2>Kur išleidžiama daugiausia</h2></div></div>
          <div className="analytics-category-list">
            {topCategories.map((item, index) => <div className="analytics-category-row" key={item.name}><div className="analytics-rank">{index + 1}</div><div className="analytics-category-content"><div><strong>{item.name}</strong><span>{money(item.value)} · {item.share.toFixed(1)} %</span></div><div className="analytics-bar"><span style={{ width: `${Math.max(3, item.share)}%` }}/></div></div></div>)}
            {!topCategories.length && <div className="empty-state">Nėra duomenų.</div>}
          </div>
        </article>

        <article className="card">
          <div className="card-header"><div><p className="card-kicker">Didžiausios išlaidos</p><h2>TOP 10 operacijų</h2></div></div>
          <div className="analytics-largest-list">
            {largestExpenses.map((item, index) => <div className="analytics-largest-row" key={item.id}><span className="analytics-rank">{index + 1}</span><div><strong>{item.description}</strong><span>{item.category} · {item.person || "Nenurodyta"} · {dateLt(item.date)}</span></div><b>{money(item.amount)}</b></div>)}
            {!largestExpenses.length && <div className="empty-state">Nėra duomenų.</div>}
          </div>
        </article>
      </section>

      <section className="card analytics-person-comparison-card">
        <div className="card-header"><div><p className="card-kicker">Šeimos palyginimas</p><h2>Evaldas ir Rima</h2></div></div>
        <div className="analytics-person-cards">
          {personComparison.map((item) => (
            <article key={item.name}>
              <div className="analytics-person-title"><span>{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>Didžiausia kategorija: {item.topCategory}</small></div></div>
              <div className="analytics-person-stats"><div><span>Pajamos</span><strong>{money(item.income)}</strong></div><div><span>Išlaidos</span><strong>{money(item.expenses)}</strong></div><div><span>Rezultatas</span><strong className={item.savings >= 0 ? "positive-value" : "negative-value"}>{money(item.savings)}</strong></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="analytics-grid-bottom">
        <article className="card">
          <div className="card-header"><div><p className="card-kicker">Šeimos pjūvis</p><h2>Išlaidos pagal asmenį</h2></div></div>
          <div className="chart-wrap analytics-person-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={personData} layout="vertical" margin={{ left: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number"/><YAxis type="category" dataKey="name" width={90}/><Tooltip formatter={money}/><Bar dataKey="value" name="Išlaidos" fill="#2563eb" radius={[0,7,7,0]}/></BarChart></ResponsiveContainer></div>
        </article>

        <article className="card analytics-summary-card">
          <div><p className="card-kicker">Laikotarpio santrauka</p><h2>Operacijų aktyvumas</h2></div>
          <div className="analytics-summary-values">
            <div><span>Visos operacijos</span><strong>{periodRows.filter((item) => item.type !== "transfer").length}</strong></div>
            <div><span>Pajamų operacijos</span><strong>{incomeRows.length}</strong></div>
            <div><span>Išlaidų operacijos</span><strong>{expenseRows.length}</strong></div>
            <div><span>Didžiausia išlaida</span><strong>{money(largestExpenses[0]?.amount || 0)}</strong></div>
          </div>
        </article>
      </section>
    </>
  );
}

function BudgetsCenter({ rows, summary, periodKey, onNew, onCopy, onEdit, onDelete }) {
  return (
    <>
      <header className="topbar">
        <div><p className="eyebrow">{periodKey}</p><h1>Biudžetų centras</h1><p className="subtitle">Kategorijų limitai, progresas ir mėnesio prognozė.</p></div>
        <div className="topbar-actions">
          <button className="secondary-button" onClick={onCopy}><Copy size={17}/>Kopijuoti ankstesnį mėnesį</button>
          <button className="primary-button" onClick={onNew}><Plus size={18}/>Naujas biudžetas</button>
        </div>
      </header>

      <section className="metrics-grid five">
        <Metric label="Bendras biudžetas" value={money(summary.limit)} helper="Visų kategorijų limitas" icon={<WalletCards/>}/>
        <Metric label="Panaudota" value={money(summary.spent)} helper={`${summary.percentage.toFixed(1)} % biudžeto`} icon={<Gauge/>}/>
        <Metric label="Liko" value={money(summary.remaining)} helper="Iki mėnesio limito" icon={<PiggyBank/>}/>
        <Metric label="Perspėjimai" value={summary.exceeded + summary.warning} helper={`${summary.exceeded} viršyti · ${summary.warning} arti ribos`} icon={<AlertTriangle/>}/>
      </section>

      {!rows.length ? (
        <section className="card budget-empty">
          <div className="budget-empty-icon"><Gauge size={30}/></div>
          <h2>Šiam mėnesiui biudžetai dar nenustatyti</h2>
          <p>Pridėkite pirmą kategorijos limitą arba nukopijuokite ankstesnio mėnesio biudžetus.</p>
          <button className="primary-button" onClick={onNew}><Plus size={18}/>Pridėti pirmą biudžetą</button>
        </section>
      ) : (
        <section className="budget-list">
          {rows.map((row) => {
            const status = row.percentage > 100 ? "danger" : row.percentage >= 80 ? "warning" : "good";
            return (
              <article className={`card budget-row ${status}`} key={row.id}>
                <div className="budget-row-main">
                  <div className={`budget-status-icon ${status}`}>
                    {status === "good" ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>}
                  </div>
                  <div className="budget-info">
                    <div className="budget-title-line">
                      <div><h2>{row.category}</h2><span>{money(row.spent)} iš {money(row.limit)}</span></div>
                      <strong>{row.percentage.toFixed(0)} %</strong>
                    </div>
                    <ProgressBar percentage={row.percentage}/>
                    <div className="budget-meta">
                      <span>Liko: <strong className={row.remaining < 0 ? "danger-text" : ""}>{money(row.remaining)}</strong></span>
                      <span>Prognozė mėnesio pabaigai: <strong>{money(row.projected)}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="row-actions">
                  <button title="Redaguoti" onClick={() => onEdit(row)}><Pencil size={16}/></button>
                  <button title="Ištrinti" className="danger" onClick={() => onDelete(row)}><Trash2 size={16}/></button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}

function ProgressBar({ percentage }) {
  const width = Math.min(Math.max(percentage, 0), 100);
  const state = percentage > 100 ? "danger" : percentage >= 80 ? "warning" : "good";
  return <div className={`budget-progress ${state}`}><span style={{ width: `${width}%` }}/></div>;
}

function TransactionsCenter({ transactions, financialAccounts, periodMode, year, month, onNew, onEdit, onDuplicate, onDelete }) {
  const periodDates = useMemo(() => {
    if (periodMode === "year") {
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    const monthNumber = String(month + 1).padStart(2, "0");
    const lastDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, "0");
    return { from: `${year}-${monthNumber}-01`, to: `${year}-${monthNumber}-${lastDay}` };
  }, [periodMode, year, month]);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState(periodDates.from);
  const [to, setTo] = useState(periodDates.to);
  const [type, setType] = useState("all");
  const [person, setPerson] = useState("all");
  const [account, setAccount] = useState("all");
  const [category, setCategory] = useState("all");
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    setFrom(periodDates.from);
    setTo(periodDates.to);
  }, [periodDates]);

  useEffect(() => {
    setVisibleCount(50);
    setExpandedNoteId(null);
  }, [query, from, to, type, person, account, category]);

  function getOperationNote(item) {
    return String(item.notes || item.note || item.details || item.longDescription || "").trim();
  }

  const filtered = useMemo(() => transactions.filter((item) => {
    const haystack = `${item.description} ${item.notes || ""} ${item.category || ""} ${item.person || ""} ${item.account || ""} ${item.fromAccount || ""} ${item.toAccount || ""} ${item.investmentName || ""} ${item.investmentInstitution || ""}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) &&
      (!from || item.date >= from) && (!to || item.date <= to) &&
      (type === "all" || item.type === type) &&
      (person === "all" || item.person === person) &&
      (account === "all" || item.accountId === account || item.fromAccountId === account || item.toAccountId === account || item.account === account || item.fromAccount === account || item.toAccount === account) &&
      (category === "all" || item.category === category);
  }).sort((a,b) => b.date.localeCompare(a.date)), [transactions, query, from, to, type, person, account, category]);

  const visibleTransactions = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMoreTransactions = visibleCount < filtered.length;
  const periodLabel = periodMode === "year" ? `${year} metai` : `${MONTHS[month]} ${year}`;

  const summary = useMemo(() => {
    const income = filtered.filter((i) => i.type === "income").reduce((s,i) => s + Number(i.amount), 0);
    const expenses = filtered.filter((i) => i.type === "expense").reduce((s,i) => s + Number(i.amount), 0);
    const transfers = filtered.filter((i) => i.type === "transfer").reduce((s,i) => s + Number(i.amount), 0);
    const investments = filtered.filter((i) => i.type === "investment").reduce((s,i) => s + Number(i.amount), 0);
    return { income, expenses, transfers, investments, balance: income - expenses };
  }, [filtered]);

  function exportCsv() {
    const header = ["Data","Tipas","Aprašymas","Pastabos","Kategorija","Asmuo","Sąskaita","Iš","Į","Suma"];
    const rows = filtered.map((i) => [i.date, i.type, i.description, i.notes || "", i.category || "", i.person || "", i.account || "", i.fromAccount || "", i.toAccount || "", i.amount]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "seimos-finansai-operacijos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <header className="topbar">
        <div><p className="eyebrow">Operacijų centras V2.0.1</p><h1>Operacijų centras</h1><p className="subtitle">Paieška, filtrai ir operacijų valdymas.</p></div>
        <button className="primary-button" onClick={onNew}><Plus size={18}/>Nauja operacija</button>
      </header>
      <section className="metrics-grid five">
        <Metric label="Pajamos" value={money(summary.income)} helper="Pagal filtrus" icon={<ArrowUpRight/>}/>
        <Metric label="Išlaidos" value={money(summary.expenses)} helper="Pagal filtrus" icon={<ArrowDownRight/>}/>
        <Metric label="Perkėlimai" value={money(summary.transfers)} helper="Tarp paskyrų" icon={<ArrowRightLeft/>}/>
        <Metric label="Investuota" value={money(summary.investments)} helper="Investavimo operacijos" icon={<PiggyBank/>}/>
        <Metric label="Balansas" value={money(summary.balance)} helper={`${filtered.length} operacijos`} icon={<WalletCards/>}/>
      </section>
      <section className="card filters-card">
        <div className="search-box"><Search size={18}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Ieškoti Lidl, atlyginimo, kategorijos..."/></div>
        <div className="filters-grid">
          <label>Nuo<input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></label>
          <label>Iki<input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></label>
          <label>Tipas<select value={type} onChange={(e)=>setType(e.target.value)}><option value="all">Visos</option><option value="income">Pajamos</option><option value="expense">Išlaidos</option><option value="transfer">Perkėlimai</option><option value="investment">Investavimas</option></select></label>
          <label>Asmuo<select value={person} onChange={(e)=>setPerson(e.target.value)}><option value="all">Visi</option>{people.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Paskyra<select value={account} onChange={(e)=>setAccount(e.target.value)}><option value="all">Visos</option>{financialAccounts.map((item)=><option key={item.id} value={item.id}>{item.name} · {item.owner}</option>)}</select></label>
          <label>Kategorija<select value={category} onChange={(e)=>setCategory(e.target.value)}><option value="all">Visos</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
        </div>
      </section>
      <section className="card operations-table-card">
        <div className="card-header">
          <div>
            <p className="card-kicker">Operacijų sąrašas · {periodLabel}</p>
            <h2>{filtered.length} įrašai</h2>
            {filtered.length > 0 && <p className="operations-visible-count">Rodoma {visibleTransactions.length} iš {filtered.length} operacijų</p>}
          </div>
          <button className="secondary-button" onClick={exportCsv}><Download size={17}/>Eksportuoti CSV</button>
        </div>
        <div className="table-scroll">
          <table className="operations-table">
            <thead><tr><th>Data</th><th>Kategorija / kryptis</th><th>Aprašymas</th><th>Asmuo</th><th>Sąskaita</th><th>Suma</th><th>Veiksmai</th></tr></thead>
            <tbody>{visibleTransactions.map(item => {
              const operationNote = getOperationNote(item);
              const noteOpen = expandedNoteId === item.id;
              return (
                <Fragment key={item.id}>
                  <tr>
                    <td>{dateLt(item.date)}</td>
                    <td>
                      <div className="operation-category">
                        <span className="operation-category-icon" aria-hidden="true">
                          {item.type === "transfer" ? "↔️" : item.type === "investment" ? "📈" : categoryEmoji(item.category)}
                        </span>
                        <strong>{item.type === "transfer" ? `${item.fromAccount} → ${item.toAccount}` : item.type === "investment" ? (item.investmentName || "Investicija") : item.category}</strong>
                      </div>
                      <span>{item.type === "income" ? "Pajamos" : item.type === "expense" ? "Išlaidos" : item.type === "investment" ? "Investavimas" : "Perkėlimas"}</span>
                    </td>
                    <td>
                      <div className="operation-description">
                        <span className="operation-description-text">{item.description || "—"}</span>
                        {operationNote && (
                          <button
                            type="button"
                            className={`note-indicator ${noteOpen ? "active" : ""}`}
                            title={operationNote}
                            aria-expanded={noteOpen}
                            aria-controls={`operation-note-${item.id}`}
                            onClick={() => setExpandedNoteId(noteOpen ? null : item.id)}
                          >
                            <MessageSquareText size={15}/>
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{item.person || "—"}</td>
                    <td>{item.type === "transfer" ? "—" : item.account}</td>
                    <td className={`amount-cell ${item.type}`}>{item.type === "income" ? "+" : item.type === "expense" || item.type === "investment" ? "-" : ""}{money(item.amount)}</td>
                    <td><div className="row-actions"><button title="Redaguoti" onClick={()=>onEdit(item)}><Pencil size={16}/></button><button title="Dubliuoti" onClick={()=>onDuplicate(item)}><Copy size={16}/></button><button title="Ištrinti" className="danger" onClick={()=>onDelete(item)}><Trash2 size={16}/></button></div></td>
                  </tr>
                  {operationNote && noteOpen && (
                    <tr className="operation-note-row" id={`operation-note-${item.id}`}>
                      <td></td>
                      <td colSpan="6">
                        <div className="operation-note-panel">
                          <MessageSquareText size={17}/>
                          <div><strong>Papildoma informacija</strong><p>{operationNote}</p></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}</tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">Pagal pasirinktus filtrus operacijų nerasta.</div>}
        </div>
        {filtered.length > 0 && (
          <div className="operations-load-more">
            {hasMoreTransactions ? (
              <button className="secondary-button load-more-button" onClick={() => setVisibleCount((count) => count + 50)}>
                Rodyti dar {Math.min(50, filtered.length - visibleCount)}
              </button>
            ) : (
              <span>Rodomos visos {filtered.length} operacijos</span>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function assetStatus(asset) {
  if (asset.type !== "deposit" || !asset.endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${asset.endDate}T00:00:00`);
  const days = Math.ceil((end - today) / 86400000);
  if (days < 0) return { label: "Pasibaigęs", className: "ended" };
  if (days <= 30) return { label: `Baigsis po ${days} d.`, className: "warning" };
  return { label: "Aktyvus", className: "active" };
}

function Assets({ assets, summary, chartData, history, year, onNew, onEdit, onDuplicate, onDelete }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("value-desc");

  const filteredAssets = useMemo(() => {
    const rows = assets.filter((asset) => asset.type === "deposit").filter((asset) => {
      const haystack = `${asset.name} ${asset.institution} ${asset.owner} ${asset.notes || ""}`.toLowerCase();
      return !query || haystack.includes(query.toLowerCase());
    });

    return rows.sort((a, b) => {
      if (sortBy === "value-desc") return Number(b.amount) - Number(a.amount);
      if (sortBy === "value-asc") return Number(a.amount) - Number(b.amount);
      if (sortBy === "date-desc") return (b.valueDate || "").localeCompare(a.valueDate || "");
      if (sortBy === "date-asc") return (a.valueDate || "").localeCompare(b.valueDate || "");
      if (sortBy === "name") return a.name.localeCompare(b.name, "lt");
      if (sortBy === "institution") return (a.institution || "").localeCompare(b.institution || "", "lt");
      return 0;
    });
  }, [assets, query, sortBy]);

  return (
    <>
      <header className="topbar"><div><p className="eyebrow">Indėlių modulis V2.4.2</p><h1>Šeimos indėliai</h1><p className="subtitle">Terminuotieji indėliai, jų terminai ir prognozuojamos palūkanos.</p></div><button className="primary-button" onClick={onNew}><Plus size={18}/>Pridėti indėlį</button></header>
      <section className="metrics-grid three">
        <Metric label="Indėlių vertė" value={money(summary.depositTotal)} helper="Bendra aktyvių įrašų suma" icon={<WalletCards/>}/>
        <Metric label="Indėlių skaičius" value={String(summary.deposits.length)} helper="Visi indėlių įrašai" icon={<PiggyBank/>}/>
        <Metric label="Prognozuojamos palūkanos" value={money(summary.interest)} helper="Iki terminų pabaigos" icon={<ArrowUpRight/>}/>
      </section>
      <section className="dashboard-grid">
        <ChartCard title="Indėliai pagal savininką">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>{chartData.map((item,index)=><Cell key={item.name} fill={`hsl(${205+index*34} 68% 52%)`}/>)}</Pie><Tooltip formatter={money}/><Legend/></PieChart></ResponsiveContainer> : <div className="chart-empty">Pridėjus indėlį čia bus rodoma jo dalis.</div>}</ChartCard>
        <ChartCard title={`${year} m. aktyvių indėlių vertė`}><ResponsiveContainer width="100%" height="100%"><BarChart data={history}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={money}/><Bar dataKey="value" name="Indėliai" fill="#2563eb" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      </section>
      <section className="card asset-filters-card">
        <div className="search-box"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ieškoti pagal pavadinimą, banką ar savininką..."/></div>
        <div className="asset-filter-row single-filter">
          <label>Rūšiavimas<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="value-desc">Vertė: nuo didžiausios</option><option value="value-asc">Vertė: nuo mažiausios</option><option value="date-desc">Naujausia vertės data</option><option value="date-asc">Seniausia vertės data</option><option value="name">Pavadinimas A–Ž</option><option value="institution">Įstaiga A–Ž</option></select></label>
        </div>
      </section>
      <section className="card assets-table-card">
        <div className="card-header"><div><p className="card-kicker">INDĖLIŲ ĮRAŠAI</p><h2>Visa indėlių informacija</h2></div><span className="row-count">{filteredAssets.length} įrašai</span></div>
        <div className="table-scroll"><table className="assets-table asset-actions-table"><thead><tr><th>Pavadinimas</th><th>Įstaiga</th><th>Savininkas</th><th>Vertė</th><th>Vertės data</th><th>Palūkanos</th><th>Pradžia</th><th>Pabaiga / būsena</th><th>Veiksmai</th></tr></thead><tbody>{filteredAssets.map((asset) => {
          const status = assetStatus(asset);
          return <tr key={asset.id}><td><strong>{asset.name}</strong><span>{asset.notes || ""}</span></td><td>{asset.institution || "—"}</td><td>{asset.owner}</td><td className="money-cell">{money(asset.amount)}</td><td>{dateLt(asset.valueDate)}</td><td>{Number(asset.interestRate || 0).toFixed(2)} %</td><td>{dateLt(asset.startDate)}</td><td><span>{dateLt(asset.endDate)}</span>{status && <span className={`status-badge ${status.className}`}>{status.label}</span>}</td><td><div className="row-actions"><button title="Redaguoti" onClick={() => onEdit(asset)}><Pencil size={16}/></button><button title="Dubliuoti" onClick={() => onDuplicate(asset)}><Copy size={16}/></button><button title="Ištrinti" className="danger" onClick={() => onDelete(asset)}><Trash2 size={16}/></button></div></td></tr>;
        })}</tbody></table>{!filteredAssets.length && <div className="empty-state">Indėlių įrašų nerasta.</div>}</div>
      </section>
    </>
  );
}

function Investments({ data, history, snapshots, transactions, year, month, periodMode, onNewSnapshot, onEditSnapshot, onDeleteSnapshot, onNewOperation, onEditOperation, onDuplicateOperation, onDeleteOperation }) {
  const [chartRange, setChartRange] = useState("12m");
  const investmentOperations = transactions
    .filter((item) => item.type === "investment")
    .filter((item) => periodMode === "year" ? item.date?.startsWith(String(year)) : ym(item.date) === `${year}-${String(month + 1).padStart(2, "0")}`)
    .sort((a, b) => b.date.localeCompare(a.date));
  const investedInPeriod = investmentOperations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const sortedSnapshots = [...snapshots].sort((a, b) => String(a.monthKey).localeCompare(String(b.monthKey)));
  const latest = sortedSnapshots[sortedSnapshots.length - 1];
  const latestEvaldas = Number(latest?.evaldas || 0);
  const latestRima = Number(latest?.rima || 0);
  const latestTotal = latest?.evaldas == null && latest?.rima == null ? Number(latest?.value || 0) : latestEvaldas + latestRima;
  const hasContributionData = latest && latest.evaldasContributed != null && latest.rimaContributed != null;
  const contributedCapital = hasContributionData ? Number(latest.evaldasContributed || 0) + Number(latest.rimaContributed || 0) : null;
  const investmentResult = contributedCapital == null ? null : latestTotal - contributedCapital;
  const investmentResultPct = contributedCapital > 0 ? investmentResult / contributedCapital * 100 : null;
  const investmentChartAll = sortedSnapshots.map((row) => {
    const evaldas = Number(row.evaldas || 0);
    const rima = Number(row.rima || 0);
    const total = row.evaldas == null && row.rima == null ? Number(row.value || 0) : evaldas + rima;
    const [y, m] = String(row.monthKey || "").split("-");
    const hasContributed = row.evaldasContributed != null && row.rimaContributed != null;
    const contributedTotal = hasContributed ? Number(row.evaldasContributed || 0) + Number(row.rimaContributed || 0) : null;
    return { ...row, label: `${MONTHS[Number(m)-1]?.slice(0,3) || m} ${String(y).slice(2)}`, evaldas, rima, total, contributedTotal };
  });
  const rangeCount = chartRange === "3m" ? 3 : chartRange === "6m" ? 6 : chartRange === "12m" ? 12 : null;
  const investmentChartData = rangeCount ? investmentChartAll.slice(-rangeCount) : investmentChartAll;

  return <>
    <header className="topbar">
      <div><p className="eyebrow">Investicijų modulis V2.6.1</p><h1>Šeimos investicijos</h1><p className="subtitle">Evaldo ir Rimos portfelio vertė bei faktinė mėnesio pabaigos istorija.</p></div>
      <div className="topbar-actions"><button className="secondary-button" onClick={onNewOperation}><Plus size={18}/>Investavimo operacija</button><button className="primary-button" onClick={onNewSnapshot}><Plus size={18}/>Mėnesio vertė</button></div>
    </header>

    <section className="metrics-grid six investment-kpis">
      <Metric tone="saving" label="Bendra portfelio vertė" value={money(latestTotal)} helper={latest ? `Pagal ${latest.monthKey} įrašą` : "Istorinių įrašų nėra"} icon={<PiggyBank/>}/>
      <Metric label="Evaldas" value={money(latestEvaldas)} helper={latestTotal ? `${(latestEvaldas / latestTotal * 100).toFixed(1)} % portfelio` : "Nėra duomenų"} icon={<WalletCards/>}/>
      <Metric label="Rima" value={money(latestRima)} helper={latestTotal ? `${(latestRima / latestTotal * 100).toFixed(1)} % portfelio` : "Nėra duomenų"} icon={<WalletCards/>}/>
      <Metric label="Investuota laikotarpiu" value={money(investedInPeriod)} helper={`${investmentOperations.length} operacijos`} icon={<ArrowUpRight/>}/>
      <Metric tone="investment" label="Įneštas kapitalas" value={contributedCapital == null ? "—" : money(contributedCapital)} helper={contributedCapital == null ? "Įveskite kartu su mėnesio verte" : "Grynasis įneštas kapitalas iki mėnesio pabaigos"} icon={<ArrowUpRight/>}/>
      <Metric tone="saving" label="Investicijų rezultatas" value={investmentResult == null ? "—" : money(investmentResult)} helper={investmentResultPct == null ? (contributedCapital == null ? "Trūksta įnešto kapitalo" : "Rezultatas nuo įnešto kapitalo") : `${investmentResultPct >= 0 ? "+" : ""}${investmentResultPct.toFixed(1)} % nuo įnešto kapitalo`} icon={<PiggyBank/>}/>
    </section>

    <section className="card investment-history-chart-card">
      <div className="card-header chart-filter-header"><div><p className="card-kicker">MĖNESIO PABAIGOS VERTĖS</p><h2>Investicijų dinamika</h2></div><div className="chart-header-actions"><div className="chart-range-tabs" aria-label="Investicijų grafiko laikotarpis">{[["3m","3 mėn."],["6m","6 mėn."],["12m","1 m."],["all","Visi"]].map(([key,label])=><button key={key} className={chartRange===key?"active":""} onClick={()=>setChartRange(key)}>{label}</button>)}</div><button className="secondary-button" onClick={onNewSnapshot}><Plus size={16}/> Naujas įrašas</button></div></div>
      <div className="investment-history-chart">
        {investmentChartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={investmentChartData} margin={{top:16,right:18,left:4,bottom:4}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis/><Tooltip formatter={money}/><Legend/><Line type="monotone" dataKey="evaldas" name="Evaldas" stroke="#2563eb" strokeWidth={3} dot={{r:4}} activeDot={{r:6}}/><Line type="monotone" dataKey="rima" name="Rima" stroke="#a21caf" strokeWidth={3} dot={{r:4}} activeDot={{r:6}}/><Line type="monotone" dataKey="total" name="Bendra vertė" stroke="#0891b2" strokeWidth={4} dot={{r:4}} activeDot={{r:7}}/><Line type="monotone" dataKey="contributedTotal" name="Įneštas kapitalas" stroke="#64748b" strokeWidth={2.5} strokeDasharray="7 5" dot={{r:3}} connectNulls={false}/></LineChart></ResponsiveContainer> : <div className="networth-empty"><PiggyBank size={34}/><strong>Istorinių investicijų duomenų dar nėra</strong><span>Įrašykite Evaldo ir Rimos portfelio vertes. Bendra suma bus apskaičiuota automatiškai.</span><button className="secondary-button" onClick={onNewSnapshot}><Plus size={16}/> Pridėti pirmą įrašą</button></div>}
      </div>
    </section>

    <section className="card networth-history-card">
      <div className="card-header"><div><p className="card-kicker">MĖNESIO PABAIGOS ĮRAŠAI</p><h2>{year} m. investicijų istorija</h2></div></div>
      {snapshots.filter((row) => String(row.monthKey || "").startsWith(String(year))).length ? <div className="table-scroll"><table className="operations-table"><thead><tr><th>Mėnuo</th><th>Evaldo vertė</th><th>Evaldo kapitalas</th><th>Rimos vertė</th><th>Rimos kapitalas</th><th>Bendra vertė</th><th>Rezultatas</th><th>Veiksmai</th></tr></thead><tbody>{[...snapshots].filter((row) => String(row.monthKey || "").startsWith(String(year))).sort((a,b)=>b.monthKey.localeCompare(a.monthKey)).map((row)=>{
        const evaldas = Number(row.evaldas || 0);
        const rima = Number(row.rima || 0);
        const total = row.evaldas == null && row.rima == null ? Number(row.value || 0) : evaldas + rima;
        const hasContributed = row.evaldasContributed != null && row.rimaContributed != null;
        const evaldasContributed = hasContributed ? Number(row.evaldasContributed || 0) : null;
        const rimaContributed = hasContributed ? Number(row.rimaContributed || 0) : null;
        const contributed = hasContributed ? evaldasContributed + rimaContributed : null;
        const result = contributed == null ? null : total - contributed;
        return <tr key={row.id}><td><strong>{MONTHS[Number(row.monthKey.slice(5,7))-1]} {row.monthKey.slice(0,4)}</strong></td><td className="money-cell">{money(evaldas)}</td><td className="money-cell">{evaldasContributed == null ? "—" : money(evaldasContributed)}</td><td className="money-cell">{money(rima)}</td><td className="money-cell">{rimaContributed == null ? "—" : money(rimaContributed)}</td><td className="money-cell"><strong>{money(total)}</strong></td><td className={`money-cell ${result == null ? "" : result >= 0 ? "positive-value" : "negative-value"}`}>{result == null ? "—" : money(result)}</td><td><div className="row-actions"><button title="Redaguoti" onClick={()=>onEditSnapshot(row)}><Pencil size={16}/></button><button className="danger" title="Ištrinti" onClick={()=>onDeleteSnapshot(row)}><Trash2 size={16}/></button></div></td></tr>;
      })}</tbody></table></div> : <div className="empty-state">Šiems metams investicijų vertės įrašų dar nėra.</div>}
    </section>

    <section className="card investment-operations-card">
      <div className="card-header"><div><p className="card-kicker">Investavimo srautai</p><h2>Investavimo operacijos</h2></div><button className="secondary-button" onClick={onNewOperation}><Plus size={17}/>Nauja operacija</button></div>
      <div className="table-scroll"><table className="operations-table investment-operations-table"><thead><tr><th>Data</th><th>Investicija</th><th>Aprašymas</th><th>Asmuo</th><th>Iš paskyros</th><th>Suma</th><th>Veiksmai</th></tr></thead><tbody>{investmentOperations.map((item)=><tr key={item.id}><td>{dateLt(item.date)}</td><td><strong>{item.investmentName || "Investicija"}</strong><span>{item.investmentInstitution || ""}</span></td><td>{item.description}</td><td>{item.person || "—"}</td><td>{item.account || "—"}</td><td className="amount-cell investment">{money(item.amount)}</td><td><div className="row-actions"><button title="Redaguoti" onClick={()=>onEditOperation(item)}><Pencil size={16}/></button><button title="Dubliuoti" onClick={()=>onDuplicateOperation(item)}><Copy size={16}/></button><button title="Ištrinti" className="danger" onClick={()=>onDeleteOperation(item)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!investmentOperations.length && <div className="empty-state">Pasirinktu laikotarpiu investavimo operacijų nėra.</div>}</div>
    </section>
  </>;
}

function NetWorth({ data, year, snapshots, onNewSnapshot, onEditSnapshot, onDeleteSnapshot, onAccounts, onAssets, onInvestments }) {
  const [chartRange, setChartRange] = useState("12m");
  const allHistory = [...snapshots].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const latestSaved = allHistory[allHistory.length - 1];
  const previousSaved = allHistory[allHistory.length - 2];
  const snapshotValue = (row) => {
    if (!row) return null;
    const deposits = Number(row.deposits ?? row.otherAssets ?? 0);
    const otherAssets = row.deposits == null ? 0 : Number(row.otherAssets || 0);
    return Number(row.financialAccounts || 0) + deposits + Number(row.investments || 0) + otherAssets - Number(row.liabilities || 0);
  };
  const latestValue = snapshotValue(latestSaved);
  const previousValue = snapshotValue(previousSaved);
  const change = latestValue !== null && previousValue !== null ? latestValue - previousValue : null;
  const yearHistoryAsc = allHistory.filter((row) => row.monthKey.startsWith(String(year)));
  const yearStartValue = snapshotValue(yearHistoryAsc[0]);
  const yearLatestValue = snapshotValue(yearHistoryAsc[yearHistoryAsc.length - 1]);
  const ytdChange = yearStartValue !== null && yearLatestValue !== null ? yearLatestValue - yearStartValue : null;
  const ytdPct = yearStartValue ? ytdChange / yearStartValue * 100 : null;
  const yearRows = allHistory.filter((row) => row.monthKey.startsWith(String(year))).reverse();
  const netWorthChartAll = allHistory.map((row) => {
    const [y, m] = String(row.monthKey || "").split("-");
    return { ...row, label: `${MONTHS[Number(m)-1]?.slice(0,3) || m} ${String(y).slice(2)}`, value: snapshotValue(row) };
  });
  const rangeCount = chartRange === "3m" ? 3 : chartRange === "6m" ? 6 : chartRange === "12m" ? 12 : null;
  const netWorthChartData = rangeCount ? netWorthChartAll.slice(-rangeCount) : netWorthChartAll;
  return <>
    <header className="topbar">
      <div><p className="eyebrow">V2.6 · Net Worth Intelligence</p><h1>Grynasis turtas</h1><p className="subtitle">Dabartinė turto vertė ir tikrais mėnesio pabaigos įrašais paremta istorija.</p></div>
      <button className="primary-button" onClick={onNewSnapshot}><Plus size={18}/> Užfiksuoti mėnesį</button>
    </header>

    <section className="networth-hero">
      <div><p className="card-kicker">BENDRA GRYNOJI VERTĖ ŠIANDIEN</p><strong>{money(data.netWorth)}</strong>{change === null ? <span>Istorinis pokytis bus rodomas sukaupus bent 2 mėnesius.</span> : <span className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "▲" : "▼"} {money(Math.abs(change))} tarp paskutinių įrašų</span>}</div>
      <div className="networth-formula"><span>Turtas</span><b>{money(data.positiveAccounts + data.deposits + data.investments + data.otherAssets)}</b><span>Įsipareigojimai</span><b>− {money(data.liabilities)}</b></div>
    </section>

    <section className="networth-change-strip">
      <div><span>Paskutinio mėnesio pokytis</span><strong className={change == null ? "" : change >= 0 ? "positive" : "negative"}>{change == null ? "—" : `${change >= 0 ? "+" : "−"}${money(Math.abs(change))}`}</strong></div>
      <div><span>{year} YTD pokytis</span><strong className={ytdChange == null ? "" : ytdChange >= 0 ? "positive" : "negative"}>{ytdChange == null ? "—" : `${ytdChange >= 0 ? "+" : "−"}${money(Math.abs(ytdChange))}`}</strong></div>
      <div><span>{year} YTD</span><strong className={ytdPct == null ? "" : ytdPct >= 0 ? "positive" : "negative"}>{ytdPct == null ? "—" : `${ytdPct >= 0 ? "+" : ""}${ytdPct.toFixed(1)} %`}</strong></div>
      <div><span>Istorijos įrašų</span><strong>{allHistory.length}</strong></div>
    </section>

    <section className="metrics-grid five">
      <Metric tone="account" label="Finansinės paskyros" value={money(data.positiveAccounts)} helper="Bankai ir grynieji" icon={<WalletCards/>} onClick={onAccounts}/>
      <Metric label="Indėliai" value={money(data.deposits)} helper="Terminuotųjų indėlių vertė" icon={<Gauge/>} onClick={onAssets}/>
      <Metric tone="saving" label="Investicijos" value={money(data.investments)} helper="Dabartinė portfelio vertė" icon={<PiggyBank/>} onClick={onInvestments}/>
      <Metric label="Kitas turtas" value={money(data.otherAssets)} helper="Kiti turto įrašai" icon={<WalletCards/>}/>
      <Metric tone="expense" label="Įsipareigojimai" value={money(data.liabilities)} helper="Neigiami paskyrų balansai" icon={<ArrowDownRight/>}/>
    </section>

    <section className="dashboard-grid networth-charts">
      <article className="card chart-card">
        <div className="card-header chart-filter-header"><div><p className="card-kicker">Analitika</p><h2>Grynojo turto dinamika</h2></div><div className="chart-range-tabs" aria-label="Grynojo turto grafiko laikotarpis">{[["3m","3 mėn."],["6m","6 mėn."],["12m","1 m."],["all","Visi"]].map(([key,label])=><button key={key} className={chartRange===key?"active":""} onClick={()=>setChartRange(key)}>{label}</button>)}</div></div>
        <div className="chart-wrap">{netWorthChartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={netWorthChartData}><defs><linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.28}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis/><Tooltip formatter={money}/><Area type="monotone" dataKey="value" name="Grynasis turtas" stroke="#0284c7" strokeWidth={3} fill="url(#netWorthFill)"/></AreaChart></ResponsiveContainer> : <div className="networth-empty"><PiggyBank size={34}/><strong>Istorinių duomenų dar nėra</strong><span>Pridėkite pirmą mėnesio pabaigos įrašą. Grafike bus rodomi tik jūsų išsaugoti duomenys.</span><button className="secondary-button" onClick={onNewSnapshot}><Plus size={16}/> Pridėti pirmą įrašą</button></div>}</div>
      </article>
      <ChartCard title="Turto struktūra šiandien">
        {data.breakdown.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.breakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={94} paddingAngle={3}>{data.breakdown.map((item,index)=><Cell key={item.name} fill={`hsl(${195+index*48} 70% 50%)`}/>)}</Pie><Tooltip formatter={money}/><Legend/></PieChart></ResponsiveContainer> : <div className="chart-empty">Pridėjus turto čia bus rodoma jo struktūra.</div>}
      </ChartCard>
    </section>

    <section className="card networth-history-card">
      <div className="card-header"><div><p className="card-kicker">MĖNESIO PABAIGOS ĮRAŠAI</p><h2>{year} m. grynojo turto istorija</h2></div><button className="secondary-button" onClick={onNewSnapshot}><Plus size={16}/> Užfiksuoti mėnesį</button></div>
      {yearRows.length ? <div className="table-scroll"><table className="operations-table"><thead><tr><th>Mėnuo</th><th>Finansinės paskyros</th><th>Indėliai</th><th>Investicijos</th><th>Kitas turtas</th><th>Įsipareigojimai</th><th>Grynasis turtas</th><th>Veiksmai</th></tr></thead><tbody>{yearRows.map((row) => { const deposits = Number(row.deposits ?? row.otherAssets ?? 0); const otherAssets = row.deposits == null ? 0 : Number(row.otherAssets || 0); const value = Number(row.financialAccounts || 0) + deposits + Number(row.investments || 0) + otherAssets - Number(row.liabilities || 0); return <tr key={row.id}><td><strong>{MONTHS[Number(row.monthKey.slice(5,7))-1]} {row.monthKey.slice(0,4)}</strong></td><td>{money(row.financialAccounts)}</td><td>{money(deposits)}</td><td>{money(row.investments)}</td><td>{money(otherAssets)}</td><td>{money(row.liabilities)}</td><td className="money-cell"><strong>{money(value)}</strong></td><td><div className="row-actions"><button title="Redaguoti" onClick={() => onEditSnapshot(row)}><Pencil size={16}/></button><button className="danger" title="Ištrinti" onClick={() => onDeleteSnapshot(row)}><Trash2 size={16}/></button></div></td></tr>; })}</tbody></table></div> : <div className="empty-state">Šiems metams mėnesio pabaigos įrašų dar nėra.</div>}
    </section>

    <section className="card networth-explainer"><div><p className="card-kicker">SKAIČIAVIMO LOGIKA</p><h2>Kaip apskaičiuojamas grynasis turtas?</h2></div><div className="networth-equation"><span>Finansinės paskyros</span><i>+</i><span>Indėliai</span><i>+</i><span>Investicijos</span><i>+</i><span>Kitas turtas</span><i>−</i><span>Įsipareigojimai</span><i>=</i><strong>{money(data.netWorth)}</strong></div></section>
  </>;
}


function FinancialAccounts({ accounts, summary, onNew, onEdit, onDelete }) {
  const groups = ["Evaldas", "Rima", "Šeima"];
  return <>
    <header className="topbar">
      <div><p className="eyebrow">V1.5</p><h1>Finansinės paskyros</h1><p className="subtitle">Pradiniai balansai ir automatiškai skaičiuojami likučiai.</p></div>
      <button className="primary-button" onClick={onNew}><Plus size={18}/>Nauja paskyra</button>
    </header>
    <section className="metrics-grid three">
      <Metric label="Bendras likutis" value={money(summary.total)} helper="Įtrauktos į Net Worth" icon={<WalletCards/>}/>
      <Metric label="Grynieji" value={money(summary.cash)} helper="Namai ir piniginės" icon={<PiggyBank/>}/>
      <Metric label="Kreditinės kortelės" value={money(summary.credit)} helper="Dabartinis balansas" icon={<ArrowRightLeft/>}/>
    </section>
    {groups.map((owner) => {
      const rows = accounts.filter((account) => account.owner === owner);
      return <section className="card accounts-group" key={owner}>
        <div className="card-header"><div><p className="card-kicker">Savininkas</p><h2>{owner}</h2></div><strong>{money(rows.filter(a=>a.includeInNetWorth).reduce((s,a)=>s+a.balance,0))}</strong></div>
        <div className="table-scroll"><table className="operations-table accounts-table"><thead><tr><th>Paskyra</th><th>Tipas</th><th>Pradžios data</th><th>Pradinis balansas</th><th>Dabartinis likutis</th><th>Net Worth</th><th>Būsena</th><th>Veiksmai</th></tr></thead>
        <tbody>{rows.map((account)=><tr key={account.id}><td><strong>{account.name}</strong></td><td>{accountTypeLabel(account.type)}</td><td>{dateLt(account.openingDate)}</td><td>{money(account.openingBalance)}</td><td className={account.balance < 0 ? "danger-text" : "money-cell"}>{money(account.balance)}</td><td>{account.includeInNetWorth ? "Taip" : "Ne"}</td><td><span className={`status-badge ${account.active ? "active" : "finished"}`}>{account.active ? "Aktyvi" : "Neaktyvi"}</span></td><td><div className="row-actions"><button title="Redaguoti" onClick={()=>onEdit(account)}><Pencil size={16}/></button><button className="danger" title="Ištrinti" onClick={()=>onDelete(account)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>
      </section>;
    })}
  </>;
}

function accountTypeLabel(type) {
  return ({ bank:"Banko sąskaita", credit:"Kreditinė kortelė", savings:"Taupomoji sąskaita", cash:"Grynieji", investment:"Investicinė", other:"Kita" })[type] || "Kita";
}

function FinancialAccountModal({ initial, onClose, onSubmit }) {
  const [form, setForm] = useState(initial || {
    name: "",
    owner: "Evaldas",
    type: "bank",
    openingDate: "2026-01-01",
    openingBalance: "",
    active: true,
    includeInNetWorth: true
  });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="modal-backdrop"><form className="modal" onSubmit={(event)=>{event.preventDefault(); if(form.name.trim()) onSubmit(form);}}>
    <ModalHeader title={initial ? "Redaguoti paskyrą" : "Nauja finansinė paskyra"} onClose={onClose}/>
    <label>Pavadinimas<input autoFocus value={form.name} onChange={(e)=>set("name",e.target.value)} placeholder="Pvz. SEB einamoji"/></label>
    <div className="form-grid">
      <label>Savininkas<select value={form.owner} onChange={(e)=>set("owner",e.target.value)}><option>Evaldas</option><option>Rima</option><option>Šeima</option></select></label>
      <label>Tipas<select value={form.type} onChange={(e)=>set("type",e.target.value)}><option value="bank">Banko sąskaita</option><option value="credit">Kreditinė kortelė</option><option value="savings">Taupomoji sąskaita</option><option value="cash">Grynieji</option><option value="investment">Investicinė</option><option value="other">Kita</option></select></label>
    </div>
    <div className="form-grid">
      <label>Pradinio balanso data<input type="date" value={form.openingDate} onChange={(e)=>set("openingDate",e.target.value)}/></label>
      <label>Pradinis balansas<input type="number" step="0.01" value={form.openingBalance} onChange={(e)=>set("openingBalance",e.target.value)} placeholder="0,00"/></label>
    </div>
    <label className="checkbox-label"><input type="checkbox" checked={Boolean(form.active)} onChange={(e)=>set("active",e.target.checked)}/><span>Paskyra aktyvi</span></label>
    <label className="checkbox-label"><input type="checkbox" checked={Boolean(form.includeInNetWorth)} onChange={(e)=>set("includeInNetWorth",e.target.checked)}/><span>Įtraukti į grynąją vertę (Net Worth)</span></label>
    <button className="primary-button full">{initial ? "Išsaugoti pakeitimus" : "Sukurti paskyrą"}</button>
  </form></div>;
}

function ChartCard({ title, children }) {
  return <article className="card chart-card"><div className="card-header"><div><p className="card-kicker">Analitika</p><h2>{title}</h2></div></div><div className="chart-wrap">{children}</div></article>;
}

function Metric({ label, value, helper, icon, onClick, tone = "default" }) {
  return <article className={`metric-card tone-${tone} ${onClick ? "clickable" : ""}`} onClick={onClick}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></article>;
}

function TransactionRow({ item }) {
  const isTransfer = item.type === "transfer";
  const isInvestment = item.type === "investment";
  const icon = item.type === "income" ? <ArrowUpRight size={18}/> : item.type === "expense" ? <span className="category-emoji">{categoryEmoji(item.category)}</span> : isInvestment ? <PiggyBank size={18}/> : <ArrowRightLeft size={18}/>;
  const details = isTransfer ? `${item.fromAccount} → ${item.toAccount}` : isInvestment ? `${item.investmentName || "Investicija"} · ${item.person} · ${item.account}` : `${item.category} · ${item.person} · ${item.account}`;
  const prefix = item.type === "income" ? "+" : item.type === "expense" || isInvestment ? "-" : "";
  return <div className="transaction-row"><div className={`transaction-icon ${item.type}`}>{icon}</div><div className="transaction-main"><strong>{item.description}</strong><span>{details}</span></div><div className="transaction-date">{dateLt(item.date)}</div><strong className={`transaction-amount ${item.type}`}>{prefix}{money(item.amount)}</strong></div>;
}

function TransactionModal({ initial, initialDate, assets, financialAccounts, onClose, onSubmit }) {
  const activeAccounts = financialAccounts || [];
  const investmentAssets = (assets || []).filter((asset) => asset.type === "investment");
  const [form, setForm] = useState(initial || {
    date: initialDate,
    type: "expense",
    category: "Maistas",
    person: people[0],
    accountId: activeAccounts[0]?.id || "",
    fromAccountId: activeAccounts[0]?.id || "",
    toAccountId: activeAccounts[1]?.id || activeAccounts[0]?.id || "",
    investmentAssetId: investmentAssets[0]?.id || "",
    description: "",
    notes: "",
    amount: ""
  });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const isTransfer = form.type === "transfer";
  const isInvestment = form.type === "investment";

  function submit(event) {
    event.preventDefault();
    if (!form.description.trim() || Number(form.amount) <= 0) return;
    if (isTransfer && (!form.fromAccountId || !form.toAccountId || form.fromAccountId === form.toAccountId)) return;
    if (isInvestment && (!form.accountId || !form.investmentAssetId)) return;
    const account = activeAccounts.find((item) => item.id === form.accountId);
    const from = activeAccounts.find((item) => item.id === form.fromAccountId);
    const to = activeAccounts.find((item) => item.id === form.toAccountId);
    const investment = investmentAssets.find((item) => item.id === form.investmentAssetId);
    onSubmit(isTransfer ? {
      ...form,
      category: "Perkėlimas",
      account: "",
      fromAccount: from?.name || "",
      toAccount: to?.name || ""
    } : isInvestment ? {
      ...form,
      category: "Investavimas",
      account: account?.name || "",
      investmentName: investment?.name || "",
      investmentInstitution: investment?.institution || ""
    } : {
      ...form,
      account: account?.name || ""
    });
  }

  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}>
    <ModalHeader title={initial ? "Redaguoti operaciją" : "Pridėti operaciją"} onClose={onClose}/>
    <div className="type-switch four">
      <button type="button" className={form.type==="expense"?"active":""} onClick={()=>set("type","expense")}>Išlaidos</button>
      <button type="button" className={form.type==="income"?"active":""} onClick={()=>set("type","income")}>Pajamos</button>
      <button type="button" className={form.type==="transfer"?"active":""} onClick={()=>set("type","transfer")}>Perkėlimas</button>
      <button type="button" className={form.type==="investment"?"active":""} onClick={()=>set("type","investment")}>Investavimas</button>
    </div>
    <label>Data<input type="date" min="2026-01-01" value={form.date} onChange={(e)=>set("date",e.target.value)}/></label>
    <label>Trumpas aprašymas<input autoFocus value={form.description} onChange={(e)=>set("description",e.target.value)} placeholder={isTransfer ? "Pvz. Pinigai į Evaldo piniginę" : isInvestment ? "Pvz. Papildymas į Debitum" : "Pvz. Lidl, atlyginimas..."}/></label>
    <label>Platesnis aprašymas<textarea rows="3" value={form.notes || ""} onChange={(e)=>set("notes",e.target.value)} placeholder="Papildoma informacija apie operaciją (nebūtina)"/></label>
    {isTransfer ? <>
      <div className="form-grid">
        <label>Iš<select value={form.fromAccountId || ""} onChange={(e)=>set("fromAccountId",e.target.value)}>{activeAccounts.map((account)=><option key={account.id} value={account.id}>{account.name} · {account.owner}</option>)}</select></label>
        <label>Į<select value={form.toAccountId || ""} onChange={(e)=>set("toAccountId",e.target.value)}>{activeAccounts.map((account)=><option key={account.id} value={account.id}>{account.name} · {account.owner}</option>)}</select></label>
      </div>
      <div className="transfer-note"><ArrowRightLeft size={17}/><span>Perkėlimas nekeičia šeimos pajamų ar išlaidų, bet pakeičia abiejų paskyrų likučius.</span></div>
    </> : isInvestment ? <>
      <div className="form-grid">
        <label>Iš paskyros<select value={form.accountId || ""} onChange={(e)=>set("accountId",e.target.value)}>{activeAccounts.map((account)=><option key={account.id} value={account.id}>{account.name} · {account.owner}</option>)}</select></label>
        <label>Investicija<select value={form.investmentAssetId || ""} onChange={(e)=>set("investmentAssetId",e.target.value)}><option value="">Pasirinkite investiciją</option>{investmentAssets.map((asset)=><option key={asset.id} value={asset.id}>{asset.name} · {asset.owner}</option>)}</select></label>
      </div>
      {!investmentAssets.length && <div className="investment-warning"><AlertTriangle size={17}/><span>Pirmiausia Investicijų puslapyje sukurkite bent vieną investiciją ar platformą.</span></div>}
      <div className="investment-note"><PiggyBank size={17}/><span>Investavimas sumažina pasirinktos finansinės paskyros likutį, tačiau nėra skaičiuojamas kaip išlaidos.</span></div>
    </> : <div className="form-grid">
      <label>Kategorija<select value={form.category} onChange={(e)=>set("category",e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Paskyra<select value={form.accountId || ""} onChange={(e)=>set("accountId",e.target.value)}>{activeAccounts.map((account)=><option key={account.id} value={account.id}>{account.name} · {account.owner}</option>)}</select></label>
    </div>}
    <div className="form-grid">
      <label>Suma<input type="number" min="0" step="0.01" value={form.amount} onChange={(e)=>set("amount",e.target.value)}/></label>
      <label>Asmuo<select value={form.person || people[0]} onChange={(e)=>set("person",e.target.value)}>{people.map(x=><option key={x}>{x}</option>)}<option>Šeima</option></select></label>
    </div>
    <button className="primary-button full" disabled={isInvestment && !investmentAssets.length}>{initial ? "Išsaugoti pakeitimus" : "Išsaugoti operaciją"}</button>
  </form></div>;
}

function InvestmentSnapshotModal({ initial, defaults, onClose, onSubmit }) {
  const normalizedInitial = initial ? {
    ...initial,
    evaldas: initial.evaldas ?? (initial.rima == null ? initial.value ?? 0 : 0),
    rima: initial.rima ?? 0,
    evaldasContributed: initial.evaldasContributed ?? "",
    rimaContributed: initial.rimaContributed ?? ""
  } : defaults;
  const [form, setForm] = useState(normalizedInitial);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const total = Number(form.evaldas || 0) + Number(form.rima || 0);
  const hasContribution = form.evaldasContributed !== "" && form.evaldasContributed != null && form.rimaContributed !== "" && form.rimaContributed != null;
  const contributed = hasContribution ? Number(form.evaldasContributed || 0) + Number(form.rimaContributed || 0) : null;
  const result = contributed == null ? null : total - contributed;
  return <div className="modal-backdrop"><form className="modal networth-modal" onSubmit={(event) => { event.preventDefault(); if (form.monthKey) onSubmit(form); }}>
    <ModalHeader title={initial ? "Redaguoti investicijų mėnesio vertę" : "Nauja investicijų mėnesio vertė"} onClose={onClose}/>
    <p className="modal-description">Įrašykite faktines Evaldo ir Rimos portfelių vertes bei grynąjį įneštą kapitalą mėnesio pabaigoje. Įneštas kapitalas – visi iki tos datos įnešti pinigai minus visi iš investicijų atsiimti pinigai.</p>
    <label>Mėnuo<input type="month" required value={form.monthKey || ""} onChange={(event) => set("monthKey", event.target.value)}/></label>
    <div className="form-grid"><label>Evaldo portfelio vertė<input type="number" min="0" step="0.01" value={form.evaldas ?? ""} onChange={(event) => set("evaldas", event.target.value)}/></label><label>Evaldo įneštas kapitalas<input type="number" min="0" step="0.01" value={form.evaldasContributed ?? ""} onChange={(event) => set("evaldasContributed", event.target.value)} placeholder="Pvz. 11000,00"/></label></div>
    <div className="form-grid"><label>Rimos portfelio vertė<input type="number" min="0" step="0.01" value={form.rima ?? ""} onChange={(event) => set("rima", event.target.value)}/></label><label>Rimos įneštas kapitalas<input type="number" min="0" step="0.01" value={form.rimaContributed ?? ""} onChange={(event) => set("rimaContributed", event.target.value)} placeholder="Pvz. 3000,00"/></label></div>
    <div className="networth-modal-total"><span>Bendra šeimos investicijų vertė</span><strong>{money(total)}</strong></div>
    <div className="networth-modal-total"><span>Įneštas kapitalas</span><strong>{contributed == null ? "—" : money(contributed)}</strong></div>
    <div className="networth-modal-total"><span>Investicijų rezultatas</span><strong>{result == null ? "—" : money(result)}</strong></div>
    <button className="primary-button full">{initial ? "Išsaugoti pakeitimus" : "Išsaugoti mėnesio vertę"}</button>
  </form></div>;
}

function NetWorthSnapshotModal({ initial, defaults, onClose, onSubmit }) {
  const normalizedInitial = initial ? {
    ...initial,
    deposits: initial.deposits ?? initial.otherAssets ?? 0,
    otherAssets: initial.deposits == null ? 0 : initial.otherAssets ?? 0
  } : defaults;
  const [form, setForm] = useState(normalizedInitial);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const total = Number(form.financialAccounts || 0) + Number(form.deposits || 0) + Number(form.investments || 0) + Number(form.otherAssets || 0) - Number(form.liabilities || 0);
  return <div className="modal-backdrop"><form className="modal networth-modal" onSubmit={(event) => { event.preventDefault(); if (form.monthKey) onSubmit(form); }}>
    <ModalHeader title={initial ? "Redaguoti mėnesio įrašą" : "Naujas grynojo turto įrašas"} onClose={onClose}/>
    <p className="modal-description">Įrašykite faktines mėnesio pabaigos vertes. Būtent iš šių įrašų bus braižomas grynojo turto grafikas.</p>
    <label>Mėnuo<input type="month" required value={form.monthKey || ""} onChange={(event) => set("monthKey", event.target.value)}/></label>
    <div className="form-grid"><label>Finansinės paskyros<input type="number" min="0" step="0.01" value={form.financialAccounts ?? ""} onChange={(event) => set("financialAccounts", event.target.value)}/></label><label>Indėliai<input type="number" min="0" step="0.01" value={form.deposits ?? ""} onChange={(event) => set("deposits", event.target.value)}/></label></div>
    <div className="form-grid"><label>Investicijos<input type="number" min="0" step="0.01" value={form.investments ?? ""} onChange={(event) => set("investments", event.target.value)}/></label><label>Kitas turtas<input type="number" min="0" step="0.01" value={form.otherAssets ?? ""} onChange={(event) => set("otherAssets", event.target.value)}/></label></div>
    <label>Įsipareigojimai<input type="number" min="0" step="0.01" value={form.liabilities ?? ""} onChange={(event) => set("liabilities", event.target.value)}/></label>
    <div className="networth-modal-total"><span>Apskaičiuotas grynasis turtas</span><strong>{money(total)}</strong></div>
    <button className="primary-button full">{initial ? "Išsaugoti pakeitimus" : "Išsaugoti mėnesio įrašą"}</button>
  </form></div>;
}

function AssetModal({ initial, initialType = "deposit", initialDate, onClose, onSubmit }) {
  const recordType = initial?.type || initialType;
  const [form,setForm]=useState(initial || {type:recordType,name:"",institution:"",owner:"Šeima",amount:"",valueDate:initialDate,interestRate:"",startDate:initialDate,endDate:"",notes:""});
  const set=(key,value)=>setForm(current=>({...current,[key]:value}));
  const isInvestment = recordType === "investment";
  return <div className="modal-backdrop"><form className="modal" onSubmit={(event)=>{event.preventDefault(); if(form.name && Number(form.amount)>0) onSubmit({...form,type:recordType});}}>
    <ModalHeader title={initial ? (isInvestment ? "Redaguoti investiciją" : "Redaguoti indėlį") : (isInvestment ? "Pridėti investiciją" : "Pridėti indėlį")} onClose={onClose}/>
    <label>Pavadinimas<input value={form.name} onChange={(event)=>set("name",event.target.value)} placeholder={isInvestment ? "Pvz. Revolut Brokerage" : "Pvz. AKU terminuotas indėlis"}/></label>
    <div className="form-grid"><label>Įstaiga<input value={form.institution} onChange={(event)=>set("institution",event.target.value)}/></label><label>Savininkas<select value={form.owner} onChange={(event)=>set("owner",event.target.value)}><option>Evaldas</option><option>Rima</option><option>Šeima</option></select></label></div>
    <div className="form-grid"><label>Vertė<input type="number" min="0" step="0.01" value={form.amount} onChange={(event)=>set("amount",event.target.value)}/></label><label>Vertės data<input type="date" value={form.valueDate || ""} onChange={(event)=>set("valueDate",event.target.value)}/></label></div>
    {!isInvestment && <><div className="form-grid"><label>Palūkanos, %<input type="number" step="0.01" value={form.interestRate || ""} onChange={(event)=>set("interestRate",event.target.value)}/></label><label>Pradžia<input type="date" value={form.startDate || ""} onChange={(event)=>set("startDate",event.target.value)}/></label></div><label>Pabaiga<input type="date" value={form.endDate || ""} onChange={(event)=>set("endDate",event.target.value)}/></label></>}
    <label>Pastabos<textarea rows="3" value={form.notes || ""} onChange={(event)=>set("notes",event.target.value)} placeholder="Papildoma informacija"/></label>
    <button className="primary-button full">{initial ? "Išsaugoti pakeitimus" : isInvestment ? "Išsaugoti investiciją" : "Išsaugoti indėlį"}</button>
  </form></div>;
}

function BudgetModal({ initial, onClose, onSubmit }) {
  const [form, setForm] = useState({ category: initial?.category || EXPENSE_CATEGORIES[0], amount: initial?.limit || initial?.amount || "" });
  return <div className="modal-backdrop"><form className="modal budget-modal" onSubmit={(e) => { e.preventDefault(); if(Number(form.amount) > 0) onSubmit(form); }}><ModalHeader title={initial ? "Redaguoti biudžetą" : "Naujas biudžetas"} onClose={onClose}/><p className="modal-description">Nustatykite mėnesio išlaidų limitą pasirinktai kategorijai.</p><label>Kategorija<select value={form.category} onChange={(e) => setForm({...form, category:e.target.value})}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Mėnesio limitas<input autoFocus type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount:e.target.value})} placeholder="0,00"/></label><button className="primary-button full">{initial ? "Išsaugoti pakeitimus" : "Sukurti biudžetą"}</button></form></div>;
}

function ModalHeader({ title, onClose }) {
  return <div className="modal-header"><div><p className="card-kicker">Šeimos finansai</p><h2>{title}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={20}/></button></div>;
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [setupError, setSetupError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setHousehold(null);
        setInitialData(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadHousehold();
  }, [session]);

  async function loadHousehold() {
    setLoading(true);
    setSetupError("");

    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("household_id, households(id, name, join_code)")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (membershipError) {
      setSetupError(membershipError.message);
      setLoading(false);
      return;
    }

    if (!membership) {
      setHousehold(null);
      setInitialData(null);
      setLoading(false);
      return;
    }

    setHousehold(membership.households);

    const { data: stateRow, error: stateError } = await supabase
      .from("household_state")
      .select("payload")
      .eq("household_id", membership.household_id)
      .maybeSingle();

    if (stateError) {
      setSetupError(stateError.message);
      setLoading(false);
      return;
    }

    setInitialData(stateRow?.payload || {
      transactions: [],
      assets: [],
      budgets: [],
      financialAccounts: demoFinancialAccounts,
      netWorthHistory: [],
      investmentHistory: []
    });
    setLoading(false);
  }

  async function createHousehold(name) {
    setSetupError("");
    const joinCode = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
    const { error } = await supabase.from("households").insert({
      name,
      join_code: joinCode,
      created_by: session.user.id
    });
    if (error) {
      setSetupError(error.message);
      return;
    }
    await loadHousehold();
  }

  async function joinHousehold(code) {
    setSetupError("");
    const { error } = await supabase.rpc("join_household_by_code", {
      requested_code: code.trim().toUpperCase()
    });
    if (error) {
      setSetupError(error.message);
      return;
    }
    await loadHousehold();
  }

  async function persistCloud(payload) {
    if (!household) return;
    const { error } = await supabase
      .from("household_state")
      .upsert({
        household_id: household.id,
        payload,
        updated_by: session.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: "household_id" });

    if (error) throw error;
  }

  async function importLocalData() {
    const payload = {
      transactions: loadStorage(TRANSACTIONS_KEY, []),
      assets: loadStorage(ASSETS_KEY, []),
      budgets: loadStorage(BUDGETS_KEY, []),
      financialAccounts: loadStorage(FINANCIAL_ACCOUNTS_KEY, demoFinancialAccounts),
      netWorthHistory: loadStorage(NET_WORTH_HISTORY_KEY, []),
      investmentHistory: loadStorage(INVESTMENT_HISTORY_KEY, [])
    };
    await persistCloud(payload);
    setInitialData(payload);
  }

  if (!isSupabaseConfigured) return <SupabaseNotConfigured/>;
  if (loading) return <FullScreenMessage title="Jungiama prie duomenų bazės…" text="Prašome palaukti."/>;
  if (!session) return <AuthScreen/>;
  if (!household) return <HouseholdSetup email={session.user.email} error={setupError} onCreate={createHousehold} onJoin={joinHousehold} onSignOut={() => supabase.auth.signOut()}/>;
  if (!initialData) return <FullScreenMessage title="Kraunami šeimos duomenys…" text="Prašome palaukti."/>;

  return <div>
    <div className="cloud-top-banner">
      <span><strong>{household.name}</strong> · kodas šeimos nariui: <code>{household.join_code}</code></span>
      <button onClick={importLocalData}>Importuoti šios naršyklės duomenis</button>
    </div>
    <FinanceApp
      initialData={initialData}
      onPersist={persistCloud}
      userEmail={session.user.email}
      onSignOut={() => supabase.auth.signOut()}
    />
  </div>;
}

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const action = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const { error } = await action;
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (mode === "signup") {
      setMessage("Registracija atlikta. Jei įjungtas el. pašto patvirtinimas, patvirtinkite gautą laišką.");
    }
  }

  return <div className="auth-shell">
    <form className="auth-card" onSubmit={submit}>
      <div className="brand-mark auth-logo">ŠF</div>
      <p className="eyebrow">Šeimos finansai V1.6</p>
      <h1>{mode === "signin" ? "Prisijungimas" : "Registracija"}</h1>
      <p className="subtitle">Duomenys saugomi jūsų šeimos Supabase duomenų bazėje.</p>
      <label>El. paštas<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/></label>
      <label>Slaptažodis<input type="password" required minLength="6" value={password} onChange={(e)=>setPassword(e.target.value)}/></label>
      {message && <div className="auth-message">{message}</div>}
      <button className="primary-button full" disabled={busy}>{busy ? "Prašome palaukti…" : mode === "signin" ? "Prisijungti" : "Registruotis"}</button>
      <button type="button" className="auth-switch" onClick={()=>setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Neturiu paskyros – registruotis" : "Jau turiu paskyrą – prisijungti"}
      </button>
    </form>
  </div>;
}

function HouseholdSetup({ email, error, onCreate, onJoin, onSignOut }) {
  const [name, setName] = useState("Mūsų šeima");
  const [code, setCode] = useState("");

  return <div className="auth-shell">
    <div className="auth-card household-card">
      <p className="eyebrow">Prisijungta kaip {email}</p>
      <h1>Sukurkite arba prijunkite šeimą</h1>
      <p className="subtitle">Pirmasis žmogus sukuria šeimą, o kitas prisijungia naudodamas 8 simbolių kodą.</p>
      {error && <div className="auth-message error">{error}</div>}
      <div className="household-options">
        <form onSubmit={(e)=>{e.preventDefault(); if(name.trim()) onCreate(name.trim());}}>
          <h2>Sukurti naują šeimą</h2>
          <label>Šeimos pavadinimas<input value={name} onChange={(e)=>setName(e.target.value)}/></label>
          <button className="primary-button full">Sukurti</button>
        </form>
        <div className="household-divider">arba</div>
        <form onSubmit={(e)=>{e.preventDefault(); if(code.trim()) onJoin(code);}}>
          <h2>Prisijungti prie esamos</h2>
          <label>Šeimos kodas<input value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} maxLength="8" placeholder="AB12CD34"/></label>
          <button className="secondary-button full">Prisijungti</button>
        </form>
      </div>
      <button className="auth-switch" onClick={onSignOut}>Atsijungti</button>
    </div>
  </div>;
}

function SupabaseNotConfigured() {
  return <FullScreenMessage
    title="Supabase dar nesukonfigūruotas"
    text="Sukurkite .env failą pagal .env.example ir įrašykite VITE_SUPABASE_URL bei VITE_SUPABASE_ANON_KEY."
  />;
}

function FullScreenMessage({ title, text }) {
  return <div className="auth-shell"><div className="auth-card"><div className="brand-mark auth-logo">ŠF</div><h1>{title}</h1><p className="subtitle">{text}</p></div></div>;
}

export default App;
