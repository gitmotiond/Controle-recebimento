import { useState, useMemo } from "react";
import type { Product, AppData } from "../types";
import { addProduct, updateProduct, deleteProduct } from "../storage";
import { supabase } from "../supabaseClient";
import { PACKAGING_OPTIONS, isContainerPackaging, PRODUCT_CATEGORIES, ProductCategory } from "../types";
import { formatBoxes, unitsToBoxes } from "../storage";
import { IconPlus, IconTrash, IconEdit, IconSearch, IconPackage, IconX, IconCheck } from "./Icons";

type Props = {
  data: AppData;
  setData: (d: AppData) => void;
  notify: (msg: string, type?: "success" | "error" | "info") => void;
};

export default function ProductManager({ data, setData, notify }: Props) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    description: "",
    packaging: "Caixa",
    customPackaging: "",
    unitsPerBox: 1,
    expectedQuantity: 0,
    category: "cargaSeca" as ProductCategory,
  });

  function resetForm() {
    setForm({ code: "", description: "", packaging: "Caixa", customPackaging: "", unitsPerBox: 1, expectedQuantity: 0, category: "cargaSeca" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(p: Product) {
    const isStandard = PACKAGING_OPTIONS.includes(p.packaging) && p.packaging !== "Outro";
    setForm({
      code: p.code,
      description: p.description,
      packaging: isStandard ? p.packaging : "Outro",
      customPackaging: isStandard ? "" : p.packaging,
      unitsPerBox: p.unitsPerBox,
      expectedQuantity: p.expectedQuantity ?? 0,
      category: (p.category as ProductCategory) ?? "cargaSeca",
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  function handlePackagingChange(value: string) {
    // Se o usuário selecionar "Unidade", força unitsPerBox = 1, pois
    // "Unidade" é a própria unidade base e não multiplica.
    if (value === "Unidade") {
      setForm({ ...form, packaging: value, customPackaging: "", unitsPerBox: 1 });
    } else {
      setForm({ ...form, packaging: value });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const packaging = form.packaging === "Outro" ? form.customPackaging.trim() : form.packaging;
    if (!form.code.trim() || !form.description.trim() || !packaging || form.unitsPerBox < 1 || form.expectedQuantity < 0) {
      notify("Preencha todos os campos corretamente.", "error");
      return;
    }
    if (editingId) {
      const existing = data.products.find((p) => p.id === editingId);
      if (!existing) return;
      const updated: Product = {
        ...existing,
        code: form.code.trim(),
        description: form.description.trim(),
        packaging,
        unitsPerBox: Number(form.unitsPerBox),
        expectedQuantity: Number(form.expectedQuantity),
        category: form.category,
      };
      setData(updateProduct(data, updated));
      notify("Produto atualizado com sucesso!", "success");
    } else {
      const created = {
        id: crypto.randomUUID(),
        code: form.code.trim(),
        description: form.description.trim(),
        packaging,
        unitsPerBox: Number(form.unitsPerBox),
        expectedQuantity: Number(form.expectedQuantity),
        category: form.category,
        createdAt: new Date().toISOString(),
      }
      const { data: novoProduto, error } = await supabase
        .from("products")
        .insert([created])
        .select()
        .single();

      if (error) {
        console.error("Erro ao cadastrar produto:", error);
        notify("Erro ao cadastrar produto no Supabase.", "error");
        return;
      }

      setData({
        ...data,
        products: [...data.products, novoProduto],
      });

      notify("Produto cadastrado com sucesso!", "success");
    }
    resetForm();
  }

  function handleDelete(id: string) {
    if (confirm("Deseja realmente excluir este produto? Todos os lançamentos vinculados também serão removidos.")) {
      setData(deleteProduct(data, id));
      notify("Produto excluído.", "info");
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const sorted = [...data.products].sort((a, b) => a.code.localeCompare(b.code));
    if (!s) return sorted;
    return sorted.filter(
      (p) =>
        p.code.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.packaging.toLowerCase().includes(s)
    );
  }, [data.products, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cadastro de Produtos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre os produtos com código, descrição, acondicionamento e unidades por caixa.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition"
        >
          <IconPlus className="h-4 w-4" />
          Novo Produto
        </button>
      </div>

      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código, descrição ou acondicionamento..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? "Editar produto" : "Novo produto"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Código do Produto
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Ex: 7891234500011"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Descrição do Produto
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Arroz Tipo 1 - 5kg"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Acondicionamento
              </label>
              <select
                value={form.packaging}
                onChange={(e) => handlePackagingChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {PACKAGING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {form.packaging === "Outro" && (
                <input
                  type="text"
                  value={form.customPackaging}
                  onChange={(e) => setForm({ ...form, customPackaging: e.target.value })}
                  placeholder="Especifique o acondicionamento"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Quantidade dentro do acondicionamento
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.packaging === "Unidade" ? 1 : form.unitsPerBox}
                onChange={(e) => setForm({ ...form, unitsPerBox: Number(e.target.value) })}
                disabled={form.packaging === "Unidade"}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                {form.packaging === "Unidade" ? (
                  <span className="text-indigo-600 font-semibold">
                    "Unidade" é a unidade base — 1 unidade = 1 unidade (sem multiplicação).
                  </span>
                ) : (
                  "Ex: Caixa com 12 unidades → informe 12."
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  Categoria (define SLA de resolução)
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                    importante
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PRODUCT_CATEGORIES.map((c) => {
                  const active = form.category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, category: c.id })}
                      className={
                        "rounded-xl border-2 p-3 text-left transition " +
                        (active
                          ? c.color === "rose"
                            ? "border-rose-500 bg-rose-50"
                            : c.color === "sky"
                              ? "border-sky-500 bg-sky-50"
                              : "border-slate-500 bg-slate-50"
                          : "border-slate-200 bg-white hover:border-slate-300")
                      }
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className={
                            "text-sm font-bold " +
                            (active
                              ? c.color === "rose"
                                ? "text-rose-700"
                                : c.color === "sky"
                                  ? "text-sky-700"
                                  : "text-slate-700"
                              : "text-slate-700")
                          }
                        >
                          {c.label}
                        </p>
                        <span
                          className={
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold " +
                            (active
                              ? c.color === "rose"
                                ? "bg-rose-200 text-rose-800"
                                : c.color === "sky"
                                  ? "bg-sky-200 text-sky-800"
                                  : "bg-slate-200 text-slate-800"
                              : "bg-slate-100 text-slate-500")
                          }
                        >
                          {c.slaHours}h
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500 leading-tight">
                        {c.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  Quantidade que era pra ser recebida
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                    em unidades
                  </span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.expectedQuantity}
                  onChange={(e) => setForm({ ...form, expectedQuantity: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-16 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                  un.
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {form.packaging === "Unidade" ? (
                  <span>Quantidade padrão esperada em unidades. Ex: 12 unidades por dia.</span>
                ) : (
                  <span>
                    Informe em <strong>unidades</strong>. Ex: Caixa com 12 un. → se espera 1 caixa, informe 12 unidades.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
              <span className="font-semibold text-indigo-700">Acondicionamento:</span>
              <span>
                {form.packaging === "Unidade" ? (
                  <span className="font-semibold">Unidade (sem multiplicação)</span>
                ) : (
                  <>
                    <span className="font-semibold">1 {form.packaging === "Outro" ? (form.customPackaging.trim() || "—") : form.packaging}</span>
                    {" com "}
                    <span className="font-semibold">{form.unitsPerBox || 0} {form.unitsPerBox === 1 ? "unidade" : "unidades"}</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
              <span className="font-semibold text-indigo-700">Quantidade esperada:</span>
              <span>
                <span className="font-bold text-indigo-800">{form.expectedQuantity} un.</span>
                {isContainerPackaging(form.packaging === "Outro" ? (form.customPackaging.trim() || "Caixa") : form.packaging) && form.unitsPerBox > 0 && (
                  <>
                    {" = "}
                    <span className="font-bold text-indigo-800">
                      {formatBoxes(form.expectedQuantity / form.unitsPerBox)} {form.packaging === "Outro" ? (form.customPackaging.trim() || "acond.").toLowerCase() : form.packaging.toLowerCase()}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition"
            >
              <IconCheck className="h-4 w-4" />
              {editingId ? "Salvar alterações" : "Adicionar produto"}
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <IconPackage className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {data.products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum resultado encontrado"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {data.products.length === 0
              ? "Comece cadastrando seu primeiro produto."
              : "Tente uma busca diferente."}
          </p>
        </div>
      ) : (
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
                    Categoria / SLA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Acondicionamento
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Un./Acond.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Qtd. Esperada
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Esperado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((p) => {
                  const cat = PRODUCT_CATEGORIES.find((c) => c.id === (p.category || "cargaSeca"));
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-semibold text-slate-700">
                        {p.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">{p.description}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold " +
                            (cat?.color === "rose"
                              ? "bg-rose-100 text-rose-700"
                              : cat?.color === "sky"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-slate-100 text-slate-700")
                          }
                        >
                          {cat?.label ?? "Carga Seca"} · {cat?.slaHours ?? 24}h
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        <span className="font-semibold text-slate-700">{p.packaging}</span>
                        <span className="text-slate-400"> · </span>
                        <span>
                          {isContainerPackaging(p.packaging)
                            ? `contém ${p.unitsPerBox} ${p.unitsPerBox === 1 ? "unidade" : "unidades"}`
                            : "unidade base (1 = 1)"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">
                        {isContainerPackaging(p.packaging) ? p.unitsPerBox : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {p.expectedQuantity} {p.packaging.toLowerCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="inline-flex flex-col items-end gap-0.5">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            {p.expectedQuantity} un.
                          </span>
                          {isContainerPackaging(p.packaging) && p.unitsPerBox > 0 && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              = {formatBoxes(unitsToBoxes(p.expectedQuantity, p))} {p.packaging.toLowerCase()}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            aria-label="Editar"
                            title="Editar"
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                            aria-label="Excluir"
                            title="Excluir"
                          >
                            <IconTrash className="h-4 w-4" />
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
