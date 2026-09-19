import { supabase } from "./supabaseClient";
import type { DailyRecord } from "./types";

/**
 * Busca todos os lançamentos existentes no Supabase.
 */
export async function carregarRecordsSupabase(): Promise<DailyRecord[]> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .order("date", {
      ascending: false,
    });

  if (error) {
    console.error(
      "❌ Erro ao carregar records do Supabase:",
      error
    );

    throw error;
  }

  return (data ?? []) as DailyRecord[];
}

/**
 * Salva um novo lançamento no Supabase.
 */
export async function criarRecordSupabase(
  record: DailyRecord
): Promise<DailyRecord> {
  const { data, error } = await supabase
    .from("records")
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error(
      "❌ Erro ao criar record no Supabase:",
      error
    );

    throw error;
  }

  return data as DailyRecord;
}

/**
 * Atualiza um lançamento existente.
 */
export async function atualizarRecordSupabase(
  record: DailyRecord
): Promise<DailyRecord> {
  const { data, error } = await supabase
    .from("records")
    .update({
      productId: record.productId,
      date: record.date,
      expectedUnits: record.expectedUnits,
      receivedUnits: record.receivedUnits,
      notes: record.notes ?? null,
      conferenteId: record.conferenteId ?? null,
      colaboradorId: record.colaboradorId ?? null,
      localId: record.localId ?? null,
      resolved: record.resolved ?? false,
      resolvedAt: record.resolvedAt ?? null,
      resolvedBy: record.resolvedBy ?? null,
    })
    .eq("id", record.id)
    .select()
    .single();

  if (error) {
    console.error(
      "❌ Erro ao atualizar record no Supabase:",
      error
    );

    throw error;
  }

  return data as DailyRecord;
}

/**
 * Exclui um lançamento do Supabase.
 */
export async function excluirRecordSupabase(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("records")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "❌ Erro ao excluir record do Supabase:",
      error
    );

    throw error;
  }

  console.log(
    "✅ Record excluído do Supabase:",
    id
  );
}