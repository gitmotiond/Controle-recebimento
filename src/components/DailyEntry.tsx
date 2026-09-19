import { useState, useMemo, useEffect } from "react";
import type { AppData, Product } from "../types";
import { supabase } from "../supabaseClient";
import {
  upsertRecord,
  todayISO,
  calcFaltas,
  calcSobras,
  formatDateLong,
  deleteRecord,
  unitsToBoxes,
  formatBoxes,
} from "../storage";
import { isContainerPackaging, getCategorySlaHours } from "../types";
import {
  IconCalendar,
  IconCheck,
  IconAlert,
  IconDown,
  IconUp,
  IconClipboard,
  IconTrash,
} from "./Icons";
import SelectWithAdd from "./SelectWithAdd";
import { addConferente, addLocal } from "../storage";

type Props = {
  data: AppData;
  setData: (d: AppData) => void;
  notify: (msg: string, type?: "success" | "error" | "info") => void;
};

type InputMode = "unidade" | "caixa";

type RowState = {
  expectedUnits: number | "";
  receivedUnits: number | "";
  expectedMode: InputMode;
  receivedMode: InputMode;
  conferenteId: string;
  colaboradorId: string;
  localId: string;
  notes: string;
  saved: boolean;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
};

// Estado dos campos do dia (compartilhado por todos os produtos)
type DayInfo = {
  conferenteId: string;
  colaboradorId: string;
  localId: string;
};

// Retorna o valor comum (não-undefined) entre os registros do dia, se houver.
function findCommon<T>(values: (T | undefined)[]): T | undefined {
  const defined = values.filter((v): v is T => v !== undefined && v !== "");
  if (defined.length === 0) return undefined;
  const first = defined[0];
  const allSame = defined.every((v) => v === first);
  return allSame ? first : undefined;
}

