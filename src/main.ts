interface CompanySubject {
  name: string;
  nip: string;
  regon: string;
  krs: string | null;
  residenceAddress: string | null;
  workingAddress: string | null;
  representatives: string[];
  authorizedClerks: string[];
  partners: string[];
  registrationLegalDate: string | null;
  registrationDenialDate: string | null;
  registrationDenialBasis: string | null;
  restorationDate: string | null;
  restorationBasis: string | null;
  removalDate: string | null;
  removalBasis: string | null;
  accountNumbers: string[];
  hasVirtualAccounts: boolean;
  statusVat: string | null;
}

interface ParsedAddress {
  street: string;
  postalCode: string;
  city: string;
}

interface ApiResponse {
  result: {
    subject: CompanySubject | null;
    requestId: string;
  };
}

interface CeidgFirma {
  nazwa: string;
}

const form = document.getElementById("nip-form") as HTMLFormElement;
const nipInput = document.getElementById("nip-input") as HTMLInputElement;
const searchBtn = document.getElementById("search-btn") as HTMLButtonElement;
const errorMsg = document.getElementById("error-msg") as HTMLParagraphElement;
const loading = document.getElementById("loading") as HTMLDivElement;
const result = document.getElementById("result") as HTMLDivElement;
const companyTable = document.querySelector("#company-table tbody") as HTMLTableSectionElement;
const representativesSection = document.getElementById("representatives-section") as HTMLDivElement;
const representativesList = document.getElementById("representatives-list") as HTMLUListElement;
const partnersSection = document.getElementById("partners-section") as HTMLDivElement;
const partnersList = document.getElementById("partners-list") as HTMLUListElement;
const bankAccountsSection = document.getElementById("bank-accounts-section") as HTMLDivElement;
const bankAccountsList = document.getElementById("bank-accounts-list") as HTMLUListElement;
const copyBtn = document.getElementById("copy-all-btn") as HTMLButtonElement;
const toggleApiKeyBtn = document.getElementById("toggle-api-key") as HTMLButtonElement;
const apiKeyPanel = document.getElementById("api-key-panel") as HTMLDivElement;
const apiKeyInput = document.getElementById("api-key-input") as HTMLInputElement;
const saveApiKeyBtn = document.getElementById("save-api-key") as HTMLButtonElement;
const clearApiKeyBtn = document.getElementById("clear-api-key") as HTMLButtonElement;
const apiKeyStatus = document.getElementById("api-key-status") as HTMLSpanElement;

const API_KEY_STORAGE = "ceidg_api_key";

function getCeidgApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

function updateApiKeyStatus() {
  const key = getCeidgApiKey();
  if (key) {
    apiKeyStatus.textContent = "Klucz zapisany";
    apiKeyStatus.className = "api-key-status connected";
  } else {
    apiKeyStatus.textContent = "";
    apiKeyStatus.className = "api-key-status";
  }
}

toggleApiKeyBtn.addEventListener("click", () => {
  apiKeyPanel.classList.toggle("hidden");
});

saveApiKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key);
    apiKeyInput.value = "";
    apiKeyPanel.classList.add("hidden");
    updateApiKeyStatus();
  }
});

clearApiKeyBtn.addEventListener("click", () => {
  localStorage.removeItem(API_KEY_STORAGE);
  apiKeyInput.value = "";
  updateApiKeyStatus();
});

updateApiKeyStatus();

function cleanNip(raw: string): string {
  return raw.replace(/[\s\-]/g, "");
}

function validateNip(nip: string): string | null {
  if (!/^\d{10}$/.test(nip)) {
    return "NIP musi składać się z 10 cyfr.";
  }

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const checksum = weights.reduce((sum, w, i) => sum + w * parseInt(nip[i], 10), 0);
  if (checksum % 11 !== parseInt(nip[9], 10)) {
    return "Nieprawidłowy NIP — błędna suma kontrolna.";
  }

  return null;
}

function showError(msg: string) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return dateStr;
}

function parseAddress(address: string | null): ParsedAddress | null {
  if (!address) return null;
  const match = address.match(/^(.*?),?\s*(\d{2}-\d{3})\s+(.+)$/);
  if (match) {
    return {
      street: match[1].trim().replace(/,\s*$/, ""),
      postalCode: match[2],
      city: match[3].trim(),
    };
  }
  return null;
}

function isSoleProprietorship(subject: CompanySubject): boolean {
  return !subject.krs && subject.representatives.length === 0;
}

