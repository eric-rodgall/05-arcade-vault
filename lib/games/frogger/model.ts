// Constantes y tipos del motor de Frogger. Sin React ni canvas.

export const COLS = 16;
export const ROWS = 14;
export const CELL = 40; // px
export const W = COLS * CELL; // 640
export const H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;

// Bocas destino: 5 bocas de 2 columnas cada una sobre la fila 0.
export const GOAL_COUNT = 5;
export const GOAL_WIDTH = 2;
/** Columna donde empieza la boca `i`: 1-2, 4-5, 7-8, 10-11 y 13-14 (muro entre ellas). */
export const goalStartCol = (i: number) => 1 + i * 3;

export const JUMP_MS = 120; // duración del salto de 1 celda
export const START_LIVES = 3;
export const ROUND_SECONDS = 15; // tiempo inicial de ronda
export const SPEED_PER_LEVEL = 1.15; // +15 % de velocidad por nivel

// Ciclo de inmersión de las tortugas
export const TURTLE_VISIBLE_MS = 3000;
export const TURTLE_SUBMERGED_MS = 1500;

export type Direction = "up" | "down" | "left" | "right";

export type EntityType = "car" | "truck" | "log" | "turtle";

export interface Entity {
  col: number; // fraccionaria: las entidades se mueven de forma continua
  width: number; // en celdas
  type: EntityType;
  submerged?: boolean; // solo tortugas
  cycleT?: number; // solo tortugas: ms dentro de su ciclo visible/sumergida
}

export interface Lane {
  row: number;
  speed: number; // px/frame de referencia (1 frame = 16 ms)
  dir: 1 | -1;
  span: number; // celdas del bucle: al salir una entidad reentra desplazada `span`
  entities: Entity[];
}

export interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms transcurridos del salto
  targetCol: number;
  targetRow: number;
}
