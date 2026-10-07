export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Filter = "TODOS" | Category;
export type AccentColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: AccentColor;
  best: number;
  plays: string;
}

export const CATS: Filter[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
