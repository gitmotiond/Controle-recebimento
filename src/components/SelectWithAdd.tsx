import { useState, useRef, useEffect } from "react";
import { IconCheck, IconX } from "./Icons";

type Option = { id: string; label: string; sublabel?: string };

type Props = {
  label: string;
  value: string;
  options: Option[];
  placeholder?: string;
  onChange: (v: string) => void;
  // Quando o usuário digitar um valor novo (não existente), este callback
  // é chamado com o texto digitado. O componente pai deve adicionar o item
  // e devolver o id criado via prop "newId".
  onAddNew: (text: string) => string;
  // Caso o pai já tenha criado o item, este id é usado para selecioná-lo.
  pendingNewId?: string;
  // Quantidade máxima de itens personalizados no select (não conta os pré-existentes)
  maxCustomItems?: number;
};

export default function SelectWithAdd({
  label,
  value,
  options,
  placeholder = "— Selecione —",
  onChange,
  onAddNew,
  pendingNewId,
}: Props) {
  const [addingNew, setAddingNew] = useState(false);
  const [newValue, setNewValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingNewId && pendingNewId !== value) {
      onChange(pendingNewId);
    }
  }, [pendingNewId, value, onChange]);

  useEffect(() => {
    if (addingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [addingNew]);

  function handleConfirmNew() {
    const text = newValue.trim();
    if (!text) return;
    const id = onAddNew(text);
    onChange(id);
    setNewValue("");
    setAddingNew(false);
  }

  function handleCancel() {
    setNewValue("");
    setAddingNew(false);
  }

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </label>
      {!addingNew ? (
        <div className="flex gap-1">
          <select
            value={value}
            onChange={(e) => {
              if (e.target.value === "__add_new__") {
                setAddingNew(true);
              } else {
                onChange(e.target.value);
              }
            }}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
                {o.sublabel ? ` — ${o.sublabel}` : ""}
              </option>
            ))}
            <option value="__add_new__">+ Adicionar novo…</option>
          </select>
        </div>
      ) : (
        <div className="flex gap-1">
          <input
            ref={inputRef}
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirmNew();
              } else if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
              }
            }}
            placeholder="Digite o novo valor…"
            className="flex-1 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleConfirmNew}
            disabled={!newValue.trim()}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Confirmar (Enter)"
          >
            <IconCheck className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            title="Cancelar (Esc)"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
