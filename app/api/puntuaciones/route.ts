import { getPlayerBest, MAX_NAME_LENGTH, MAX_SCORE, normalizePlayerName } from "@/lib/data/scores";
import { createAdminClient } from "@/lib/supabase/admin";

interface ScoreRequestBody {
  game: unknown;
  name: unknown;
  score: unknown;
}

export async function POST(request: Request) {
  let body: Partial<ScoreRequestBody>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "DATOS_INVALIDOS" }, { status: 400 });
  }

  const { game, name, score } = body;
  const player = typeof name === "string" ? normalizePlayerName(name) : "";

  if (
    typeof game !== "string" ||
    !game ||
    player.length < 1 ||
    player.length > MAX_NAME_LENGTH ||
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 1 ||
    score > MAX_SCORE
  ) {
    return Response.json({ ok: false, error: "DATOS_INVALIDOS" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return Response.json({ ok: false, error: "CONFIG_FALTANTE" }, { status: 500 });
  }

  const { error } = await supabase
    .from("scores")
    .insert({ game_id: game, player_name: player, score });

  if (error) {
    // 23503: violación de clave foránea, el juego no existe.
    if (error.code === "23503") {
      return Response.json({ ok: false, error: "JUEGO_NO_ENCONTRADO" }, { status: 404 });
    }
    return Response.json({ ok: false, error: "GUARDADO_FALLIDO" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const game = params.get("juego")?.trim();
  const player = params.get("jugador")?.trim();

  if (!game || !player) {
    return Response.json({ ok: false, error: "DATOS_INVALIDOS" }, { status: 400 });
  }

  try {
    const mejor = await getPlayerBest(game, player);
    return Response.json({ ok: true, mejor });
  } catch {
    return Response.json({ ok: false, error: "CONSULTA_FALLIDA" }, { status: 500 });
  }
}
