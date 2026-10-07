import type { Metadata } from "next";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/data/games";
import { getTopScores, type ScoreRow } from "@/lib/data/scores";
import type { Game } from "@/lib/games";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};

async function loadRanking(): Promise<{
  games: Game[];
  scoresByGame: Record<string, ScoreRow[]>;
} | null> {
  try {
    const games = await getGames();
    const tops = await Promise.all(games.map((g) => getTopScores(g.id, 12)));
    const scoresByGame: Record<string, ScoreRow[]> = {};
    games.forEach((g, i) => {
      scoresByGame[g.id] = tops[i];
    });
    return { games, scoresByGame };
  } catch {
    return null;
  }
}

export default async function SalonPage() {
  const ranking = await loadRanking();
  if (!ranking) return <HallOfFame games={[]} scoresByGame={{}} loadError />;
  return <HallOfFame games={ranking.games} scoresByGame={ranking.scoresByGame} />;
}
