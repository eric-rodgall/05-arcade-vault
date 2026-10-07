import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/games";

const COLUMNS = "id, title, short, long, cat, cover, color, best, plays";

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(COLUMNS)
    .order("sort_order");

  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  return data as Game[];
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el juego: ${error.message}`);
  return data as Game | null;
}