async function fetchCeidgFirma(nip: string): Promise<CeidgFirma | null> {
  try {
    const response = await fetch(
      `/api/ceidg/SearchAdvance?nip=${nip}`
    );
    if (!response.ok) {
      console.warn("CEIDG response status:", response.status);
      return null;
    }
    const data = await response.json();
    const list = data?.companyList;
    if (!Array.isArray(list) || list.length === 0) return null;
    const f = list[0];
    return {
      nazwa: f.name ?? "",
    };
  } catch {
    return null;
  }
}

function formatStatusVat(status: string | null): { text: string; className: string } {
  switch (status) {
    case "Czynny":
      return { text: "Czynny", className: "status-active" };
    case "Zwolniony":
      return { text: "Zwolniony", className: "status-inactive" };
    case "Niezarejestrowany":
      return { text: "Niezarejestrowany", className: "status-inactive" };
    default:
      return { text: status ?? "—", className: "" };
  }
}

function addAddressRows(rows: [string, string, string?][], label: string, address: string | null) {
  const parsed = parseAddress(address);
  if (parsed) {
    rows.push([`${label} — ulica`, parsed.street]);
    rows.push([`${label} — kod pocztowy`, parsed.postalCode]);
    rows.push([`${label} — miasto`, parsed.city]);
  } else {
    rows.push([label, address || "—"]);
  }
}

function buildCopyText(subject: CompanySubject, ceidg: CeidgFirma | null): string {
  const lines: string[] = [];
  const sole = isSoleProprietorship(subject);

  if (sole && ceidg) {
    lines.push(`Nazwa firmy: ${ceidg.nazwa}`);
    lines.push(`Właściciel: ${subject.name}`);
  } else if (sole) {
    lines.push(`Właściciel: ${subject.name}`);
  } else {
    lines.push(`Nazwa: ${subject.name}`);
  }

  lines.push(`NIP: ${subject.nip}`);
  lines.push(`REGON: ${subject.regon || "—"}`);
  if (subject.krs) lines.push(`KRS: ${subject.krs}`);
  lines.push(`Status VAT: ${formatStatusVat(subject.statusVat).text}`);

  const addAddr = (label: string, address: string | null) => {
    const parsed = parseAddress(address);
    if (parsed) {
      lines.push(`${label} — ulica: ${parsed.street}`);
      lines.push(`${label} — kod pocztowy: ${parsed.postalCode}`);
      lines.push(`${label} — miasto: ${parsed.city}`);
    } else if (address) {
      lines.push(`${label}: ${address}`);
    }
  };

  addAddr("Adres siedziby", subject.residenceAddress);
  addAddr("Adres działalności", subject.workingAddress);

  lines.push(`Data rejestracji VAT: ${formatDate(subject.registrationLegalDate)}`);

  if (subject.removalDate) {
    lines.push(`Data wykreślenia z VAT: ${formatDate(subject.removalDate)}`);
    if (subject.removalBasis) lines.push(`Podstawa wykreślenia: ${subject.removalBasis}`);
  }
  if (subject.restorationDate) {
    lines.push(`Data przywrócenia VAT: ${formatDate(subject.restorationDate)}`);
    if (subject.restorationBasis) lines.push(`Podstawa przywrócenia: ${subject.restorationBasis}`);
  }

  if (subject.representatives.length > 0) {
    lines.push("");
    lines.push("Osoby reprezentujące:");
    for (const rep of subject.representatives) lines.push(`  - ${rep}`);
  }

  if (subject.partners.length > 0) {
    lines.push("");
    lines.push("Wspólnicy:");
    for (const p of subject.partners) lines.push(`  - ${p}`);
  }

  if (subject.accountNumbers.length > 0) {
    lines.push("");
    lines.push("Rachunki bankowe:");
    for (const a of subject.accountNumbers) lines.push(`  - ${formatBankAccount(a)}`);
  }

  return lines.join("\n");
}

