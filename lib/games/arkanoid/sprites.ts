export type BlockColor = "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export const SPRITESHEET_URL = "/games/bloque-buster/spritesheet-breakout.png";
export const EXPLOSION_DURATION = 150; // ms

export const PADDLE_SPRITE: Frame = { sx: 32, sy: 112, sw: 162, sh: 14 };
export const BALL_SPRITE: Frame = { sx: 32, sy: 32, sw: 16, sh: 16 };

export const BLOCK_SPRITES: Record<BlockColor, Frame> = {
  gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

// Cada color tiene 4 frames consecutivos de 32×16 a partir de x=256. El gris
// reutiliza la fila del rojo, como en el original.
const EXPLOSION_ROW_Y: Record<BlockColor, number> = {
  red: 176,
  gray: 176,
  cyan: 192,
  green: 208,
  magenta: 224,
  yellow: 240,
  hotpink: 256,
};

export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = Object.fromEntries(
  (Object.keys(EXPLOSION_ROW_Y) as BlockColor[]).map((color) => [
    color,
    [0, 1, 2, 3].map((i) => ({ sx: 256 + i * 32, sy: EXPLOSION_ROW_Y[color], sw: 32, sh: 16 })),
  ])
) as Record<BlockColor, Frame[]>;

export function loadSpritesheet(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar el spritesheet"));
    img.src = SPRITESHEET_URL;
  });
}
