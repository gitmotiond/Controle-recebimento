import { useState, useMemo } from "react";
import type { AppData, DailyRecord } from "../types";
import {
  formatMonthLabel,
  formatDate,
  listMonthsInRange,
  calcFaltas,
  calcSobras,
  todayISO,
  unitsToBoxes,
  formatBoxes,
} from "../storage";
import { isContainerPackaging } from "../types";
import {
  IconCalendar,
  IconDown,
  IconUp,
  IconDownload,
  IconReport,
  IconCheck,
  IconAlert,
} from "./Icons";
import ShareButtons from "./ShareButtons";

type Props = {
  data: AppData;
  notify: (msg: string, type?: "success" | "error" | "info") => void;
};

type DayGroup = {
  date: string;
  expected: number;
  received: number;
  faltas: number;
  sobras: number;
  expectedBoxes: number;
  receivedBoxes: number;
  items: DailyRecord[];
};

function DailyFaltasSobras({
  byDay,
  data,
}: {
  byDay: DayGroup[];
  data: AppData;
}) {
  // Totaliza todas as faltas e sobras do mês
  const totalFaltas = byDay.reduce((acc, d) => acc + d.faltas, 0);
  const totalSobras = byDay.reduce((acc, d) => acc + d.sobras, 0);
  const diasComFalta = byDay.filter((d) => d.faltas > 0).length;
  const diasComSobra = byDay.filter((d) => d.sobras > 0).length;

  // Monta linhas detalhadas: uma linha por produto/dia com tipo e quantidade
  type Linha = {
    date: string;
    code: string;
    description: string;
    packaging: string;
    unitsPerBox: number;
    isContainer: boolean;
    expectedUnits: number;
    receivedUnits: number;
    tipo: "FALTA" | "SOBRA" | "OK";
    quantidade: number;
    conferenteName?: string;
    colaboradorName?: string;
    localName?: string;
  };

  const linhas: Linha[] = [];
  byDay.forEach((d) => {
    const conferirente = data.conferentes.find(
      (c) => c.id === d.items.find((it) => it.conferenteId)?.conferenteId
    );
    const colaborador = data.colaboradores.find(
      (c) => c.id === d.items.find((it) => it.colaboradorId)?.colaboradorId
    );
    const local = data.locais.find(
      (l) => l.id === d.items.find((it) => it.localId)?.localId
    );
    d.items.forEach((it) => {
      const product = data.products.find((p) => p.id === it.productId);
      const f = calcFaltas(it.expectedUnits, it.receivedUnits);
      const s = calcSobras(it.expectedUnits, it.receivedUnits);
      const isCont = product ? isContainerPackaging(product.packaging) : false;
      const ctx = {
        conferenteName: conferirente?.name,
        colaboradorName: colaborador?.name,
        localName: local?.name,
      };
      if (f > 0) {
        linhas.push({
          date: d.date,
          code: product?.code ?? "—",
          description: product?.description ?? "—",
          packaging: product?.packaging ?? "—",
          unitsPerBox: product?.unitsPerBox ?? 1,
          isContainer: isCont,
          expectedUnits: it.expectedUnits,
          receivedUnits: it.receivedUnits,
          tipo: "FALTA",
          quantidade: f,
          ...ctx,
        });
      } else if (s > 0) {
        linhas.push({
          date: d.date,
          code: product?.code ?? "—",
          description: product?.description ?? "—",
          packaging: product?.packaging ?? "—",
          unitsPerBox: product?.unitsPerBox ?? 1,
          isContainer: isCont,
          expectedUnits: it.expectedUnits,
          receivedUnits: it.receivedUnits,
          tipo: "SOBRA",
          quantidade: s,
          ...ctx,
        });
      } else {
        linhas.push({
          date: d.date,
          code: product?.code ?? "—",
          description: product?.description ?? "—",
          packaging: product?.packaging ?? "—",
          unitsPerBox: product?.unitsPerBox ?? 1,
          isContainer: isCont,
          expectedUnits: it.expectedUnits,
          receivedUnits: it.receivedUnits,
          tipo: "OK",
          quantidade: 0,
          ...ctx,
        });
      }
    });
  });

  // Renderiza uma linha da tabela
  const LinhaTabela = ({ l }: { l: Linha }) => {
    const isFalta = l.tipo === "FALTA";
    const isSobra = l.tipo === "SOBRA";
    return (
      <tr
        className={
          (isFalta ? "bg-rose-50/30" : isSobra ? "bg-amber-50/30" : "bg-white") +
          " border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
        }
      >
        <td className="px-3 py-2 text-xs font-semibold text-slate-800 whitespace-nowrap">
          {formatDate(l.date)}
        </td>
        <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
          {l.conferenteName ? (
            <span className="font-semibold">{l.conferenteName}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
          {l.colaboradorName ? (
            <span className="font-semibold">{l.colaboradorName}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
          {l.localName ? (
            <span className="font-semibold">{l.localName}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="font-mono text-xs text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
            {l.code}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-slate-800">
          <div className="max-w-[240px] truncate" title={l.description}>
            {l.description}
          </div>
        </td>
        <td className="px-3 py-2 text-xs text-right text-slate-700 whitespace-nowrap">
          {l.expectedUnits}
        </td>
        <td className="px-3 py-2 text-xs text-right text-slate-700 whitespace-nowrap">
          {l.receivedUnits}
        </td>
        <td className="px-3 py-2 text-right whitespace-nowrap">
          {l.tipo === "OK" ? (
            <span className="text-xs text-slate-400">—</span>
          ) : (
            <div>
              <div
                className={
                  "text-sm font-bold " +
                  (isFalta ? "text-rose-700" : "text-amber-700")
                }
              >
                {isFalta ? "−" : "+"}
                {l.quantidade} un.
              </div>
              {l.isContainer && (
                <div
                  className={
                    "text-[10px] font-semibold " +
                    (isFalta ? "text-rose-600" : "text-amber-600")
                  }
                >
                  = {formatBoxes(l.quantidade / l.unitsPerBox)} {l.packaging.toLowerCase()}
                </div>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <IconDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Total de Faltas no Mês</h3>
                <p className="text-xs text-rose-700">
                  {diasComFalta} {diasComFalta === 1 ? "dia com falta" : "dias com falta"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-rose-700">{totalFaltas}</p>
              <p className="text-[10px] uppercase tracking-wider text-rose-600">unidades</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <IconUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Total de Sobras no Mês</h3>
                <p className="text-xs text-amber-700">
                  {diasComSobra} {diasComSobra === 1 ? "dia com sobra" : "dias com sobra"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-700">{totalSobras}</p>
              <p className="text-[10px] uppercase tracking-wider text-amber-600">unidades</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela completa de Faltas */}
      <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <IconDown className="h-5 w-5 text-rose-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-700">
              Faltas detalhadas
            </h3>
          </div>
          <span className="rounded-full bg-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800">
            {linhas.filter((l) => l.tipo === "FALTA").length}{" "}
            {linhas.filter((l) => l.tipo === "FALTA").length === 1 ? "ocorrência" : "ocorrências"} ·{" "}
            {totalFaltas} un.
          </span>
        </div>
        {linhas.filter((l) => l.tipo === "FALTA").length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-500 italic">
              Nenhuma falta registrada neste mês.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-rose-50/60 text-[11px] uppercase tracking-wider text-rose-800">
                  <th className="px-3 py-2 text-left font-semibold">Data</th>
                  <th className="px-3 py-2 text-left font-semibold">Conferente</th>
                  <th className="px-3 py-2 text-left font-semibold">DPP</th>
                  <th className="px-3 py-2 text-left font-semibold">Local</th>
                  <th className="px-3 py-2 text-left font-semibold">Código</th>
                  <th className="px-3 py-2 text-left font-semibold">Produto</th>
                  <th className="px-3 py-2 text-right font-semibold">Esperado</th>
                  <th className="px-3 py-2 text-right font-semibold">Recebido</th>
                  <th className="px-3 py-2 text-right font-semibold">Qtd.</th>
                </tr>
              </thead>
              <tbody>
                {linhas
                  .filter((l) => l.tipo === "FALTA")
                  .map((l) => (
                    <LinhaTabela key={`f-${l.date}-${l.code}`} l={l} />
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-rose-100/60 font-bold">
                  <td colSpan={8} className="px-3 py-2 text-right text-xs uppercase tracking-wider text-rose-900">
                    Total de faltas no mês
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-rose-800">
                    −{totalFaltas} un.
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Tabela completa de Sobras */}
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <IconUp className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700">
              Sobras detalhadas
            </h3>
          </div>
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            {linhas.filter((l) => l.tipo === "SOBRA").length}{" "}
            {linhas.filter((l) => l.tipo === "SOBRA").length === 1 ? "ocorrência" : "ocorrências"} ·{" "}
            {totalSobras} un.
          </span>
        </div>
        {linhas.filter((l) => l.tipo === "SOBRA").length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-500 italic">
              Nenhuma sobra registrada neste mês.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-amber-50/60 text-[11px] uppercase tracking-wider text-amber-800">
                  <th className="px-3 py-2 text-left font-semibold">Data</th>
                  <th className="px-3 py-2 text-left font-semibold">Conferente</th>
                  <th className="px-3 py-2 text-left font-semibold">DPP</th>
                  <th className="px-3 py-2 text-left font-semibold">Local</th>
                  <th className="px-3 py-2 text-left font-semibold">Código</th>
                  <th className="px-3 py-2 text-left font-semibold">Produto</th>
                  <th className="px-3 py-2 text-right font-semibold">Esperado</th>
                  <th className="px-3 py-2 text-right font-semibold">Recebido</th>
                  <th className="px-3 py-2 text-right font-semibold">Qtd.</th>
                </tr>
              </thead>
              <tbody>
                {linhas
                  .filter((l) => l.tipo === "SOBRA")
                  .map((l) => (
                    <LinhaTabela key={`s-${l.date}-${l.code}`} l={l} />
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-100/60 font-bold">
                  <td colSpan={8} className="px-3 py-2 text-right text-xs uppercase tracking-wider text-amber-900">
                    Total de sobras no mês
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-amber-800">
                    +{totalSobras} un.
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reports({ data, notify }: Props) {
  const [month, setMonth] = useState<string>(todayISO().slice(0, 7));
  const [view, setView] = useState<"resumo" | "produto" | "dia" | "faltasSobras">("resumo");

  const months = useMemo(() => listMonthsInRange(), []);

  const monthRecords: DailyRecord[] = useMemo(() => {
    return data.records
      .filter((r) => r.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.records, month]);

  const summary = useMemo(() => {
    let totalExpected = 0;
    let totalReceived = 0;
    let totalFaltas = 0;
    let totalSobras = 0;
    let totalExpectedBoxes = 0;
    let totalReceivedBoxes = 0;
    let diasAtendidos = new Set<string>();
    monthRecords.forEach((r) => {
      totalExpected += r.expectedUnits;
      totalReceived += r.receivedUnits;
      totalFaltas += calcFaltas(r.expectedUnits, r.receivedUnits);
      totalSobras += calcSobras(r.expectedUnits, r.receivedUnits);
      const product = data.products.find((p) => p.id === r.productId);
      if (product) {
        totalExpectedBoxes += unitsToBoxes(r.expectedUnits, product);
        totalReceivedBoxes += unitsToBoxes(r.receivedUnits, product);
      }
      if (r.expectedUnits > 0 || r.receivedUnits > 0) diasAtendidos.add(r.date);
    });
    const eficiencia =
      totalExpected > 0
        ? Math.min(100, (totalReceived / totalExpected) * 100)
        : 0;
    return {
      totalExpected,
      totalReceived,
      totalFaltas,
      totalSobras,
      totalExpectedBoxes,
      totalReceivedBoxes,
      diasAtendidos: diasAtendidos.size,
      eficiencia,
    };
  }, [monthRecords, data.products]);

  const byDay = useMemo(() => {
    const map = new Map<
      string,
      { expected: number; received: number; faltas: number; sobras: number; expectedBoxes: number; receivedBoxes: number; items: DailyRecord[] }
    >();
    monthRecords.forEach((r) => {
      const cur = map.get(r.date) ?? { expected: 0, received: 0, faltas: 0, sobras: 0, expectedBoxes: 0, receivedBoxes: 0, items: [] };
      cur.expected += r.expectedUnits;
      cur.received += r.receivedUnits;
      cur.faltas += calcFaltas(r.expectedUnits, r.receivedUnits);
      cur.sobras += calcSobras(r.expectedUnits, r.receivedUnits);
      const product = data.products.find((p) => p.id === r.productId);
      if (product) {
        cur.expectedBoxes += unitsToBoxes(r.expectedUnits, product);
        cur.receivedBoxes += unitsToBoxes(r.receivedUnits, product);
      }
      cur.items.push(r);
      map.set(r.date, cur);
    });
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthRecords, data.products]);

  const byProduct = useMemo(() => {
    const map = new Map<
      string,
      { expected: number; received: number; faltas: number; sobras: number; expectedBoxes: number; receivedBoxes: number; items: DailyRecord[] }
    >();
    monthRecords.forEach((r) => {
      const cur = map.get(r.productId) ?? { expected: 0, received: 0, faltas: 0, sobras: 0, expectedBoxes: 0, receivedBoxes: 0, items: [] };
      cur.expected += r.expectedUnits;
      cur.received += r.receivedUnits;
      cur.faltas += calcFaltas(r.expectedUnits, r.receivedUnits);
      cur.sobras += calcSobras(r.expectedUnits, r.receivedUnits);
      const product = data.products.find((p) => p.id === r.productId);
      if (product) {
        cur.expectedBoxes += unitsToBoxes(r.expectedUnits, product);
        cur.receivedBoxes += unitsToBoxes(r.receivedUnits, product);
      }
      cur.items.push(r);
      map.set(r.productId, cur);
    });
    return Array.from(map.entries())
      .map(([productId, v]) => {
        const product = data.products.find((p) => p.id === productId);
        return { productId, product, ...v };
      })
      .filter((x) => !!x.product)
      .sort((a, b) => b.faltas + b.sobras - (a.faltas + a.sobras));
  }, [monthRecords, data.products]);

  function exportCSV() {
    if (monthRecords.length === 0) {
      notify("Sem dados no mês para exportar.", "info");
      return;
    }
    const lines: string[] = [];
    lines.push("Superbom Nova Iguaçu - Controle de Recebimento");
    lines.push("Avenida Marques Rolo, Nº 995");
    lines.push("Relatório de " + formatMonthLabel(month));
    lines.push("");
    lines.push("Resumo (valores em unidades; caixas convertidas por produto)");
    lines.push("Esperado (un);Recebido (un);Esperado (cx);Recebido (cx);Faltas (un);Sobras (un);Dias com lancamento;Eficiencia");
    lines.push(
      [
        summary.totalExpected,
        summary.totalReceived,
        formatBoxes(summary.totalExpectedBoxes).replace(",", "."),
        formatBoxes(summary.totalReceivedBoxes).replace(",", "."),
        summary.totalFaltas,
        summary.totalSobras,
        summary.diasAtendidos,
        summary.eficiencia.toFixed(2) + "%",
      ].join(";")
    );
    lines.push("");
    lines.push("Por dia (Faltas e Sobras detalhadas)");
    lines.push("Data;Codigo;Descricao;Tipo;Quantidade (un);Quantidade (cx);Esperado (un);Recebido (un)");
    byDay.forEach((d) => {
      d.items.forEach((it) => {
        const product = data.products.find((p) => p.id === it.productId);
        const f = calcFaltas(it.expectedUnits, it.receivedUnits);
        const s = calcSobras(it.expectedUnits, it.receivedUnits);
        const isCont = product ? isContainerPackaging(product.packaging) : false;
        if (f > 0) {
          lines.push([
            formatDate(d.date),
            product?.code ?? "",
            product?.description ?? "",
            "FALTA",
            f,
            isCont && product ? formatBoxes(unitsToBoxes(f, product)).replace(",", ".") : "",
            it.expectedUnits,
            it.receivedUnits,
          ].join(";"));
        }
        if (s > 0) {
          lines.push([
            formatDate(d.date),
            product?.code ?? "",
            product?.description ?? "",
            "SOBRA",
            s,
            isCont && product ? formatBoxes(unitsToBoxes(s, product)).replace(",", ".") : "",
            it.expectedUnits,
            it.receivedUnits,
          ].join(";"));
        }
      });
      // Linha resumo do dia
      lines.push([
        formatDate(d.date),
        "",
        "",
        "TOTAL DIA",
        d.faltas + d.sobras,
        "",
        d.expected,
        d.received,
      ].join(";"));
    });
    lines.push("");
    lines.push("Por produto");
    lines.push("Codigo;Descricao;Acondicionamento;Unidades por acondicionamento;Qtd. Esperada (padrao un);Esperado mes (un);Esperado mes (cx);Recebido mes (un);Recebido mes (cx);Faltas (un);Sobras (un)");
    byProduct.forEach((p) => {
      lines.push(
        [
          p.product!.code,
          p.product!.description,
          p.product!.packaging,
          p.product!.unitsPerBox,
          p.product!.expectedQuantity,
          p.expected,
          formatBoxes(p.expectedBoxes).replace(",", "."),
          p.received,
          formatBoxes(p.receivedBoxes).replace(",", "."),
          p.faltas,
          p.sobras,
        ].join(";")
      );
    });

    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify("Relatório exportado em CSV.", "success");
  }

  function buildWhatsAppText(): string {
    const lines: string[] = [];
    lines.push(`*RELATÓRIO DE RECEBIMENTO*`);
    lines.push(`📅 ${formatMonthLabel(month)}`);
    lines.push("");
    lines.push(`📍 *Superbom Nova Iguaçu*`);
    lines.push(`Av. Marques Rolo, Nº 995`);
    lines.push(`📅 ${formatMonthLabel(month)}`);
    lines.push(``);
    lines.push(`*RESUMO*`);
    lines.push(`• Esperado: ${summary.totalExpected} unidades (${formatBoxes(summary.totalExpectedBoxes)} caixas)`);
    lines.push(`• Recebido: ${summary.totalReceived} unidades (${formatBoxes(summary.totalReceivedBoxes)} caixas)`);
    lines.push(`• Faltas: ${summary.totalFaltas} unidades`);
    lines.push(`• Sobras: ${summary.totalSobras} unidades`);
    lines.push(`• Eficiência: ${summary.eficiencia.toFixed(1)}%`);
    lines.push(`• Dias com lançamento: ${summary.diasAtendidos}`);
    lines.push("");
    if (byProduct.length > 0) {
      lines.push(`*POR PRODUTO*`);
      byProduct.forEach((p) => {
        const acond = p.product!.packaging;
        const un = p.product!.unitsPerBox;
        const esperadoPadrao = p.product!.expectedQuantity ?? 0;
        const acondInfo = isContainerPackaging(acond)
          ? `${acond} c/ ${un} un.`
          : `${acond} (1 = 1)`;
        lines.push(
          `▫ ${p.product!.code} - ${p.product!.description}`
        );
        lines.push(
          `   ${acondInfo} | Padrão: ${esperadoPadrao} un. | Esp. mês: ${p.expected} un. (${formatBoxes(p.expectedBoxes)} cx) | Rec: ${p.received} un. (${formatBoxes(p.receivedBoxes)} cx) | Falta: ${p.faltas} un. | Sobra: ${p.sobras} un.`
        );
      });
      lines.push("");
    }
    if (byDay.length > 0) {
      lines.push(`*FALTAS E SOBRAS POR DIA*`);
      byDay.forEach((d) => {
        const itensFalta = d.items
          .map((it) => ({ it, f: calcFaltas(it.expectedUnits, it.receivedUnits) }))
          .filter((x) => x.f > 0);
        const itensSobra = d.items
          .map((it) => ({ it, s: calcSobras(it.expectedUnits, it.receivedUnits) }))
          .filter((x) => x.s > 0);
        const conferirente = data.conferentes.find(
          (c) => c.id === d.items.find((it) => it.conferenteId)?.conferenteId
        );
        const colaborador = data.colaboradores.find(
          (c) => c.id === d.items.find((it) => it.colaboradorId)?.colaboradorId
        );
        const local = data.locais.find(
          (l) => l.id === d.items.find((it) => it.localId)?.localId
        );
        lines.push(`▫ ${formatDate(d.date)} — Esp: ${d.expected} · Rec: ${d.received}`);
        if (conferirente || colaborador || local) {
          const parts = [];
          if (conferirente) parts.push(`Conferente: ${conferirente.name}`);
          if (colaborador) parts.push(`DPP: ${colaborador.name}`);
          if (local) parts.push(`Local: ${local.name}`);
          lines.push(`   👥 ${parts.join(" · ")}`);
        }
        if (itensFalta.length > 0) {
          lines.push(`   ⬇ Faltas: ${d.faltas} un.`);
          itensFalta.forEach(({ it, f }) => {
            const product = data.products.find((p) => p.id === it.productId);
            const acond = product?.packaging.toLowerCase() ?? "un.";
            const isCont = product ? isContainerPackaging(product.packaging) : false;
            const cx = isCont && product ? ` (${formatBoxes(unitsToBoxes(f, product))} ${acond})` : "";
            lines.push(`     − ${product?.code ?? "?"} ${product?.description ?? "—"}${cx}`);
          });
        }
        if (itensSobra.length > 0) {
          lines.push(`   ⬆ Sobras: ${d.sobras} un.`);
          itensSobra.forEach(({ it, s }) => {
            const product = data.products.find((p) => p.id === it.productId);
            const acond = product?.packaging.toLowerCase() ?? "un.";
            const isCont = product ? isContainerPackaging(product.packaging) : false;
            const cx = isCont && product ? ` (${formatBoxes(unitsToBoxes(s, product))} ${acond})` : "";
            lines.push(`     + ${product?.code ?? "?"} ${product?.description ?? "—"}${cx}`);
          });
        }
        if (itensFalta.length === 0 && itensSobra.length === 0) {
          lines.push(`   ✓ Sem faltas/sobras`);
        }
      });
    }
    lines.push("");
    lines.push(`_Gerado pelo Controle de Recebimento_`);
    return lines.join("\n");
  }

  function handlePrint() {
    if (monthRecords.length === 0) {
      notify("Sem dados no mês para imprimir.", "info");
      return;
    }
    window.print();
  }

  function handleShareWhatsApp() {
    if (monthRecords.length === 0) {
      notify("Sem dados no mês para compartilhar.", "info");
      return;
    }
    const text = buildWhatsAppText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    notify("Abrindo WhatsApp com o relatório...", "success");
  }

  const maxFaltas = Math.max(1, ...byDay.map((d) => d.faltas));
  const maxSobras = Math.max(1, ...byDay.map((d) => d.sobras));

  return (
    <div className="space-y-6">
      <div className="hidden print:block print:mb-4 print:border-b print:border-slate-300 print:pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Superbom Nova Iguaçu</h1>
        <p className="text-sm text-slate-600">Avenida Marques Rolo, Nº 995 — Nova Iguaçu/RJ</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-800">Relatório de Recebimento</h2>
        <p className="text-sm text-slate-600 capitalize">{formatMonthLabel(month)}</p>
        <p className="text-xs text-slate-500">Gerado em {formatDate(todayISO())}</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Relatórios</h2>
          <p className="text-sm text-slate-500 mt-1">
            Visualize faltas, sobras e indicadores do mês selecionado.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mês de referência
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <ShareButtons
            title="Relatório de Recebimento"
            text={buildWhatsAppText()}
            onPrint={handlePrint}
            onShare={handleShareWhatsApp}
          />
          <button
            onClick={exportCSV}
            className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition"
          >
            <IconDownload className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Esperado</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalExpected}</p>
          <p className="text-xs text-slate-500 mt-1">
            unidades · {formatBoxes(summary.totalExpectedBoxes)} cx
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recebido</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalReceived}</p>
          <p className="text-xs text-slate-500 mt-1">
            unidades · {formatBoxes(summary.totalReceivedBoxes)} cx
          </p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Faltas</p>
          <p className="mt-2 text-2xl font-bold text-rose-700">{summary.totalFaltas}</p>
          <p className="text-xs text-rose-500 mt-1">unidades faltantes</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Sobras</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{summary.totalSobras}</p>
          <p className="text-xs text-amber-500 mt-1">unidades excedentes</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Eficiência</p>
          <p className="mt-2 text-2xl font-bold text-indigo-700">{summary.eficiencia.toFixed(1)}%</p>
          <p className="text-xs text-indigo-500 mt-1">{summary.diasAtendidos} dias lançados</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit flex-wrap">
        {(
          [
            { id: "resumo", label: "Resumo", icon: IconReport },
            { id: "produto", label: "Por produto", icon: IconCheck },
            { id: "dia", label: "Por dia", icon: IconCalendar },
            { id: "faltasSobras", label: "Faltas e Sobras", icon: IconAlert },
          ] as const
        ).map((opt) => {
          const Icon = opt.icon;
          const active = view === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setView(opt.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition " +
                (active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")
              }
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {monthRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <IconAlert className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            Nenhum lançamento em {formatMonthLabel(month)}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Registre lançamentos na aba "Lançamento Diário" para ver o relatório.
          </p>
        </div>
      ) : view === "resumo" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Faltas por dia
            </h3>
            <div className="space-y-3">
              {byDay.length === 0 ? (
                <p className="text-sm text-slate-500">Sem dados.</p>
              ) : (
                byDay.slice(0, 10).map((d) => (
                  <div key={d.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{formatDate(d.date)}</span>
                      <span className="font-mono font-semibold text-rose-600">{d.faltas}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: `${(d.faltas / maxFaltas) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Sobras por dia
            </h3>
            <div className="space-y-3">
              {byDay.length === 0 ? (
                <p className="text-sm text-slate-500">Sem dados.</p>
              ) : (
                byDay.slice(0, 10).map((d) => (
                  <div key={d.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{formatDate(d.date)}</span>
                      <span className="font-mono font-semibold text-amber-600">{d.sobras}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${(d.sobras / maxSobras) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : view === "produto" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Acond.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Un./Acond.
                    <div className="text-[10px] font-normal normal-case text-slate-400 mt-0.5">
                      se for Unidade: —
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Qtd. Esperada (padrão)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Esp. Mês (un.)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Rec. Mês (un.)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Falta (un.)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sobra (un.)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {byProduct.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50/60 transition">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-semibold text-slate-700">
                      {p.product!.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800">{p.product!.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {p.product!.packaging}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
                      {isContainerPackaging(p.product!.packaging) ? p.product!.unitsPerBox : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                        {p.product!.expectedQuantity ?? 0} un.
                      </span>
                      {isContainerPackaging(p.product!.packaging) && (
                        <div className="mt-1 text-[10px] text-emerald-700 font-semibold">
                          = {formatBoxes(unitsToBoxes(p.product!.expectedQuantity ?? 0, p.product!))} {p.product!.packaging.toLowerCase()}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
                      <div className="font-semibold">{p.expected} un.</div>
                      {isContainerPackaging(p.product!.packaging) && (
                        <div className="text-[10px] text-slate-500">
                          {formatBoxes(p.expectedBoxes)} {p.product!.packaging.toLowerCase()}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
                      <div className="font-semibold">{p.received} un.</div>
                      {isContainerPackaging(p.product!.packaging) && (
                        <div className="text-[10px] text-slate-500">
                          {formatBoxes(p.receivedBoxes)} {p.product!.packaging.toLowerCase()}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      {p.faltas > 0 ? (
                        <span className="inline-flex flex-col items-end gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                            <IconDown className="h-3 w-3" /> {p.faltas} un.
                          </span>
                          {isContainerPackaging(p.product!.packaging) && (
                            <span className="text-[10px] text-rose-600 font-medium">
                              {formatBoxes(unitsToBoxes(p.faltas, p.product!))} {p.product!.packaging.toLowerCase()}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      {p.sobras > 0 ? (
                        <span className="inline-flex flex-col items-end gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            <IconUp className="h-3 w-3" /> {p.sobras} un.
                          </span>
                          {isContainerPackaging(p.product!.packaging) && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              {formatBoxes(unitsToBoxes(p.sobras, p.product!))} {p.product!.packaging.toLowerCase()}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Totais
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{summary.totalExpected}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{summary.totalReceived}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-rose-700">{summary.totalFaltas}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-amber-700">{summary.totalSobras}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : view === "faltasSobras" ? (
        <DailyFaltasSobras byDay={byDay} data={data} />
      ) : (
        <div className="space-y-3">
          {byDay.map((d) => {
            // Separa os itens do dia em 3 listas: OK, com FALTA, com SOBRA
            const itemsComFalta = d.items.filter(
              (it) => calcFaltas(it.expectedUnits, it.receivedUnits) > 0
            );
            const itemsComSobra = d.items.filter(
              (it) => calcSobras(it.expectedUnits, it.receivedUnits) > 0
            );
            const itemsOk = d.items.filter(
              (it) =>
                calcFaltas(it.expectedUnits, it.receivedUnits) === 0 &&
                calcSobras(it.expectedUnits, it.receivedUnits) === 0
            );
            // Busca os responsáveis do dia (todos os registros do dia devem ter)
            const conferirente = data.conferentes.find(
              (c) => c.id === d.items.find((it) => it.conferenteId)?.conferenteId
            );
            const colaborador = data.colaboradores.find(
              (c) => c.id === d.items.find((it) => it.colaboradorId)?.colaboradorId
            );
            const local = data.locais.find(
              (l) => l.id === d.items.find((it) => it.localId)?.localId
            );
            return (
              <div
                key={d.date}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <IconCalendar className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {formatDate(d.date)}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {d.items.length} {d.items.length === 1 ? "produto" : "produtos"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                      Esp: {d.expected} un.
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                      Rec: {d.received} un.
                    </span>
                    {d.faltas > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-semibold text-rose-700">
                        <IconDown className="h-3 w-3" /> Falta: {d.faltas} un.
                      </span>
                    )}
                    {d.sobras > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-700">
                        <IconUp className="h-3 w-3" /> Sobra: {d.sobras} un.
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {/* Coluna FALTAS */}
                  <div
                    className={
                      "rounded-xl border p-3 " +
                      (itemsComFalta.length > 0
                        ? "border-rose-200 bg-rose-50/40"
                        : "border-slate-200 bg-slate-50/40")
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <IconDown className="h-4 w-4 text-rose-600" />
                        <h4 className="text-sm font-bold text-rose-700">Faltas do dia</h4>
                      </div>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        {d.faltas} un.
                      </span>
                    </div>
                    {itemsComFalta.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        Nenhuma falta neste dia.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {itemsComFalta.map((it) => {
                          const product = data.products.find((p) => p.id === it.productId);
                          const f = calcFaltas(it.expectedUnits, it.receivedUnits);
                          const isCont = product
                            ? isContainerPackaging(product.packaging)
                            : false;
                          return (
                            <li
                              key={it.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-rose-100"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-semibold text-slate-800">
                                  <span className="font-mono text-slate-500 mr-1">
                                    {product?.code}
                                  </span>
                                  {product?.description ?? "—"}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Esp: {it.expectedUnits} · Rec: {it.receivedUnits}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-xs font-bold text-rose-700">
                                  −{f} un.
                                </div>
                                {isCont && product && (
                                  <div className="text-[10px] text-rose-600 font-semibold">
                                    = {formatBoxes(unitsToBoxes(f, product))}{" "}
                                    {product.packaging.toLowerCase()}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Coluna SOBRAS */}
                  <div
                    className={
                      "rounded-xl border p-3 " +
                      (itemsComSobra.length > 0
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-slate-200 bg-slate-50/40")
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <IconUp className="h-4 w-4 text-amber-600" />
                        <h4 className="text-sm font-bold text-amber-700">Sobras do dia</h4>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        {d.sobras} un.
                      </span>
                    </div>
                    {itemsComSobra.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        Nenhuma sobra neste dia.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {itemsComSobra.map((it) => {
                          const product = data.products.find((p) => p.id === it.productId);
                          const s = calcSobras(it.expectedUnits, it.receivedUnits);
                          const isCont = product
                            ? isContainerPackaging(product.packaging)
                            : false;
                          return (
                            <li
                              key={it.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-amber-100"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-semibold text-slate-800">
                                  <span className="font-mono text-slate-500 mr-1">
                                    {product?.code}
                                  </span>
                                  {product?.description ?? "—"}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Esp: {it.expectedUnits} · Rec: {it.receivedUnits}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-xs font-bold text-amber-700">
                                  +{s} un.
                                </div>
                                {isCont && product && (
                                  <div className="text-[10px] text-amber-600 font-semibold">
                                    = {formatBoxes(unitsToBoxes(s, product))}{" "}
                                    {product.packaging.toLowerCase()}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {itemsOk.length > 0 && (
                  <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-1.5">
                    <p className="text-xs text-emerald-700">
                      ✓ <strong>{itemsOk.length}</strong>{" "}
                      {itemsOk.length === 1 ? "produto" : "produtos"} sem falta/sobra neste dia
                    </p>
                  </div>
                )}

                {/* Responsáveis do dia */}
                {(conferirente || colaborador || local) && (
                  <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
                    {conferirente && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Conferente
                        </p>
                        <p className="text-xs font-semibold text-slate-800">
                          {conferirente.name}
                          {conferirente.registration ? ` · ${conferirente.registration}` : ""}
                        </p>
                      </div>
                    )}
                    {colaborador && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          DPP
                        </p>
                        <p className="text-xs font-semibold text-slate-800">
                          {colaborador.name}
                        </p>
                        <p className="text-[10px] text-slate-500">{colaborador.role}</p>
                      </div>
                    )}
                    {local && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Local de Origem
                        </p>
                        <p className="text-xs font-semibold text-slate-800">{local.name}</p>
                        {local.state && (
                          <p className="text-[10px] text-slate-500">
                            {local.city ? `${local.city} / ` : ""}
                            {local.state}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
