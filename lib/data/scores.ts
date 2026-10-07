import { createClient } from "@/lib/supabase/server";

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface PlayerBest {
  rank: number;
  score: number;
  date: string;
}

export const MAX_NAME_LENGTH = 10;
export const MAX_SCORE = 9_999_999;

export function normalizePlayerName(raw: string): string {
  return raw.trim().toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function getTopScores(gameId: string, limit = 12): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`No se pudo cargar el ranking: ${error.message}`);
  return data.map((r, i) => ({
    rank: i + 1,
    name: r.player_name,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}

export async function getPlayerBest(gameId: string, name: string): Promise<PlayerBest | null> {
  const supabase = await createClient();
  const player = normalizePlayerName(name);

  const { data: best, error } = await supabase
    .from("scores")
    .select("score, created_at")
    .eq("game_id", gameId)
    .eq("player_name", player)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar la marca: ${error.message}`);
  if (!best) return null;

  // Rango = filas con más puntos + filas empatadas pero más antiguas + 1.
  const [higher, tiedOlder] = await Promise.all([
    supabase
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .gt("score", best.score),
    supabase
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("score", best.score)
      .lt("created_at", best.created_at),
  ]);

  if (higher.error || tiedOlder.error) throw new Error("No se pudo calcular el rango");
  return {
    rank: (higher.count ?? 0) + (tiedOlder.count ?? 0) + 1,
    score: best.score,
    date: formatDate(best.created_at),
  };
}
