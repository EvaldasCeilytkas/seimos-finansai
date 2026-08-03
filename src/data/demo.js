export const demoTransactions = [
  { id: 1, date: "2026-01-05", type: "income", category: "Atlyginimas", person: "Evaldas", account: "SEB", description: "Atlyginimas", amount: 2450 },
  { id: 2, date: "2026-01-06", type: "income", category: "Atlyginimas", person: "Rima", account: "Swedbank", description: "Atlyginimas", amount: 1750 },
  { id: 3, date: "2026-01-10", type: "expense", category: "Maistas", person: "Evaldas", account: "SEB", description: "Maisto prekės", amount: 465.20 },
  { id: 4, date: "2026-01-15", type: "expense", category: "Būstas", person: "Rima", account: "Swedbank", description: "Būsto išlaidos", amount: 610 },
  { id: 5, date: "2026-02-05", type: "income", category: "Atlyginimas", person: "Evaldas", account: "SEB", description: "Atlyginimas", amount: 2500 },
  { id: 6, date: "2026-02-06", type: "income", category: "Atlyginimas", person: "Rima", account: "Swedbank", description: "Atlyginimas", amount: 1780 },
  { id: 7, date: "2026-02-12", type: "expense", category: "Maistas", person: "Evaldas", account: "SEB", description: "Maisto prekės", amount: 510.45 },
  { id: 8, date: "2026-03-05", type: "income", category: "Atlyginimas", person: "Evaldas", account: "SEB", description: "Atlyginimas", amount: 2500 },
  { id: 9, date: "2026-03-06", type: "income", category: "Atlyginimas", person: "Rima", account: "Swedbank", description: "Atlyginimas", amount: 1800 },
  { id: 10, date: "2026-03-18", type: "expense", category: "Kuras", person: "Rima", account: "Swedbank", description: "Kuras", amount: 148.30 },
  { id: 11, date: "2026-04-05", type: "income", category: "Atlyginimas", person: "Evaldas", account: "SEB", description: "Atlyginimas", amount: 2550 },
  { id: 12, date: "2026-04-06", type: "income", category: "Atlyginimas", person: "Rima", account: "Swedbank", description: "Atlyginimas", amount: 1800 },
  { id: 13, date: "2026-04-22", type: "expense", category: "Laisvalaikis", person: "Evaldas", account: "Revolut", description: "Savaitgalio išlaidos", amount: 310 },
  { id: 14, date: "2026-05-05", type: "income", category: "Atlyginimas", person: "Evaldas", account: "SEB", description: "Atlyginimas", amount: 2550 },
  { id: 15, date: "2026-05-06", type: "income", category: "Atlyginimas", person: "Rima", account: "Swedbank", description: "Atlyginimas", amount: 1820 },
  { id: 16, date: "2026-06-05", type: "income", category: "Atlyginimas", person: "Evaldas", account: "SEB", description: "Atlyginimas", amount: 2600 },
  { id: 17, date: "2026-06-06", type: "income", category: "Atlyginimas", person: "Rima", account: "Swedbank", description: "Atlyginimas", amount: 1820 },
  { id: 18, date: "2026-07-05", type: "income", category: "Atlyginimas", person: "Evaldas", account: "SEB", description: "Atlyginimas", amount: 2600 },
  { id: 19, date: "2026-07-06", type: "income", category: "Atlyginimas", person: "Rima", account: "Swedbank", description: "Atlyginimas", amount: 1850 },
  { id: 20, date: "2026-08-01", type: "income", category: "Atlyginimas", person: "Evaldas", account: "SEB", description: "Atlyginimas", amount: 2500 },
  { id: 21, date: "2026-08-02", type: "income", category: "Atlyginimas", person: "Rima", account: "Swedbank", description: "Atlyginimas", amount: 1800 },
  { id: 22, date: "2026-08-02", type: "expense", category: "Maistas", person: "Evaldas", account: "SEB", description: "Lidl", amount: 84.62 },
  { id: 23, date: "2026-08-03", type: "expense", category: "Kuras", person: "Rima", account: "Swedbank", description: "Circle K", amount: 62.40 },
  { id: 24, date: "2026-08-03", type: "expense", category: "Būstas", person: "Evaldas", account: "SEB", description: "Komunaliniai", amount: 228.10 },
];

export const demoAssets = [
  { id: "asset-1", type: "deposit", name: "Terminuotas indėlis", institution: "SEB", owner: "Evaldas", amount: 5000, interestRate: 2.8, startDate: "2026-04-15", endDate: "2027-04-15", valueDate: "2026-04-30", notes: "12 mėn. terminuotas indėlis" },
  { id: "asset-2", type: "deposit", name: "Taupomasis indėlis", institution: "Swedbank", owner: "Rima", amount: 3200, interestRate: 2.1, startDate: "2026-06-01", endDate: "2027-06-01", valueDate: "2026-06-30", notes: "Šeimos rezervas" },
  { id: "asset-3", type: "cash", name: "Grynieji namuose", institution: "Namai", owner: "Šeima", amount: 800, interestRate: 0, startDate: "2026-01-01", endDate: "", valueDate: "2026-01-31", notes: "Kasdienis rezervas" },
];

export const categories = ["Atlyginimas", "Maistas", "Kuras", "Būstas", "Komunaliniai", "Vaikai", "Laisvalaikis", "Sveikata", "Ryšys", "Technika", "Investicijos", "Kita"];
export const demoFinancialAccounts = [
  { id: "acc-e-seb", name: "SEB einamoji", owner: "Evaldas", type: "bank", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-e-credit", name: "SEB kreditinė", owner: "Evaldas", type: "credit", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-e-revolut", name: "Revolut", owner: "Evaldas", type: "bank", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-e-aku", name: "AKU", owner: "Evaldas", type: "savings", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-e-wallet", name: "Evaldo piniginė", owner: "Evaldas", type: "cash", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-r-seb", name: "SEB einamoji", owner: "Rima", type: "bank", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-r-revolut", name: "Revolut", owner: "Rima", type: "bank", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-r-aku", name: "AKU", owner: "Rima", type: "savings", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-r-wallet", name: "Rimos piniginė", owner: "Rima", type: "cash", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true },
  { id: "acc-family-cash", name: "Namų grynieji", owner: "Šeima", type: "cash", openingDate: "2026-01-01", openingBalance: 0, active: true, includeInNetWorth: true }
];

export const accounts = demoFinancialAccounts.map((item) => `${item.name} · ${item.owner}`);
export const people = ["Evaldas", "Rima"];
export const assetTypes = [
  { value: "deposit", label: "Indėlis" },
  { value: "cash", label: "Grynieji" },
  { value: "bank", label: "Banko sąskaita" },
  { value: "investment", label: "Investicijos" },
  { value: "property", label: "Nekilnojamasis turtas" },
  { value: "vehicle", label: "Transportas" },
  { value: "other", label: "Kitas turtas" },
];
