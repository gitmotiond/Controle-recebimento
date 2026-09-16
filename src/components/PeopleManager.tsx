import { useState, useMemo } from "react";
import type { AppData, Conferente, Colaborador, Local } from "../types";
import {
  addConferente,
  updateConferente,
  deleteConferente,
  addColaborador,
  updateColaborador,
  deleteColaborador,
  addLocal,
  updateLocal,
  deleteLocal,
} from "../storage";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconSearch,
  IconCheck,
  IconX,
} from "./Icons";

function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </svg>
  );
}

function IconMapPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx={12} cy={10} r={3} />
    </svg>
  );
}

type Props = {
  data: AppData;
  setData: (d: AppData) => void;
  notify: (msg: string, type?: "success" | "error" | "info") => void;
};

type SubTab = "conferentes" | "colaboradores" | "locais";

export default function PeopleManager({ data, setData, notify }: Props) {
  const [tab, setTab] = useState<SubTab>("conferentes");
  const [search, setSearch] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [conferenteForm, setConferenteForm] = useState({ name: "", registration: "" });
  const [colabForm, setColabForm] = useState({ name: "", role: "DPP - Departamento de Prevenção e Perdas" });
  const [localForm, setLocalForm] = useState({ name: "", city: "", state: "" });

  function resetForms() {
    setConferenteForm({ name: "", registration: "" });
    setColabForm({ name: "", role: "DPP - Departamento de Prevenção e Perdas" });
    setLocalForm({ name: "", city: "", state: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEditConferente(c: Conferente) {
    setConferenteForm({ name: c.name, registration: c.registration ?? "" });
    setEditingId(c.id);
    setShowForm(true);
  }
  function startEditColab(c: Colaborador) {
    setColabForm({ name: c.name, role: c.role });
    setEditingId(c.id);
    setShowForm(true);
  }
  function startEditLocal(l: Local) {
    setLocalForm({ name: l.name, city: l.city ?? "", state: l.state ?? "" });
    setEditingId(l.id);
    setShowForm(true);
  }

  function submitConferente(e: React.FormEvent) {
    e.preventDefault();
    if (!conferenteForm.name.trim()) {
      notify("Informe o nome do conferente.", "error");
      return;
    }
    if (editingId) {
      const existing = data.conferentes.find((c) => c.id === editingId);
      if (!existing) return;
      setData(
        updateConferente(data, {
          ...existing,
          name: conferenteForm.name.trim(),
          registration: conferenteForm.registration.trim() || undefined,
        })
      );
      notify("Conferente atualizado!", "success");
    } else {
      setData(
        addConferente(data, {
          name: conferenteForm.name.trim(),
          registration: conferenteForm.registration.trim() || undefined,
        })
      );
      notify("Conferente cadastrado!", "success");
    }
    resetForms();
  }
  function submitColab(e: React.FormEvent) {
    e.preventDefault();
    if (!colabForm.name.trim()) {
      notify("Informe o nome do colaborador.", "error");
      return;
    }
    if (editingId) {
      const existing = data.colaboradores.find((c) => c.id === editingId);
      if (!existing) return;
      setData(
        updateColaborador(data, {
          ...existing,
          name: colabForm.name.trim(),
          role: colabForm.role.trim() || "Prevenção e Perdas",
        })
      );
      notify("Colaborador atualizado!", "success");
    } else {
      setData(
        addColaborador(data, {
          name: colabForm.name.trim(),
          role: colabForm.role.trim() || "DPP - Departamento de Prevenção e Perdas",
        })
      );
      notify("Colaborador cadastrado!", "success");
    }
    resetForms();
  }
  function submitLocal(e: React.FormEvent) {
    e.preventDefault();
    if (!localForm.name.trim()) {
      notify("Informe o nome do local de origem.", "error");
      return;
    }
    if (editingId) {
      const existing = data.locais.find((l) => l.id === editingId);
      if (!existing) return;
      setData(
        updateLocal(data, {
          ...existing,
          name: localForm.name.trim(),
          city: localForm.city.trim() || undefined,
          state: localForm.state.trim().toUpperCase().slice(0, 2) || undefined,
        })
      );
      notify("Local atualizado!", "success");
    } else {
      setData(
        addLocal(data, {
          name: localForm.name.trim(),
          city: localForm.city.trim() || undefined,
          state: localForm.state.trim().toUpperCase().slice(0, 2) || undefined,
        })
      );
      notify("Local cadastrado!", "success");
    }
    resetForms();
  }

  function handleDelete(kind: SubTab, id: string) {
    const messages = {
      conferentes: "Excluir este conferente? Lançamentos vinculados manterão o histórico.",
      colaboradores: "Excluir este colaborador? Lançamentos vinculados manterão o histórico.",
      locais: "Excluir este local? Lançamentos vinculados manterão o histórico.",
    };
    if (!confirm(messages[kind])) return;
    if (kind === "conferentes") setData(deleteConferente(data, id));
    else if (kind === "colaboradores") setData(deleteColaborador(data, id));
    else setData(deleteLocal(data, id));
    notify("Item excluído.", "info");
  }

  const filteredConferentes = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = [...data.conferentes].sort((a, b) => a.name.localeCompare(b.name));
    if (!s) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.registration ?? "").toLowerCase().includes(s)
    );
  }, [data.conferentes, search]);

  const filteredColabs = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = [...data.colaboradores].sort((a, b) => a.name.localeCompare(b.name));
    if (!s) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(s) || c.role.toLowerCase().includes(s)
    );
  }, [data.colaboradores, search]);

  const filteredLocais = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = [...data.locais].sort((a, b) => a.name.localeCompare(b.name));
    if (!s) return list;
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(s) ||
        (l.city ?? "").toLowerCase().includes(s) ||
        (l.state ?? "").toLowerCase().includes(s)
    );
  }, [data.locais, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Cadastros Auxiliares</h2>
        <p className="text-sm text-slate-500 mt-1">
          Cadastre os conferentes, colaboradores do <strong>DPP (Departamento de Prevenção e Perdas)</strong>{" "}
          e os locais de origem. Esses dados serão usados nos lançamentos e relatórios.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
            ✓ Pré-cadastrados:
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
            Conferentes: Rafael, Felipe, Nicolas, Sérgio
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
            DPP: Samuel, Plínio, Jonathan
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
            Locais: Campo Grande, Vista Alegre, CD Campos, Curicica
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
        {(
          [
            { id: "conferentes" as const, label: "Conferentes", icon: IconUser, count: data.conferentes.length },
            { id: "colaboradores" as const, label: "Colaboradores", icon: IconCheck, count: data.colaboradores.length },
            { id: "locais" as const, label: "Locais de Origem", icon: IconMapPin, count: data.locais.length },
          ]
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                resetForms();
              }}
              className={
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition " +
                (active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span
                className={
                  "rounded-full px-1.5 py-0 text-[10px] font-bold " +
                  (active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600")
                }
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "conferentes"
                ? "Buscar conferente por nome ou matrícula..."
                : tab === "colaboradores"
                ? "Buscar colaborador por nome ou função..."
                : "Buscar local por nome, cidade ou estado..."
            }
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => {
            resetForms();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition"
        >
          <IconPlus className="h-4 w-4" />
          {tab === "conferentes"
            ? "Novo Conferente"
            : tab === "colaboradores"
            ? "Novo Colaborador"
            : "Novo Local"}
        </button>
      </div>

      {showForm && tab === "conferentes" && (
        <form
          onSubmit={submitConferente}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? "Editar conferente" : "Novo conferente"}
            </h3>
            <button
              type="button"
              onClick={resetForms}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nome do Conferente
              </label>
              <input
                type="text"
                value={conferenteForm.name}
                onChange={(e) =>
                  setConferenteForm({ ...conferenteForm, name: e.target.value })
                }
                placeholder="Ex: João da Silva"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Matrícula (opcional)
              </label>
              <input
                type="text"
                value={conferenteForm.registration}
                onChange={(e) =>
                  setConferenteForm({ ...conferenteForm, registration: e.target.value })
                }
                placeholder="Ex: 12345"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForms}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <IconCheck className="h-4 w-4" />
              {editingId ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      {showForm && tab === "colaboradores" && (
        <form
          onSubmit={submitColab}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? "Editar colaborador" : "Novo colaborador"}
            </h3>
            <button
              type="button"
              onClick={resetForms}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nome do Colaborador
              </label>
              <input
                type="text"
                value={colabForm.name}
                onChange={(e) => setColabForm({ ...colabForm, name: e.target.value })}
                placeholder="Ex: Maria Oliveira"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Departamento / Função (DPP)
              </label>
              <input
                type="text"
                value={colabForm.role}
                onChange={(e) => setColabForm({ ...colabForm, role: e.target.value })}
                placeholder="Ex: DPP - Departamento de Prevenção e Perdas"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForms}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <IconCheck className="h-4 w-4" />
              {editingId ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      {showForm && tab === "locais" && (
        <form
          onSubmit={submitLocal}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? "Editar local de origem" : "Novo local de origem"}
            </h3>
            <button
              type="button"
              onClick={resetForms}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nome do Local
              </label>
              <input
                type="text"
                value={localForm.name}
                onChange={(e) => setLocalForm({ ...localForm, name: e.target.value })}
                placeholder="Ex: CD São Paulo - Tucuruvi"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cidade
              </label>
              <input
                type="text"
                value={localForm.city}
                onChange={(e) => setLocalForm({ ...localForm, city: e.target.value })}
                placeholder="Ex: São Paulo"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Estado (UF)
              </label>
              <input
                type="text"
                value={localForm.state}
                onChange={(e) =>
                  setLocalForm({ ...localForm, state: e.target.value.toUpperCase().slice(0, 2) })
                }
                maxLength={2}
                placeholder="Ex: SP"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForms}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <IconCheck className="h-4 w-4" />
              {editingId ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      {/* Tabela Conferentes */}
      {tab === "conferentes" &&
        (filteredConferentes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <IconUser className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Nenhum conferente cadastrado
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre conferentes que realizam a conferência dos recebimentos.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Matrícula
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredConferentes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {c.registration || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => startEditConferente(c)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Editar"
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete("conferentes", c.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Excluir"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* Tabela Colaboradores */}
      {tab === "colaboradores" &&
        (filteredColabs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <IconCheck className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Nenhum colaborador cadastrado
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre os colaboradores do DPP (Departamento de Prevenção e Perdas).
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Função
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredColabs.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{c.role}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => startEditColab(c)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Editar"
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete("colaboradores", c.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Excluir"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* Tabela Locais */}
      {tab === "locais" &&
        (filteredLocais.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <IconMapPin className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Nenhum local de origem cadastrado
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre os locais de origem das mercadorias recebidas.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cidade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      UF
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLocais.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{l.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{l.city || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {l.state || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => startEditLocal(l)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Editar"
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete("locais", l.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Excluir"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
