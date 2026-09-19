import { useState, useEffect, useMemo } from "react";
import type { AppData } from "./types";
import { supabase } from "./supabaseClient";

import {
  loadData,
  saveData,
  listMonthsInRange,
  formatMonthLabel,
  todayISO,
} from "./storage";

import ProductManager from "./components/ProductManager";
import DailyEntry from "./components/DailyEntry";
import Reports from "./components/Reports";
import BackupManager from "./components/BackupManager";
import PeopleManager from "./components/PeopleManager";

const LOCAL_STORAGE_KEY = "controle-recebimento-data-v1";
const PRODUCT_MIGRATION_KEY = "controle-products-migrated-to-supabase-v1";

import {
  IconBox,
  IconClipboard,
  IconReport,
  IconCheck,
  IconX,
  IconAlert,
  IconCalendar,
  IconUser,
} from "./components/Icons";

type Tab =
  | "produtos"
  | "cadastros"
  | "lancamento"
  | "relatorios";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

export default function App() {
  // =========================================================
  // ESTADOS DO SISTEMA
  // =========================================================

  const [data, setDataState] = useState<AppData>(() => loadData());

  const [tab, setTab] = useState<Tab>("produtos");

  const [month, setMonth] = useState<string>(
    todayISO().slice(0, 7)
  );

  const [toasts, setToasts] = useState<Toast[]>([]);

  // =========================================================
  // SINCRONIZAÇÃO COM SUPABASE
  // =========================================================

  useEffect(() => {
    let ativo = true;

    async function sincronizarComSupabase() {
      try {
        // -----------------------------------------------------
        // 1) MIGRA UMA VEZ OS PRODUTOS QUE JÁ ESTÃO NO
        //    COMPUTADOR PARA O SUPABASE.
        //    Isso evita perder os produtos da versão nova.
        // -----------------------------------------------------
        const migracaoFeita =
          localStorage.getItem(PRODUCT_MIGRATION_KEY) === "1";

        if (!migracaoFeita) {
          try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

            if (raw) {
              const localData = JSON.parse(raw) as Partial<AppData>;
              const produtosLocais = Array.isArray(localData.products)
                ? localData.products
                : [];

              if (produtosLocais.length > 0) {
                console.log(
                  "🔄 Migrando produtos locais para o Supabase:",
                  produtosLocais.length
                );

                const { error: erroMigracao } = await supabase
                  .from("products")
                  .upsert(produtosLocais, {
                    onConflict: "id",
                  });

                if (erroMigracao) {
                  console.error(
                    "❌ Erro ao migrar produtos para o Supabase:",
                    erroMigracao
                  );
                } else {
                  localStorage.setItem(
                    PRODUCT_MIGRATION_KEY,
                    "1"
                  );

                  console.log(
                    "✅ Produtos locais migrados para o Supabase."
                  );
                }
              } else {
                localStorage.setItem(
                  PRODUCT_MIGRATION_KEY,
                  "1"
                );
              }
            }
          } catch (erroLocal) {
            console.error(
              "❌ Erro ao ler dados locais para migração:",
              erroLocal
            );
          }
        }

        // -----------------------------------------------------
        // 2) BUSCA PRODUTOS E LANÇAMENTOS DO SUPABASE
        // -----------------------------------------------------
        const [produtosResult, recordsResult] = await Promise.all([
          supabase
            .from("products")
            .select("*")
            .order("createdAt", { ascending: false }),
          supabase
            .from("records")
            .select("*")
            .order("date", { ascending: false }),
        ]);

        if (produtosResult.error) {
          console.error(
            "❌ Erro ao carregar produtos do Supabase:",
            produtosResult.error
          );
        }

        if (recordsResult.error) {
          console.error(
            "❌ Erro ao carregar records do Supabase:",
            recordsResult.error
          );
        }

        if (!ativo) return;

        setDataState((atual) => ({
          ...atual,
          products: produtosResult.data ?? atual.products,
          records: recordsResult.data ?? atual.records,
        }));

        console.log(
          "☁️ Dados sincronizados do Supabase:",
          {
            produtos: produtosResult.data?.length ?? 0,
            records: recordsResult.data?.length ?? 0,
          }
        );
      } catch (erro) {
        console.error(
          "❌ Erro geral na sincronização com Supabase:",
          erro
        );
      }
    }

    // Carrega imediatamente.
    sincronizarComSupabase();

    // Mantém computador e celular atualizados mesmo sem Realtime
    // configurado no Supabase.
    const intervalo = window.setInterval(
      sincronizarComSupabase,
      5000
    );

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  // =========================================================
  // SALVAR DADOS LOCAIS
  // =========================================================

  useEffect(() => {
    saveData(data);
  }, [data]);

  // =========================================================
  // ALTERAR DADOS
  // =========================================================

  function setData(d: AppData) {
    setDataState(d);
  }

  // =========================================================
  // MENSAGENS / TOAST
  // =========================================================

  function notify(
    message: string,
    type: "success" | "error" | "info" = "success"
  ) {
    const id = Date.now() + Math.random();

    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
      },
    ]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.filter((t) => t.id !== id)
      );
    }, 3500);
  }

  // =========================================================
  // TOTAL DE PRODUTOS
  // =========================================================

  const totalProducts = data.products.length;

  // =========================================================
  // LANÇAMENTOS DE HOJE
  // =========================================================

  const todayRecords = useMemo(
    () =>
      data.records.filter(
        (r) => r.date === todayISO()
      ),
    [data.records]
  );

  // =========================================================
  // MESES
  // =========================================================

  const months = useMemo(
    () => listMonthsInRange(),
    []
  );

  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">

        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            {/* IDENTIFICAÇÃO DA LOJA */}

            <div className="flex items-center gap-3">

              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-200">

                <IconBox className="h-5 w-5 text-white" />

              </div>

              <div>

                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Superbom Nova Iguaçu
                </h1>

                <p className="text-xs text-slate-500 leading-tight">
                  Avenida Marques Rolo, Nº 995 — Controle de Recebimento
                </p>

              </div>

            </div>

            {/* INFORMAÇÕES DO SISTEMA */}

            <div className="flex flex-wrap items-center gap-2">

              {/* TOTAL DE PRODUTOS */}

              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">

                <IconBox className="h-3.5 w-3.5 text-indigo-500" />

                <span className="font-semibold">
                  {totalProducts}
                </span>

                produtos

              </div>

              {/* TOTAL DE LANÇAMENTOS DE HOJE */}

              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">

                <IconClipboard className="h-3.5 w-3.5 text-emerald-500" />

                <span className="font-semibold">
                  {todayRecords.length}
                </span>

                hoje

              </div>

              {/* SELETOR DE MÊS */}

              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white pl-3 pr-1 py-1 text-xs shadow-sm">

                <IconCalendar className="h-3.5 w-3.5 text-slate-400" />

                <span className="text-slate-600 hidden sm:inline">
                  Mês:
                </span>

                <select
                  value={month}
                  onChange={(e) =>
                    setMonth(e.target.value)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >

                  {months.map((m) => (
                    <option
                      key={m}
                      value={m}
                    >
                      {formatMonthLabel(m)}
                    </option>
                  ))}

                </select>

              </div>

              {/* BACKUP */}

              <BackupManager
                data={data}
                setData={setData}
                notify={notify}
              />

            </div>

          </div>

          {/* =================================================
              MENU
          ================================================== */}

          <nav className="mt-3 -mb-px flex gap-1 overflow-x-auto">

            {(
              [
                {
                  id: "produtos" as const,
                  label: "Produtos",
                  icon: IconBox,
                },
                {
                  id: "cadastros" as const,
                  label: "Cadastros",
                  icon: IconUser,
                },
                {
                  id: "lancamento" as const,
                  label: "Lançamento Diário",
                  icon: IconClipboard,
                },
                {
                  id: "relatorios" as const,
                  label: "Relatórios",
                  icon: IconReport,
                },
              ]
            ).map((t) => {

              const Icon = t.icon;

              const active =
                tab === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() =>
                    setTab(t.id)
                  }
                  className={
                    "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition " +
                    (
                      active
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                    )
                  }
                >

                  <Icon className="h-4 w-4" />

                  {t.label}

                </button>
              );
            })}

          </nav>

        </div>

      </header>

      {/* =====================================================
          CONTEÚDO PRINCIPAL
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

        {/* PRODUTOS */}

        {tab === "produtos" && (
          <ProductManager
            data={data}
            setData={setData}
            notify={notify}
          />
        )}

        {/* CADASTROS */}

        {tab === "cadastros" && (
          <PeopleManager
            data={data}
            setData={setData}
            notify={notify}
          />
        )}

        {/* LANÇAMENTO DIÁRIO */}

        {tab === "lancamento" && (
          <DailyEntry
            data={data}
            setData={setData}
            notify={notify}
          />
        )}

        {/* RELATÓRIOS */}

        {tab === "relatorios" && (
          <Reports
            data={data}
            notify={notify}
          />
        )}

      </main>

      {/* =====================================================
          RODAPÉ
      ====================================================== */}

      <footer className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">

        <div className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-sm p-4 text-center text-xs text-slate-500">

          Mês de referência:

          {" "}

          <span className="font-semibold text-slate-700 capitalize">

            {formatMonthLabel(month)}

          </span>

          {" · "}

          Dados salvos localmente no seu navegador

        </div>

      </footer>

      {/* =====================================================
          NOTIFICAÇÕES
      ====================================================== */}

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">

        {toasts.map((t) => (

          <div
            key={t.id}
            className={
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg min-w-[260px] max-w-sm animate-[slideIn_0.2s_ease-out] " +

              (
                t.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : t.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-white text-slate-700"
              )
            }
          >

            {/* ÍCONE */}

            <span className="mt-0.5">

              {t.type === "success" ? (

                <IconCheck className="h-4 w-4 text-emerald-600" />

              ) : t.type === "error" ? (

                <IconAlert className="h-4 w-4 text-rose-600" />

              ) : (

                <IconAlert className="h-4 w-4 text-slate-500" />

              )}

            </span>

            {/* MENSAGEM */}

            <p className="flex-1 text-sm font-medium">

              {t.message}

            </p>

            {/* FECHAR */}

            <button
              onClick={() =>
                setToasts((prev) =>
                  prev.filter(
                    (x) => x.id !== t.id
                  )
                )
              }
              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
              aria-label="Fechar"
            >

              <IconX className="h-3.5 w-3.5" />

            </button>

          </div>

        ))}

      </div>

      {/* =====================================================
          ANIMAÇÃO
      ====================================================== */}

      <style>{`

        @keyframes slideIn {

          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }

        }

      `}</style>

    </div>
  );
}