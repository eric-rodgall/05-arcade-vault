import { Library } from "@/components/library";
import { getGames } from "@/lib/data/games";

export default async function BibliotecaPage() {
  const games = await getGames();
  return <Library games={games} />;
}
