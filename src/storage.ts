import type { AppData, Product, DailyRecord } from "./types";
import { isContainerPackaging, normalizeData } from "./types";

const STORAGE_KEY = "controle-recebimento-data-v1";

// Sugestões pré-definidas de locais e conferentes. Ao criar um novo app,
// esses itens já aparecem como opções nos selects. O usuário pode editá-los
// ou adicionar mais à vontade.
export const SUGGESTED_LOCAIS: { name: string; city?: string; state?: string }[] = [
  { name: "Campo Grande", city: "Rio de Janeiro", state: "RJ" },
  { name: "Vista Alegre", city: "Rio de Janeiro", state: "RJ" },
  { name: "CD Campos", city: "Campos dos Goytacazes", state: "RJ" },
  { name: "Curicica", city: "Rio de Janeiro", state: "RJ" },
];

export const SUGGESTED_CONFERENTES: { name: string; registration?: string }[] = [
  { name: "Rafael" },
  { name: "Felipe" },
  { name: "Nicolas" },
  { name: "Sérgio" },
];

export const SUGGESTED_COLABORADORES: { name: string; role: string }[] = [
  { name: "Samuel", role: "DPP - Departamento de Prevenção e Perdas" },
  { name: "Plínio", role: "DPP - Departamento de Prevenção e Perdas" },
  { name: "Jonathan", role: "DPP - Departamento de Prevenção e Perdas" },
];

function buildDefaultData(): AppData {
  const now = new Date().toISOString();

  return {
    products: [],
    records: [],
    conferentes: SUGGESTED_CONFERENTES.map((c) => ({
      id: newId(),
      name: c.name,
      registration: c.registration,
      createdAt: now,
    })),
    colaboradores: SUGGESTED_COLABORADORES.map((c) => ({
      id: newId(),
      name: c.name,
      role: c.role,
      createdAt: now,
    })),
    locais: SUGGESTED_LOCAIS.map((l) => ({
      id: newId(),
      name: l.name,
      city: l.city,
      state: l.state,
      createdAt: now,
    })),
  };
}