function renderCompany(subject: CompanySubject, ceidg: CeidgFirma | null) {
  companyTable.innerHTML = "";

  const vatStatus = formatStatusVat(subject.statusVat);
  const sole = isSoleProprietorship(subject);

  const rows: [string, string, string?][] = [];

  if (sole && ceidg) {
    rows.push(["Nazwa firmy", ceidg.nazwa]);
    rows.push(["Właściciel", subject.name]);
  } else if (sole) {
    rows.push(["Właściciel", subject.name]);
  } else {
    rows.push(["Nazwa", subject.name]);
  }

  rows.push(["NIP", subject.nip]);
  rows.push(["REGON", subject.regon || "—"]);
  if (!isSoleProprietorship(subject)) {
    rows.push(["KRS", subject.krs || "—"]);
  }
  rows.push(["Status VAT", vatStatus.text, vatStatus.className]);

  addAddressRows(rows, "Adres siedziby", subject.residenceAddress);
  addAddressRows(rows, "Adres działalności", subject.workingAddress);

  rows.push(["Data rejestracji VAT", formatDate(subject.registrationLegalDate)]);

  if (subject.removalDate) {
    rows.push(["Data wykreślenia z VAT", formatDate(subject.removalDate)]);
    if (subject.removalBasis) {
      rows.push(["Podstawa wykreślenia", subject.removalBasis]);
    }
  }

  if (subject.restorationDate) {
    rows.push(["Data przywrócenia VAT", formatDate(subject.restorationDate)]);
    if (subject.restorationBasis) {
      rows.push(["Podstawa przywrócenia", subject.restorationBasis]);
    }
  }

  for (const [label, value, className] of rows) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    const tdValue = document.createElement("td");
    tdValue.textContent = value;
    if (className) tdValue.className = className;
    tr.appendChild(tdLabel);
    tr.appendChild(tdValue);
    companyTable.appendChild(tr);
  }

  // Representatives
  if (subject.representatives.length > 0) {
    representativesList.innerHTML = "";
    for (const rep of subject.representatives) {
      const li = document.createElement("li");
      li.textContent = rep;
      representativesList.appendChild(li);
    }
    representativesSection.classList.remove("hidden");
  } else {
    representativesSection.classList.add("hidden");
  }

  // Partners
  if (subject.partners.length > 0) {
    partnersList.innerHTML = "";
    for (const partner of subject.partners) {
      const li = document.createElement("li");
      li.textContent = partner;
      partnersList.appendChild(li);
    }
    partnersSection.classList.remove("hidden");
  } else {
    partnersSection.classList.add("hidden");
  }

  // Bank accounts
  if (subject.accountNumbers.length > 0) {
    bankAccountsList.innerHTML = "";
    for (const account of subject.accountNumbers) {
      const li = document.createElement("li");
      li.textContent = formatBankAccount(account);
      bankAccountsList.appendChild(li);
    }
    bankAccountsSection.classList.remove("hidden");
  } else {
    bankAccountsSection.classList.add("hidden");
  }

  // Copy all button
  copyBtn.classList.remove("hidden");
  copyBtn.onclick = async () => {
    const text = buildCopyText(subject, ceidg);
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Skopiowano!";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "Kopiuj wszystko";
      copyBtn.classList.remove("copied");
    }, 2000);
  };

  result.classList.remove("hidden");
}

function formatBankAccount(account: string): string {
  const clean = account.replace(/\s/g, "");
  return clean.replace(/(.{2})(.{4})(.{4})(.{4})(.{4})(.{4})(.{4})/, "$1 $2 $3 $4 $5 $6 $7");
}

function getTodayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchCompany(nip: string): Promise<CompanySubject> {
  const date = getTodayDate();
  const url = `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${date}`;

  const response = await fetch(url);

  if (response.status === 400) {
    throw new Error("Nieprawidłowy NIP lub błędne zapytanie.");
  }
  if (response.status === 404) {
    throw new Error("Nie znaleziono podmiotu o podanym NIP.");
  }
  if (!response.ok) {
    throw new Error(`Błąd serwera (${response.status}). Spróbuj ponownie później.`);
  }

  const data: ApiResponse = await response.json();

  if (!data.result.subject) {
    throw new Error("Nie znaleziono podmiotu o podanym NIP.");
  }

  return data.result.subject;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  result.classList.add("hidden");
  copyBtn.classList.add("hidden");

  const nip = cleanNip(nipInput.value);
  const validationError = validateNip(nip);

  if (validationError) {
    showError(validationError);
    return;
  }

  loading.classList.remove("hidden");
  searchBtn.disabled = true;

  try {
    const [subject, ceidg] = await Promise.all([
      fetchCompany(nip),
      fetchCeidgFirma(nip),
    ]);
    renderCompany(subject, ceidg);
  } catch (err) {
    showError(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
  } finally {
    loading.classList.add("hidden");
    searchBtn.disabled = false;
  }
});
