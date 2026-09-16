import { useRef, useState } from "react";
import type { AppData } from "../types";
import {
  IconDownload,
  IconCheck,
  IconAlert,
  IconX,
} from "./Icons";

function IconUpload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1={12} y1={3} x2={12} y2={15} />
    </svg>
  );
}

type Props = {
  data: AppData;
  setData: (d: AppData) => void;
  notify: (msg: string, type?: "success" | "error" | "info") => void;
};

const BACKUP_VERSION = "1.0";

export default function BackupManager({ data, setData, notify }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"replace" | "merge" | null>(null);
  const [pendingData, setPendingData] = useState<AppData | null>(null);
  const [exportedFile, setExportedFile] = useState<{
    blob: Blob;
    fileName: string;
    json: string;
    sizeKB: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function generateBackup(): { blob: Blob; fileName: string; json: string; sizeKB: number } {
    const backup = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      products: data.products,
      records: data.records,
      conferentes: data.conferentes,
      colaboradores: data.colaboradores,
      locais: data.locais,
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const today = new Date().toISOString().slice(0, 10);
    return {
      blob,
      json,
      fileName: `backup-recebimento-${today}.json`,
      sizeKB: Math.max(1, Math.round(blob.size / 1024)),
    };
  }

  function exportJSON() {
    const file = generateBackup();
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportedFile(file);
    notify(`Backup gerado: ${file.fileName} (${file.sizeKB} KB)`, "success");
  }

  function downloadAgain() {
    if (!exportedFile) return;
    const url = URL.createObjectURL(exportedFile.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportedFile.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard() {
    if (!exportedFile) return;
    try {
      await navigator.clipboard.writeText(exportedFile.json);
      notify("Conteúdo do backup copiado para a área de transferência.", "success");
    } catch {
      // Fallback: textarea + execCommand
      const ta = document.createElement("textarea");
      ta.value = exportedFile.json;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        notify("Conteúdo do backup copiado para a área de transferência.", "success");
      } catch {
        notify("Não foi possível copiar. Use o botão de download.", "error");
      }
      document.body.removeChild(ta);
    }
  }

  function shareOnWhatsApp() {
    if (!exportedFile) return;
    // Como arquivos JSON não são suportados nativamente pelo share do WhatsApp,
    // compartilhamos o texto (conteúdo) — útil para backup rápido via mensagem.
    const text =
      `📦 *Superbom Nova Iguaçu — Backup Recebimento*\n` +
      `📍 Av. Marques Rolo, Nº 995\n` +
      `📅 ${new Date().toLocaleDateString("pt-BR")}\n` +
      `🗂 ${data.products.length} produtos · ${data.records.length} lançamentos\n\n` +
      `Cole o conteúdo JSON abaixo no campo "Importar" do app em outro dispositivo:\n\n` +
      "```json\n" + exportedFile.json + "\n```";
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    notify("Abrindo WhatsApp com o backup...", "success");
  }

  function sendByEmail() {
    if (!exportedFile) return;
    const subject = `Superbom Nova Iguaçu - Backup Recebimento ${new Date().toLocaleDateString("pt-BR")}`;
    const body =
      `Segue em anexo o backup do Controle de Recebimento.\n\n` +
      `Produtos: ${data.products.length}\n` +
      `Lançamentos: ${data.records.length}\n` +
      `Data: ${new Date().toLocaleString("pt-BR")}\n\n` +
      `Para restaurar em outro dispositivo:\n` +
      `1. Baixe o arquivo JSON anexo\n` +
      `2. Abra o app e clique em "Backup"\n` +
      `3. Selecione o arquivo e escolha Mesclar ou Substituir\n\n` +
      `--- Conteúdo do JSON (caso o anexo não seja suportado) ---\n\n` +
      exportedFile.json;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function saveToGoogleDrive() {
    if (!exportedFile) return;
    // Google Drive aceita upload via URL do tipo "save" — instrui o usuário a arrastar o arquivo baixado
    notify(
      "Baixe o arquivo e arraste-o para o Google Drive em drive.google.com.",
      "info"
    );
    setTimeout(() => {
      window.open("https://drive.google.com/drive/my-drive", "_blank", "noopener,noreferrer");
    }, 200);
  }

  function saveToOneDrive() {
    if (!exportedFile) return;
    notify(
      "Baixe o arquivo e faça upload no OneDrive em onedrive.live.com.",
      "info"
    );
    setTimeout(() => {
      window.open("https://onedrive.live.com/", "_blank", "noopener,noreferrer");
    }, 200);
  }

  function saveToDropbox() {
    if (!exportedFile) return;
    notify(
      "Baixe o arquivo e faça upload no Dropbox em dropbox.com.",
      "info"
    );
    setTimeout(() => {
      window.open("https://www.dropbox.com/home", "_blank", "noopener,noreferrer");
    }, 200);
  }

  function useNativeShare() {
    if (!exportedFile) return;
    if (navigator.share && navigator.canShare) {
      const file = new File([exportedFile.blob], exportedFile.fileName, {
        type: "application/json",
      });
      if (navigator.canShare({ files: [file] })) {
        navigator
          .share({
            title: "Backup Controle de Recebimento",
            text: "Backup dos dados do Controle de Recebimento",
            files: [file],
          })
          .then(() => {
            notify("Backup compartilhado com sucesso.", "success");
          })
          .catch(() => {
            // Usuário cancelou ou erro
          });
        return;
      }
    }
    notify(
      "Seu navegador não suporta compartilhamento nativo. Use as outras opções.",
      "info"
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        // Aceita tanto o formato de backup com version, quanto o formato cru
        const incoming: AppData = {
          products: Array.isArray(parsed.products) ? parsed.products : [],
          records: Array.isArray(parsed.records) ? parsed.records : [],
          conferentes: Array.isArray(parsed.conferentes) ? parsed.conferentes : [],
          colaboradores: Array.isArray(parsed.colaboradores) ? parsed.colaboradores : [],
          locais: Array.isArray(parsed.locais) ? parsed.locais : [],
        };
        if (incoming.products.length === 0 && incoming.records.length === 0) {
          notify("Arquivo inválido ou vazio.", "error");
          return;
        }
        setPendingData(incoming);
        setConfirmMode("replace");
      } catch (err) {
        notify("Erro ao ler o arquivo. Verifique se é um JSON válido.", "error");
      }
    };
    reader.readAsText(file);
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyImport(mode: "replace" | "merge") {
    if (!pendingData) return;
    if (mode === "replace") {
      setData(pendingData);
      notify(`Dados substituídos: ${pendingData.products.length} produtos, ${pendingData.records.length} lançamentos.`, "success");
    } else {
      // Merge: combina produtos e registros, evitando duplicatas por id
      const productsById = new Map<string, typeof data.products[number]>();
      [...data.products, ...pendingData.products].forEach((p) => {
        productsById.set(p.id, p);
      });
      const recordsById = new Map<string, typeof data.records[number]>();
      [...data.records, ...pendingData.records].forEach((r) => {
        recordsById.set(r.id, r);
      });
      const confById = new Map<string, typeof data.conferentes[number]>();
      [...data.conferentes, ...pendingData.conferentes].forEach((c) => confById.set(c.id, c));
      const colabById = new Map<string, typeof data.colaboradores[number]>();
      [...data.colaboradores, ...pendingData.colaboradores].forEach((c) => colabById.set(c.id, c));
      const locById = new Map<string, typeof data.locais[number]>();
      [...data.locais, ...pendingData.locais].forEach((c) => locById.set(c.id, c));
      setData({
        products: Array.from(productsById.values()),
        records: Array.from(recordsById.values()),
        conferentes: Array.from(confById.values()),
        colaboradores: Array.from(colabById.values()),
        locais: Array.from(locById.values()),
      });
      notify(
        `Dados mesclados: ${productsById.size} produtos, ${recordsById.size} lançamentos.`,
        "success"
      );
    }
    setPendingData(null);
    setConfirmMode(null);
    setOpen(false);
  }

  function cancelImport() {
    setPendingData(null);
    setConfirmMode(null);
  }

  // Resetar o estado quando o modal fecha
  function closeModal() {
    cancelImport();
    setExportedFile(null);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        title="Backup: exportar ou importar dados para usar em outro dispositivo"
      >
        <IconDownload className="h-3.5 w-3.5 text-slate-500" />
        Backup
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <IconDownload className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Backup & Sincronização</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {confirmMode === null ? (
                <>
                  <p className="text-sm text-slate-600">
                    Exporte seus dados para um arquivo JSON e importe em outro dispositivo para
                    acessar o mesmo cadastro e os mesmos lançamentos.
                  </p>

                  {/* Estatísticas atuais */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Produtos cadastrados
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-slate-800">
                        {data.products.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Lançamentos salvos
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-slate-800">
                        {data.records.length}
                      </p>
                    </div>
                  </div>

                  {/* Exportar — botão principal + área de opções pós-exportação */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        <IconDownload className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-emerald-900">Exportar backup</h3>
                        <p className="mt-0.5 text-xs text-emerald-800">
                          Gera o arquivo <code className="rounded bg-emerald-100 px-1">.json</code> e
                          mostra onde você pode guardá-lo.
                        </p>
                        <button
                          type="button"
                          onClick={exportJSON}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition"
                        >
                          <IconDownload className="h-3.5 w-3.5" />
                          {exportedFile ? "Gerar novo backup" : "Gerar backup"}
                        </button>
                      </div>
                    </div>

                    {/* Após gerar: mostra onde salvar */}
                    {exportedFile && (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <IconCheck className="h-4 w-4 text-emerald-600" />
                          <p className="text-xs font-bold text-emerald-900">
                            Backup gerado: {exportedFile.fileName} ({exportedFile.sizeKB} KB)
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-600 mb-3">
                          O download deve ter começado automaticamente. Escolha onde guardar:
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={downloadAgain}
                            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center hover:bg-slate-100 hover:border-indigo-300 transition"
                          >
                            <IconDownload className="h-5 w-5 text-slate-600" />
                            <span className="text-[11px] font-semibold text-slate-700">
                              Pasta local
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Downloads
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={sendByEmail}
                            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center hover:bg-slate-100 hover:border-indigo-300 transition"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-5 w-5 text-rose-500"
                            >
                              <rect x={3} y={5} width={18} height={14} rx={2} />
                              <path d="m3 7 9 6 9-6" />
                            </svg>
                            <span className="text-[11px] font-semibold text-slate-700">
                              E-mail
                            </span>
                            <span className="text-[10px] text-slate-500">Gmail, Outlook…</span>
                          </button>
                          <button
                            type="button"
                            onClick={shareOnWhatsApp}
                            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center hover:bg-slate-100 hover:border-emerald-300 transition"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-5 w-5 text-emerald-500"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                            </svg>
                            <span className="text-[11px] font-semibold text-slate-700">
                              WhatsApp
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Enviar conteúdo
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={saveToGoogleDrive}
                            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center hover:bg-slate-100 hover:border-blue-300 transition"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-5 w-5"
                            >
                              <path
                                d="M9 3 4 13l5 9 5-9-1-2H9Z"
                                fill="#0066DA"
                              />
                              <path
                                d="M15 3h-6l5 8h6l-5-8Z"
                                fill="#00AC47"
                              />
                              <path
                                d="m4 13 5 9 5-9H4Z"
                                fill="#EA4335"
                              />
                              <path
                                d="m14 13-5 9 5 0 5-9h-5Z"
                                fill="#FFBA00"
                              />
                            </svg>
                            <span className="text-[11px] font-semibold text-slate-700">
                              Google Drive
                            </span>
                            <span className="text-[10px] text-slate-500">Nuvem Google</span>
                          </button>
                          <button
                            type="button"
                            onClick={saveToOneDrive}
                            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center hover:bg-slate-100 hover:border-blue-300 transition"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-5 w-5"
                            >
                              <path
                                d="M11 4 5 6.5l3 8.5 8 2 3-7-8-6Z"
                                fill="#0364B8"
                              />
                              <path
                                d="M5 6.5 2 14l6 4 3-3-3-8.5H5Z"
                                fill="#0078D4"
                              />
                              <path
                                d="M16 17H2l6 4h13l-5-4Z"
                                fill="#1493DF"
                              />
                              <path
                                d="m16 17-5-4 5-7 3 7-3 4Z"
                                fill="#28A8EA"
                              />
                            </svg>
                            <span className="text-[11px] font-semibold text-slate-700">
                              OneDrive
                            </span>
                            <span className="text-[10px] text-slate-500">Nuvem Microsoft</span>
                          </button>
                          <button
                            type="button"
                            onClick={saveToDropbox}
                            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center hover:bg-slate-100 hover:border-indigo-300 transition"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-5 w-5"
                            >
                              <path
                                d="M6 2 0 6.5l6 4.5 6-4.5L6 2Z"
                                fill="#0061FF"
                              />
                              <path
                                d="m18 2-6 4.5 6 4.5 6-4.5L18 2Z"
                                fill="#0061FF"
                              />
                              <path
                                d="M0 13.5 6 18l6-4.5L6 9 0 13.5Z"
                                fill="#0061FF"
                              />
                              <path
                                d="m18 9-6 4.5L18 18l6-4.5L18 9Z"
                                fill="#0061FF"
                              />
                              <path
                                d="M6 19l6 4.5 6-4.5L12 14.5 6 19Z"
                                fill="#0061FF"
                              />
                            </svg>
                            <span className="text-[11px] font-semibold text-slate-700">
                              Dropbox
                            </span>
                            <span className="text-[10px] text-slate-500">Nuvem Dropbox</span>
                          </button>
                          <button
                            type="button"
                            onClick={copyToClipboard}
                            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center hover:bg-slate-100 hover:border-indigo-300 transition"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-5 w-5 text-slate-600"
                            >
                              <rect x={9} y={9} width={13} height={13} rx={2} />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            <span className="text-[11px] font-semibold text-slate-700">
                              Copiar texto
                            </span>
                            <span className="text-[10px] text-slate-500">Área de transf.</span>
                          </button>
                          <button
                            type="button"
                            onClick={useNativeShare}
                            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-center hover:bg-slate-100 hover:border-indigo-300 transition"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-5 w-5 text-slate-600"
                            >
                              <circle cx={18} cy={5} r={3} />
                              <circle cx={6} cy={12} r={3} />
                              <circle cx={18} cy={19} r={3} />
                              <line x1={8.59} y1={13.51} x2={15.42} y2={17.49} />
                              <line x1={15.41} y1={6.51} x2={8.59} y2={10.49} />
                            </svg>
                            <span className="text-[11px] font-semibold text-slate-700">
                              Mais opções
                            </span>
                            <span className="text-[10px] text-slate-500">Menu do sistema</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Importar */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <IconUpload className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-indigo-900">Importar (Restaurar backup)</h3>
                        <p className="mt-0.5 text-xs text-indigo-800">
                          Carregue um arquivo <code className="rounded bg-indigo-100 px-1">.json</code> de
                          backup. Você poderá escolher entre <strong>substituir</strong> os dados atuais
                          ou <strong>mesclar</strong> mantendo o que já existe.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/json,.json"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition"
                        >
                          <IconUpload className="h-3.5 w-3.5" />
                          Selecionar arquivo de backup
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <p className="font-semibold">💡 Dica para usar em outro dispositivo:</p>
                    <ol className="mt-1 list-decimal pl-4 space-y-0.5 text-amber-700">
                      <li>Gere o backup e guarde em algum dos locais acima.</li>
                      <li>No outro dispositivo, abra o app e clique em "Backup".</li>
                      <li>Selecione o arquivo e escolha "Mesclar" ou "Substituir".</li>
                    </ol>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <p className="font-semibold flex items-center gap-1.5">
                      <IconCheck className="h-4 w-4" />
                      Arquivo lido com sucesso!
                    </p>
                    <p className="mt-1 text-xs">
                      Encontrados:{" "}
                      <strong>{pendingData?.products.length}</strong> produtos e{" "}
                      <strong>{pendingData?.records.length}</strong> lançamentos.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800 mb-1">Como deseja importar?</p>
                    <p>
                      <strong>Substituir</strong> apaga os dados atuais e usa apenas os do arquivo.{" "}
                      <strong>Mesclar</strong> combina os dois, mantendo produtos e lançamentos
                      exclusivos de cada lado (sem duplicar).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={cancelImport}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => applyImport("merge")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                      Mesclar dados
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            "Tem certeza? Isso APAGARÁ todos os dados atuais e substituirá pelos do arquivo."
                          )
                        ) {
                          applyImport("replace");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition"
                    >
                      <IconAlert className="h-3.5 w-3.5" />
                      Substituir tudo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
