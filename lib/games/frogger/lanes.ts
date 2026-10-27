import {
  CELL,
  COLS,
  SPEED_PER_LEVEL,
  TURTLE_SUBMERGED_MS,
  TURTLE_VISIBLE_MS,
  type Entity,
  type EntityType,
  type Lane,
} from "./model";

// [ancho, hueco posterior] en celdas. Los carriles son deterministas: mismo nivel,
// mismo mapa.
type Segment = [width: number, gap: number];

interface LaneDef {
  row: number;
  speed: number; // px/frame al nivel 1
  dir: 1 | -1;
  type: EntityType;
  segments: Segment[];
}

// Los vehículos van más despacio que lo que sugerían las velocidades base del spec.
const ROAD_SPEED_FACTOR = 0.5;

const ROAD: LaneDef[] = [
  {
    row: 8,
    speed: 2,
    dir: 1,
    type: "car",
    segments: [
      [1, 4],
      [1, 3],
      [1, 5],
      [1, 3],
    ],
  },
  {
    row: 9,
    speed: 3,
    dir: -1,
    type: "truck",
    segments: [
      [3, 5],
      [2, 4],
      [3, 4],
    ],
  },
  {
    row: 10,
    speed: 1.5,
    dir: 1,
    type: "car",
    segments: [
      [1, 3],
      [1, 4],
      [1, 3],
      [1, 4],
    ],
  },
  {
    row: 11,
    speed: 4,
    dir: -1,
    type: "car",
    segments: [
      [1, 6],
      [1, 5],
      [1, 6],
    ],
  },
  {
    row: 12,
    speed: 2.5,
    dir: 1,
    type: "truck",
    segments: [
      [2, 5],
      [3, 4],
      [2, 4],
    ],
  },
];

const RIVER: LaneDef[] = [
  {
    row: 1,
    speed: 1.5,
    dir: -1,
    type: "log",
    segments: [
      [3, 3],
      [4, 2],
      [3, 3],
    ],
  },
  {
    row: 2,
    speed: 1.2,
    dir: 1,
    type: "turtle",
    segments: [
      [3, 3],
      [2, 3],
      [3, 3],
    ],
  },
  {
    row: 3,
    speed: 2.5,
    dir: -1,
    type: "log",
    segments: [
      [4, 3],
      [3, 4],
      [2, 3],
    ],
  },
  {
    row: 4,
    speed: 1,
    dir: 1,
    type: "log",
    segments: [
      [2, 2],
      [3, 3],
      [3, 2],
      [2, 2],
    ],
  },
  {
    row: 5,
    speed: 2,
    dir: -1,
    type: "turtle",
    segments: [
      [2, 3],
      [3, 3],
      [2, 3],
      [3, 3],
    ],
  },
  {
    row: 6,
    speed: 3,
    dir: 1,
    type: "log",
    segments: [
      [3, 4],
      [2, 3],
      [4, 3],
    ],
  },
];

// Fase del ciclo de cada grupo de tortugas: reparte las inmersiones para que no
// se hundan todas a la vez.
const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;

function buildLane(def: LaneDef, level: number, laneIndex: number): Lane {
  const entities: Entity[] = [];
  let col = 0;
  let maxWidth = 0;
  def.segments.forEach(([width, gap], i) => {
    const entity: Entity = { col, width, type: def.type };
    if (def.type === "turtle") {
      entity.cycleT = ((laneIndex * 3 + i) * 1700) % TURTLE_CYCLE_MS;
      entity.submerged = entity.cycleT >= TURTLE_VISIBLE_MS;
    }
    entities.push(entity);
    maxWidth = Math.max(maxWidth, width);
    col += width + gap;
  });
  // El bucle debe cubrir la pantalla más la entidad más ancha, para que reentre
  // siempre fuera de la vista.
  const span = Math.max(col, COLS + maxWidth);
  return {
    row: def.row,
    speed:
      def.speed *
      (def.type === "car" || def.type === "truck" ? ROAD_SPEED_FACTOR : 1) *
      SPEED_PER_LEVEL ** (level - 1),
    dir: def.dir,
    span,
    entities,
  };
}

/** Mapa de carriles de carretera (filas 8–12) y río (filas 1–6) para un nivel (≥ 1). */
export function buildLanes(level: number): Lane[] {
  return [...RIVER, ...ROAD].map((def, i) => buildLane(def, level, i));
}

/** Celdas que avanza una entidad en `dt` ms: `speed` está en px por frame de 16 ms. */
export function cellsPerMs(lane: Lane): number {
  return (lane.speed / CELL / 16) * lane.dir;
}
