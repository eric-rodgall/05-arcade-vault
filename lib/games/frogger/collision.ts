import {
  GOAL_COUNT,
  GOAL_WIDTH,
  goalStartCol,
  JUMP_MS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
} from "./model";
import type { Entity, Frog, Lane } from "./model";

// La rana ocupa una celda; se acorta 0.2 por lado para que un roce no cuente como choque.
const FROG_MARGIN = 0.2;

export const isRoadRow = (row: number) =>
  row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
export const isRiverRow = (row: number) =>
  row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;

/** Posición con la que se evalúan los choques: durante el salto, la celda de destino a partir de la mitad. */
export function effectiveCell(frog: Frog): { col: number; row: number } {
  if (frog.animating && frog.animT >= JUMP_MS / 2) {
    return { col: frog.targetCol, row: frog.targetRow };
  }
  return { col: frog.col, row: frog.row };
}

/** `true` si la rana está en un carril de carretera solapada con un vehículo. */
export function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  const { col, row } = effectiveCell(frog);
  if (!isRoadRow(row)) return false;
  const lane = lanes.find((l) => l.row === row);
  if (!lane) return false;
  return lane.entities.some(
    (e) => col + 1 - FROG_MARGIN > e.col && col + FROG_MARGIN < e.col + e.width
  );
}

export interface Support {
  lane: Lane;
  entity: Entity;
}

/**
 * Tronco o tortuga visible sobre la que descansa la rana (su centro cae dentro).
 * `null` si está en el agua, si no está en un carril de río o si la tortuga está sumergida.
 */
export function getSupport(frog: Frog, lanes: Lane[]): Support | null {
  if (!isRiverRow(frog.row)) return null;
  const lane = lanes.find((l) => l.row === frog.row);
  if (!lane) return null;
  const center = frog.col + 0.5;
  const entity = lane.entities.find(
    (e) => center >= e.col && center < e.col + e.width
  );
  if (!entity || entity.submerged) return null;
  return { lane, entity };
}

/** Índice de la boca destino bajo la rana, o -1 si cae en el muro entre bocas. */
export function goalIndexAt(col: number): number {
  const center = col + 0.5;
  for (let i = 0; i < GOAL_COUNT; i++) {
    const start = goalStartCol(i);
    if (center >= start && center < start + GOAL_WIDTH) return i;
  }
  return -1;
}