const defaultData: AppData = buildDefaultData();
const SEEDED_KEY = "controle-recebimento-seeded-v1";

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const seeded = localStorage.getItem(SEEDED_KEY);

    if (!raw && !seeded) {
      const data = normalizeData({ ...defaultData });
      localStorage.setItem(SEEDED_KEY, "1");
      return data;
    }

    if (!raw) return normalizeData({ ...defaultData });

    const parsed = JSON.parse(raw) as Partial<AppData>;

    return normalizeData({
      products: Array.isArray(parsed.products) ? parsed.products : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      conferentes: Array.isArray(parsed.conferentes) ? parsed.conferentes : [],
      colaboradores: Array.isArray(parsed.colaboradores) ? parsed.colaboradores : [],
      locais: Array.isArray(parsed.locais) ? parsed.locais : [],
    });
  } catch {
    return normalizeData({ ...defaultData });
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function addProduct(
  data: AppData,
  product: Omit<Product, "id" | "createdAt">
): AppData {
  const newProduct: Product = {
    ...product,
    id: newId(),
    createdAt: new Date().toISOString(),
  };

  return {
    ...data,
    products: [...data.products, newProduct],
  };
}

export function updateProduct(data: AppData, product: Product): AppData {
  return {
    ...data,
    products: data.products.map((p) =>
      p.id === product.id ? product : p
    ),
  };
}

export function deleteProduct(data: AppData, productId: string): AppData {
  return {
    ...data,
    products: data.products.filter((p) => p.id !== productId),
    records: data.records.filter((r) => r.productId !== productId),
  };
}

// --- Conferentes ---

export function addConferente(
  data: AppData,
  item: Omit<import("./types").Conferente, "id" | "createdAt">
): AppData {
  return {
    ...data,
    conferentes: [
      ...data.conferentes,
      {
        ...item,
        id: newId(),
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function updateConferente(
  data: AppData,
  item: import("./types").Conferente
): AppData {
  return {
    ...data,
    conferentes: data.conferentes.map((c) =>
      c.id === item.id ? item : c
    ),
  };
}

export function deleteConferente(data: AppData, id: string): AppData {
  return {
    ...data,
    conferentes: data.conferentes.filter((c) => c.id !== id),
  };
}

// --- Colaboradores ---

export function addColaborador(
  data: AppData,
  item: Omit<import("./types").Colaborador, "id" | "createdAt">
): AppData {
  return {
    ...data,
    colaboradores: [
      ...data.colaboradores,
      {
        ...item,
        id: newId(),
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function updateColaborador(
  data: AppData,
  item: import("./types").Colaborador
): AppData {
  return {
    ...data,
    colaboradores: data.colaboradores.map((c) =>
      c.id === item.id ? item : c
    ),
  };
}

export function deleteColaborador(data: AppData, id: string): AppData {
  return {
    ...data,
    colaboradores: data.colaboradores.filter((c) => c.id !== id),
  };
}

// --- Locais ---

export function addLocal(
  data: AppData,
  item: Omit<import("./types").Local, "id" | "createdAt">
): AppData {
  return {
    ...data,
    locais: [
      ...data.locais,
      {
        ...item,
        id: newId(),
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function updateLocal(
  data: AppData,
  item: import("./types").Local
): AppData {
  return {
    ...data,
    locais: data.locais.map((c) =>
      c.id === item.id ? item : c
    ),
  };
}

export function deleteLocal(data: AppData, id: string): AppData {
  return {
    ...data,
    locais: data.locais.filter((c) => c.id !== id),
  };
}

// --- Registros diários ---

export function upsertRecord(
  data: AppData,
  record: Omit<DailyRecord, "id" | "createdAt"> & { id?: string }
): AppData {
  const existing = data.records.find(
    (r) =>
      r.productId === record.productId &&
      r.date === record.date
  );

  if (existing) {
    return {
      ...data,
      records: data.records.map((r) =>
        r.productId === record.productId &&
        r.date === record.date
          ? {
              ...r,
              expectedUnits: record.expectedUnits,
              receivedUnits: record.receivedUnits,
              notes: record.notes,
              conferenteId: record.conferenteId,
              colaboradorId: record.colaboradorId,
              localId: record.localId,
              resolved: record.resolved,
              resolvedAt: record.resolvedAt,
              resolvedBy: record.resolvedBy,
            }
          : r
      ),
    };
  }

  const newRecord: DailyRecord = {
    id: record.id ?? newId(),
    productId: record.productId,
    date: record.date,
    expectedUnits: record.expectedUnits,
    receivedUnits: record.receivedUnits,
    notes: record.notes,
    conferenteId: record.conferenteId,
    colaboradorId: record.colaboradorId,
    localId: record.localId,
    resolved: record.resolved ?? false,
    resolvedAt: record.resolvedAt,
    resolvedBy: record.resolvedBy,
    createdAt: new Date().toISOString(),
  };

  return {
    ...data,
    records: [...data.records, newRecord],
  };
}

export function deleteRecord(
  data: AppData,
  recordId: string
): AppData {
  return {
    ...data,
    records: data.records.filter((r) => r.id !== recordId),
  };
}

export function calcFaltas(
  expected: number,
  received: number
): number {
  const diff = expected - received;
  return diff > 0 ? diff : 0;
}

export function calcSobras(
  expected: number,
  received: number
): number {
  const diff = received - expected;
  return diff > 0 ? diff : 0;
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function listMonthsInRange(): string[] {
  const months: string[] = [];
  const today = new Date();

  for (let i = -6; i <= 6; i++) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth() + i,
      1
    );

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");

    months.push(`${y}-${m}`);
  }

  return months;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  const date = new Date(
    Number(y),
    Number(m) - 1,
    1
  );

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-");

  const date = new Date(
    Number(y),
    Number(m) - 1,
    Number(d)
  );

  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function calcTotalUnits(
  qty: number,
  product: Product
): number {
  if (!isContainerPackaging(product.packaging)) {
    return qty;
  }

  return qty * (product.unitsPerBox || 0);
}

export function unitsToBoxes(
  units: number,
  product: Product
): number {
  if (!isContainerPackaging(product.packaging)) {
    return units;
  }

  const upb = product.unitsPerBox || 1;
  return units / upb;
}

export function boxesToUnits(
  boxes: number,
  product: Product
): number {
  if (!isContainerPackaging(product.packaging)) {
    return boxes;
  }

  return boxes * (product.unitsPerBox || 0);
}

export function formatBoxes(n: number): string {
  if (Number.isInteger(n)) {
    return n.toString();
  }

  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function todayISO(): string {
  const d = new Date();

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}