export default function DailyEntry({ data, setData, notify }: Props) {
  const [date, setDate] = useState<string>(todayISO());
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [search, setSearch] = useState("");
  const [dayInfo, setDayInfo] = useState<DayInfo>({
    conferenteId: "",
    colaboradorId: "",
    localId: "",
  });

  const productList = useMemo(() => {
    const s = search.trim().toLowerCase();
    const sorted = [...data.products].sort((a, b) => a.code.localeCompare(b.code));
    if (!s) return sorted;
    return sorted.filter(
      (p) =>
        p.code.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s)
    );
  }, [data.products, search]);

  useEffect(() => {
    const newRows: Record<string, RowState> = {};
    // Tenta detectar o conferente/colaborador/local já usados em algum registro do dia
    const todaysRecords = data.records.filter((r) => r.date === date);
    const commonConferente = findCommon(todaysRecords.map((r) => r.conferenteId));
    const commonColaborador = findCommon(todaysRecords.map((r) => r.colaboradorId));
    const commonLocal = findCommon(todaysRecords.map((r) => r.localId));

    setDayInfo({
      conferenteId: commonConferente ?? "",
      colaboradorId: commonColaborador ?? "",
      localId: commonLocal ?? "",
    });

    data.products.forEach((p) => {
      const existing = data.records.find(
        (r) => r.productId === p.id && r.date === date
      );
      // expectedQuantity do cadastro é em UNIDADES (ex: 200 un. = 2 caixas de 100).
      // Só pré-preenche se for > 0, para não atrapalhar a digitação com "0".
      const defaultExpectedUnits = (p.expectedQuantity ?? 0) > 0 ? p.expectedQuantity : 0;
      newRows[p.id] = {
        // Se já existe registro salvo, mantém o que estava.
        // Caso contrário, deixa vazio se o padrão for 0 (não atrapalha digitação).
        expectedUnits: existing
          ? existing.expectedUnits
          : defaultExpectedUnits > 0
          ? defaultExpectedUnits
          : ("" as number | ""),
        receivedUnits: existing ? existing.receivedUnits : "",
        expectedMode: "unidade",
        receivedMode: "unidade",
        conferenteId: existing?.conferenteId ?? "",
        colaboradorId: existing?.colaboradorId ?? "",
        localId: existing?.localId ?? "",
        notes: existing?.notes ?? "",
        saved: !!existing,
      };
    });
    setRows(newRows);
  }, [date, data.products, data.records]);

  function updateRow(productId: string, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [productId]: {
          ...(prev[productId] ?? {
            expectedUnits: "" as number | "",
            receivedUnits: "" as number | "",
            expectedMode: "unidade" as InputMode,
            receivedMode: "unidade" as InputMode,
            conferenteId: "",
            colaboradorId: "",
            localId: "",
            notes: "",
            saved: false,
          }),
          ...patch,
      },
    }));
  }

  // Converte o valor digitado em um campo (de acordo com o modo) para UNIDADES.
  // mode "caixa" → multiplica por unitsPerBox.
  // mode "unidade" → retorna o próprio valor.
  function toUnits(value: number | "", mode: InputMode, product: Product): number {
    if (value === "" || value === 0) return 0;
    if (mode === "caixa" && isContainerPackaging(product.packaging) && product.unitsPerBox > 0) {
      return value * product.unitsPerBox;
    }
    return value;
  }

  // Converte o total em UNIDADES para o valor que deve aparecer no input
  // dependendo do modo selecionado (caixa ou unidade).
  function fromUnits(totalUnits: number, mode: InputMode, product: Product): number | "" {
    if (!totalUnits) return "";
    if (mode === "caixa" && isContainerPackaging(product.packaging) && product.unitsPerBox > 0) {
      return totalUnits / product.unitsPerBox;
    }
    return totalUnits;
  }

  function handleSave(product: Product) {
    const r = rows[product.id];
    if (!r) return;
    const expected = r.expectedUnits === "" ? 0 : Number(r.expectedUnits);
    const received = r.receivedUnits === "" ? 0 : Number(r.receivedUnits);
    if (expected < 0 || received < 0) {
      notify("Valores não podem ser negativos.", "error");
      return;
    }
    // Usa o conferente/colaborador/local do DIA (cabeçalho) se existir, senão o do row
    const conferenteId = dayInfo.conferenteId || r.conferenteId || undefined;
    const colaboradorId = dayInfo.colaboradorId || r.colaboradorId || undefined;
    const localId = dayInfo.localId || r.localId || undefined;
    setData(
      upsertRecord(data, {
        productId: product.id,
        date,
        expectedUnits: expected,
        receivedUnits: received,
        notes: r.notes,
        conferenteId,
        colaboradorId,
        localId,
        resolved: r.resolved ?? false,
        resolvedAt: r.resolvedAt,
        resolvedBy: r.resolvedBy,
      })
    );
    updateRow(product.id, {
      saved: true,
      conferenteId: conferenteId ?? "",
      colaboradorId: colaboradorId ?? "",
      localId: localId ?? "",
    });
    notify(`Lançamento salvo: ${product.description}`, "success");
  }

  async function handleClear(product: Product) {
  const r = rows[product.id];

  if (!r) return;

  const existing = data.records.find(
    (rec) =>
      rec.productId === product.id &&
      rec.date === date
  );

  // =====================================================
  // NÃO EXISTE LANÇAMENTO SALVO
  // =====================================================

  if (!existing) {
    updateRow(product.id, {
      expectedUnits: "",
      receivedUnits: "",
      expectedMode: "unidade",
      receivedMode: "unidade",
      notes: "",
      saved: false,
    });

    return;
  }

  if (
    !confirm(
      "Remover o lançamento deste produto nesta data?"
    )
  ) {
    return;
  }

  try {
    console.log(
      "🗑️ Excluindo lançamento do Supabase:",
      existing.id
    );

    // =====================================================
    // EXCLUIR DO SUPABASE
    // =====================================================

    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error(
        "❌ Erro ao excluir lançamento:",
        error
      );

      notify(
        "Não foi possível excluir o lançamento do Supabase.",
        "error"
      );

      return;
    }

    // =====================================================
    // ATUALIZAR A TELA
    // =====================================================

    setData({
      ...data,
      records: data.records.filter(
        (rec) => rec.id !== existing.id
      ),
    });

    updateRow(product.id, {
      expectedUnits: "",
      receivedUnits: "",
      expectedMode: "unidade",
      receivedMode: "unidade",
      conferenteId: "",
      colaboradorId: "",
      localId: "",
      notes: "",
      saved: false,
    });

    console.log(
      "✅ Lançamento excluído do Supabase:",
      existing.id
    );

    notify(
      "Lançamento removido.",
      "success"
    );

  } catch (error) {
    console.error(
      "❌ Erro inesperado ao excluir lançamento:",
      error
    );

    notify(
      "Ocorreu um erro ao excluir o lançamento.",
      "error"
    );
  }
}

  function fillAllExpected() {
    const updated: Record<string, RowState> = {};
    data.products.forEach((p) => {
      const r = rows[p.id] ?? {
        expectedUnits: "" as number | "",
        receivedUnits: "" as number | "",
        expectedMode: "unidade" as InputMode,
        receivedMode: "unidade" as InputMode,
        conferenteId: "",
        colaboradorId: "",
        localId: "",
        notes: "",
        saved: false,
      };
      updated[p.id] = { ...r, expectedUnits: r.expectedUnits === "" ? 0 : r.expectedUnits };
    });
    setRows(updated);
    notify("Quantidades esperadas preenchidas com 0.", "info");
  }

  function restoreAllDefaults() {
    const updated: Record<string, RowState> = {};
    let count = 0;
    data.products.forEach((p) => {
      const r = rows[p.id] ?? {
        expectedUnits: "" as number | "",
        receivedUnits: "" as number | "",
        expectedMode: "unidade" as InputMode,
        receivedMode: "unidade" as InputMode,
        conferenteId: "",
        colaboradorId: "",
        localId: "",
        notes: "",
        saved: false,
      };
      if (p.expectedQuantity > 0) {
        updated[p.id] = { ...r, expectedUnits: p.expectedQuantity };
        count += 1;
      } else {
        updated[p.id] = r;
      }
    });
    setRows(updated);
    if (count > 0) {
      notify(`Padrão restaurado em ${count} produto(s).`, "success");
    } else {
      notify("Nenhum produto possui quantidade padrão definida.", "info");
    }
  }

  const summary = useMemo(() => {
    let totalExpectedUnits = 0;
    let totalReceivedUnits = 0;
    let totalFaltasUnits = 0;
    let totalSobrasUnits = 0;
    let totalExpectedBoxes = 0;
    let totalReceivedBoxes = 0;
    let lancamentos = 0;
    data.products.forEach((p) => {
      const r = rows[p.id];
      if (!r) return;
      const e = r.expectedUnits === "" ? 0 : Number(r.expectedUnits);
      const rc = r.receivedUnits === "" ? 0 : Number(r.receivedUnits);
      totalExpectedUnits += e;
      totalReceivedUnits += rc;
      totalFaltasUnits += calcFaltas(e, rc);
      totalSobrasUnits += calcSobras(e, rc);
      totalExpectedBoxes += unitsToBoxes(e, p);
      totalReceivedBoxes += unitsToBoxes(rc, p);
      if (e > 0 || rc > 0) lancamentos += 1;
    });
    return {
      totalExpectedUnits,
      totalReceivedUnits,
      totalFaltasUnits,
      totalSobrasUnits,
      totalExpectedBoxes,
      totalReceivedBoxes,
      lancamentos,
    };
  }, [rows, data.products]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Lançamento Diário</h2>
        <p className="text-sm text-slate-500 mt-1">
          Escolha entre informar em <strong>unidades</strong> ou em <strong>caixas</strong>. Ao escolher "caixa" o sistema multiplica pelas unidades que vêm dentro.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Esperado</p>
            <IconCalendar className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalExpectedUnits}</p>
          <p className="text-xs text-slate-500 mt-1">
            un. · {formatBoxes(summary.totalExpectedBoxes)} cx.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recebido</p>
            <IconCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalReceivedUnits}</p>
          <p className="text-xs text-slate-500 mt-1">
            un. · {formatBoxes(summary.totalReceivedBoxes)} cx.
          </p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Faltas</p>
            <IconDown className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">{summary.totalFaltasUnits}</p>
          <p className="text-xs text-rose-500 mt-1">unidades faltantes</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Sobras</p>
            <IconUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{summary.totalSobrasUnits}</p>
          <p className="text-xs text-amber-500 mt-1">unidades excedentes</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Data do lançamento</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 capitalize">
              {formatDateLong(date)}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 sm:max-w-sm">
            <label className="text-sm font-medium text-slate-700">Buscar produto</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código ou descrição..."
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-slate-100 pt-4">
          <SelectWithAdd
            label="Conferente do dia"
            value={dayInfo.conferenteId}
            options={data.conferentes.map((c) => ({
              id: c.id,
              label: c.name,
              sublabel: c.registration,
            }))}
            onChange={(v) => {
              setDayInfo((d) => ({ ...d, conferenteId: v }));
              // Espelha para todas as linhas já existentes na tabela
              setRows((prev) => {
                const next: Record<string, RowState> = {};
                Object.keys(prev).forEach((k) => {
                  next[k] = { ...prev[k], conferenteId: v };
                });
                return next;
              });
            }}
            onAddNew={(text) => {
              const created = addConferente(data, { name: text });
              setData(created);
              const id = created.conferentes[created.conferentes.length - 1].id;
              notify(`Conferente "${text}" adicionado.`, "success");
              return id;
            }}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Colaborador DPP (Depto. Prevenção e Perdas)
            </label>
            <select
              value={dayInfo.colaboradorId}
              onChange={(e) => {
                const v = e.target.value;
                setDayInfo((d) => ({ ...d, colaboradorId: v }));
                setRows((prev) => {
                  const next: Record<string, RowState> = {};
                  Object.keys(prev).forEach((k) => {
                    next[k] = { ...prev[k], colaboradorId: v };
                  });
                  return next;
                });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Selecione —</option>
              {data.colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          </div>
          <SelectWithAdd
            label="Local de Origem"
            value={dayInfo.localId}
            options={data.locais.map((l) => ({
              id: l.id,
              label: l.name,
              sublabel: [l.city, l.state].filter(Boolean).join(" / ") || undefined,
            }))}
            onChange={(v) => {
              setDayInfo((d) => ({ ...d, localId: v }));
              setRows((prev) => {
                const next: Record<string, RowState> = {};
                Object.keys(prev).forEach((k) => {
                  next[k] = { ...prev[k], localId: v };
                });
                return next;
              });
            }}
            onAddNew={(text) => {
              const created = addLocal(data, { name: text });
              setData(created);
              const id = created.locais[created.locais.length - 1].id;
              notify(`Local "${text}" adicionado.`, "success");
              return id;
            }}
          />
        </div>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-end gap-2 flex-wrap">
            <button
              onClick={restoreAllDefaults}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition"
              title="Preencher com a quantidade padrão (em unidades) definida no cadastro"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Usar padrão
            </button>
            <button
              onClick={fillAllExpected}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <IconClipboard className="h-4 w-4" />
              Zerar esperado
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 font-semibold">
              ⏱ Perecíveis: SLA 12h
            </span>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-700 font-semibold">
              ⏱ Carga seca: SLA 24h
            </span>
          </div>
        </div>
      </div>

      {data.products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <IconAlert className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            Nenhum produto cadastrado
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre produtos na aba "Produtos" antes de fazer lançamentos.
          </p>
        </div>
      ) : productList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Nenhum produto corresponde à busca.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Código / Descrição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Categoria / SLA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Acondicionamento
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Esperado (un.)
                    <div className="text-[10px] font-normal normal-case text-slate-400 mt-0.5">
                      padrão do cadastro
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Recebido (un.)
                    <div className="text-[10px] font-normal normal-case text-slate-400 mt-0.5">
                      o que chegou
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Falta
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sobra
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {productList.map((p) => {
                  const r = rows[p.id] ?? {
                    expectedUnits: "" as number | "",
                    receivedUnits: "" as number | "",
                    expectedMode: "unidade" as InputMode,
                    receivedMode: "unidade" as InputMode,
                    conferenteId: "",
                    colaboradorId: "",
                    localId: "",
                    notes: "",
                    saved: false,
                  };
                  const e = r.expectedUnits === "" ? 0 : Number(r.expectedUnits);
                  const rc = r.receivedUnits === "" ? 0 : Number(r.receivedUnits);
                  const fUnits = calcFaltas(e, rc);
                  const sUnits = calcSobras(e, rc);
                  const isContainer = isContainerPackaging(p.packaging);
                  return (
                    <tr key={p.id} className={r.saved ? "bg-emerald-50/30" : ""}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-mono font-semibold text-slate-700">
                          {p.code}
                        </div>
                        <div className="text-sm text-slate-800">{p.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold " +
                            (p.category === "perecivel"
                              ? "bg-rose-100 text-rose-700"
                              : p.category === "cargaSeca"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-100 text-slate-700")
                          }
                        >
                          {p.category === "perecivel"
                            ? "Perecível"
                            : p.category === "cargaSeca"
                            ? "Carga Seca"
                            : "Outro"}{" "}
                          · {getCategorySlaHours(p.category || "cargaSeca")}h
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        <div className="font-semibold text-slate-700">{p.packaging}</div>
                        <div className="text-xs text-slate-500">
                          {isContainer
                            ? `1 ${p.packaging.toLowerCase()} = ${p.unitsPerBox} un.`
                            : "1 = 1 unidade"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isContainer && (
                          <div className="mb-1.5 flex justify-center">
                            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                              <button
                                type="button"
                                onClick={() => updateRow(p.id, { expectedMode: "unidade" })}
                                className={
                                  "rounded px-2 py-0.5 text-[10px] font-semibold transition " +
                                  (r.expectedMode === "unidade"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700")
                                }
                                title="Informar em unidades"
                              >
                                UN
                              </button>
                              <button
                                type="button"
                                onClick={() => updateRow(p.id, { expectedMode: "caixa" })}
                                className={
                                  "rounded px-2 py-0.5 text-[10px] font-semibold transition " +
                                  (r.expectedMode === "caixa"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700")
                                }
                                title={`Informar em ${p.packaging.toLowerCase()} (será multiplicado por ${p.unitsPerBox})`}
                              >
                                {p.packaging.toUpperCase().slice(0, 4)}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step={r.expectedMode === "caixa" && p.unitsPerBox > 0 ? 1 : 1}
                            value={fromUnits(e, r.expectedMode, p)}
                            onChange={(ev) => {
                              const raw = ev.target.value === "" ? "" : Number(ev.target.value);
                              updateRow(p.id, { expectedUnits: toUnits(raw, r.expectedMode, p), saved: false });
                            }}
                            className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
                            placeholder="Prev."
                            title="Quantidade prevista/esperada para hoje. Se veio a mais (sobra) ou a menos (falta), informe aqui o que era previsto e o sistema calcula a diferença."
                          />
                          {r.expectedUnits !== "" && r.expectedUnits !== 0 && (
                            <button
                              type="button"
                              onClick={() => updateRow(p.id, { expectedUnits: "" })}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                              title="Limpar previsto (deixar em branco)"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                              >
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          {(r.expectedUnits === "" || Number(r.expectedUnits) !== p.expectedQuantity) && p.expectedQuantity > 0 && (
                            <button
                              type="button"
                              onClick={() => updateRow(p.id, { expectedUnits: p.expectedQuantity })}
                              className="rounded-md p-1 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition"
                              title={`Usar padrão: ${p.expectedQuantity} un.`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5"
                              >
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="mt-1 text-center text-[10px] text-slate-500">
                          {r.expectedMode === "caixa" && isContainer ? (
                            <span className="block font-bold text-indigo-700">
                              = {e} un. ({e} × {p.unitsPerBox})
                            </span>
                          ) : (
                            e > 0 && isContainer && (
                              <span className="block font-semibold text-slate-600">
                                = {formatBoxes(unitsToBoxes(e, p))} {p.packaging.toLowerCase()}
                              </span>
                            )
                          )}
                          {p.expectedQuantity > 0 && (
                            <span className="block text-indigo-600 font-semibold">
                              padrão: {p.expectedQuantity} un. ({formatBoxes(unitsToBoxes(p.expectedQuantity, p))} {p.packaging.toLowerCase()})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isContainer && (
                          <div className="mb-1.5 flex justify-center">
                            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                              <button
                                type="button"
                                onClick={() => updateRow(p.id, { receivedMode: "unidade" })}
                                className={
                                  "rounded px-2 py-0.5 text-[10px] font-semibold transition " +
                                  (r.receivedMode === "unidade"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700")
                                }
                                title="Informar em unidades"
                              >
                                UN
                              </button>
                              <button
                                type="button"
                                onClick={() => updateRow(p.id, { receivedMode: "caixa" })}
                                className={
                                  "rounded px-2 py-0.5 text-[10px] font-semibold transition " +
                                  (r.receivedMode === "caixa"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700")
                                }
                                title={`Informar em ${p.packaging.toLowerCase()} (será multiplicado por ${p.unitsPerBox})`}
                              >
                                {p.packaging.toUpperCase().slice(0, 4)}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={fromUnits(rc, r.receivedMode, p)}
                            onChange={(ev) => {
                              const raw = ev.target.value === "" ? "" : Number(ev.target.value);
                              updateRow(p.id, { receivedUnits: toUnits(raw, r.receivedMode, p), saved: false });
                            }}
                            className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        <div className="mt-1 text-center text-[10px] text-slate-500">
                          {r.receivedMode === "caixa" && isContainer ? (
                            rc > 0 && (
                              <span className="block font-bold text-indigo-700">
                                = {rc} un. ({rc} × {p.unitsPerBox})
                              </span>
                            )
                          ) : (
                            rc > 0 && isContainer && (
                              <span className="block font-semibold text-slate-600">
                                = {formatBoxes(unitsToBoxes(rc, p))} {p.packaging.toLowerCase()}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {fUnits > 0 ? (
                          <span className="inline-flex flex-col items-center gap-0.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                            <span className="inline-flex items-center gap-1">
                              <IconDown className="h-3 w-3" /> {fUnits} un.
                            </span>
                            {isContainer && (
                              <span className="text-[10px] text-rose-600 font-medium">
                                = {formatBoxes(unitsToBoxes(fUnits, p))} {p.packaging.toLowerCase()}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {sUnits > 0 ? (
                          <span className="inline-flex flex-col items-center gap-0.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            <span className="inline-flex items-center gap-1">
                              <IconUp className="h-3 w-3" /> {sUnits} un.
                            </span>
                            {isContainer && (
                              <span className="text-[10px] text-amber-600 font-medium">
                                = {formatBoxes(unitsToBoxes(sUnits, p))} {p.packaging.toLowerCase()}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleSave(p)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                            title="Salvar lançamento"
                          >
                            <IconCheck className="h-3.5 w-3.5" /> Salvar
                          </button>
                          <button
                            onClick={() => handleClear(p)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Limpar"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
