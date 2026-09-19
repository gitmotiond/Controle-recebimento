export type ProductCategory = "perecivel" | "cargaSeca" | "outro";

export type Product = {
  id: string;
  code: string;
  description: string;
  packaging: string;
  unitsPerBox: number;
  expectedQuantity: number;
  category: ProductCategory;
  createdAt: string;
};

export type DailyRecord = {
  id: string;
  productId: string;
  date: string;
  expectedUnits: number;
  receivedUnits: number;
  notes?: string;
  conferenteId?: string;
  colaboradorId?: string;
  localId?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
};

export type Conferente = {
  id: string;
  name: string;
  registration?: string;
  createdAt: string;
};

export type Colaborador = {
  id: string;
  name: string;
  role: string;
  createdAt: string;
};

export type Local = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  createdAt: string;
};

export type AppData = {
  products: Product[];
  records: DailyRecord[];
  conferentes: Conferente[];
  colaboradores: Colaborador[];
  locais: Local[];
};

export const PACKAGING_OPTIONS = [
  "Unidade",
  "Caixa",
  "Fardo",
  "Pacote",
  "Saca",
  "Galão",
  "Tambor",
  "Pallet",
  "Envelope",
  "Saco",
  "Outro",
];

export const PRODUCT_CATEGORIES: {
  id: ProductCategory;
  label: string;
  slaHours: number;
  color: string;
  description: string;
}[] = [
  {
    id: "perecivel",
    label: "Perecível",
    slaHours: 12,
    color: "rose",
    description:
      "Faltas/sobras devem ser resolvidas em até 12 horas.",
  },
  {
    id: "cargaSeca",
    label: "Carga Seca",
    slaHours: 24,
    color: "sky",
    description:
      "Faltas/sobras devem ser resolvidas em até 24 horas.",
  },
  {
    id: "outro",
    label: "Outro",
    slaHours: 24,
    color: "slate",
    description:
      "Faltas/sobras devem ser resolvidas em até 24 horas.",
  },
];

export function getCategorySlaHours(
  category: ProductCategory
): number {
  return (
    PRODUCT_CATEGORIES.find(
      (c) => c.id === category
    )?.slaHours ?? 24
  );
}

export function getCategoryLabel(
  category: ProductCategory
): string {
  return (
    PRODUCT_CATEGORIES.find(
      (c) => c.id === category
    )?.label ?? "Outro"
  );
}

export function normalizeRecord(
  r: DailyRecord
): DailyRecord {
  return {
    ...r,
    resolved:
      typeof r.resolved === "boolean"
        ? r.resolved
        : false,

    category:
      ((r as unknown as {
        category?: ProductCategory;
      }).category) ?? "cargaSeca",
  } as DailyRecord;
}

export function normalizeProduct(
  p: Product
): Product {
  return {
    ...p,
    category:
      (p.category as ProductCategory) ??
      "cargaSeca",
  } as Product;
}

export function normalizeData(
  data: AppData
): AppData {
  return {
    ...data,

    products:
      (data.products ?? []).map(
        normalizeProduct
      ),

    records:
      (data.records ?? []).map(
        normalizeRecord
      ),

    conferentes:
      data.conferentes ?? [],

    colaboradores:
      data.colaboradores ?? [],

    locais:
      data.locais ?? [],
  };
}

export function isContainerPackaging(
  packaging: string
): boolean {
  return packaging !== "Unidade";
}