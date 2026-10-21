// Ids y nombres de skin compartidos por los juegos con skins. Sin React.
export const SKIN_IDS = ["clasico", "neon", "retro"] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_NAMES: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);
}
