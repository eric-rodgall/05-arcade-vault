import {
  checkRoadCollision,
  getSupport,
  goalIndexAt,
  isRiverRow,
} from "./collision";
import { buildLanes, cellsPerMs } from "./lanes";
import {
  CELL,
  COLS,
  GOAL_COUNT,
  GOAL_WIDTH,
  goalStartCol,
  H,
  JUMP_MS,
  roundSeconds,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_SAFE_MID,
  ROW_START,
  START_LIVES,
  TURTLE_SUBMERGED_MS,
  TURTLE_VISIBLE_MS,
  W,
  type Direction,
  type Entity,
  type Frog,
  type Lane,
} from "./model";
import type { GameInputCode } from "../input";
import type { SkinId } from "../skin-ids";
import { DEFAULT_SKIN, SKINS, type SkinDef } from "./skins";

export { H, W };

export interface FroggerCallbacks {
  onStats: (stats: { score: number; lives: number; level: number }) => void; // solo al cambiar
  onGameOver: (finalScore: number) => void; // una sola vez
}

export interface FroggerGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias
  setInput(code: GameInputCode, pressed: boolean): void; // gamepad táctil
  setSkin(skin: SkinId): void; // cambia el aspecto sin reiniciar la partida
}

const MAX_DT = 50; // ms
const START_COL = COLS / 2;

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const DELTA: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
  skinId: SkinId = DEFAULT_SKIN
): FroggerGame {
  const ctx = canvas.getContext("2d")!;
  let skin: SkinDef = SKINS[skinId] ?? SKINS[DEFAULT_SKIN];

  let level = 1;
  let lives = START_LIVES;
  let score = 0;
  let lanes: Lane[] = buildLanes(level);
  let goals: boolean[] = Array<boolean>(GOAL_COUNT).fill(false); // bocas ocupadas
  let frog: Frog = newFrog();
  let fromCol = frog.col;
  let fromRow = frog.row;
  let facing: Direction = "up";
  let pendingDir: Direction | null = null;
  let farthestRow = ROW_START; // fila más alta alcanzada en esta vida
  const GOAL_POINTS = 50;
  const ROUND_POINTS = 200;
  const ADVANCE_POINTS = 10;
  const TIME_BONUS_PER_SECOND = 10;
  let timeLeft = roundSeconds(level) * 1000; // ms
  let timeTotal = timeLeft;
  let over = false;
  let paused = false;
  let stopped = false;

  let lastStats = "";

  function newFrog(): Frog {
    return {
      col: START_COL,
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: START_COL,
      targetRow: ROW_START,
    };
  }

  function emitStats() {
    const key = `${score}|${lives}|${level}`;
    if (key === lastStats) return;
    lastStats = key;
    callbacks.onStats({ score, lives, level });
  }

  // ── Lógica ──────────────────────────────────────────────────────────────────
  function moveEntities(dt: number) {
    for (const lane of lanes) {
      const delta = cellsPerMs(lane) * dt;
      for (const e of lane.entities) {
        e.col += delta;
        // Al salir por un lado reentra por el opuesto, desplazada el largo del bucle.
        if (lane.dir === 1 && e.col >= COLS) e.col -= lane.span;
        else if (lane.dir === -1 && e.col + e.width <= 0) e.col += lane.span;
        if (e.type === "turtle") advanceTurtle(e, dt);
      }
    }
  }

  function advanceTurtle(e: Entity, dt: number) {
    const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
    e.cycleT = ((e.cycleT ?? 0) + dt) % cycle;
    e.submerged = e.cycleT >= TURTLE_VISIBLE_MS;
  }

  function startJump(dir: Direction) {
    const { dc, dr } = DELTA[dir];
    facing = dir;
    // Sobre un tronco la columna es fraccionaria: el salto se ancla a la celda más cercana.
    const baseCol = Math.round(frog.col);
    const targetCol = baseCol + dc;
    const targetRow = frog.row + dr;
    // La rana no sale por los bordes laterales ni por arriba/abajo del mapa.
    if (
      targetCol < 0 ||
      targetCol >= COLS ||
      targetRow < ROW_GOALS ||
      targetRow > ROW_START
    )
      return;
    fromCol = frog.col;
    fromRow = frog.row;
    frog.animating = true;
    frog.animT = 0;
    frog.targetCol = targetCol;
    frog.targetRow = targetRow;
  }

  function updateFrog(dt: number) {
    if (!frog.animating) {
      if (pendingDir) {
        const dir = pendingDir;
        pendingDir = null;
        startJump(dir);
      }
      return;
    }
    frog.animT += dt;
    if (frog.animT < JUMP_MS) return;
    frog.col = frog.targetCol;
    frog.row = frog.targetRow;
    frog.animating = false;
    frog.animT = 0;
    resolveLanding();
  }

  function respawn() {
    frog = newFrog();
    fromCol = frog.col;
    fromRow = frog.row;
    facing = "up";
    pendingDir = null;
    farthestRow = ROW_START;
    timeLeft = timeTotal;
  }

  function resolveLanding() {
    if (frog.row < farthestRow) {
      score += (farthestRow - frog.row) * ADVANCE_POINTS;
      farthestRow = frog.row;
    }
    if (frog.row === ROW_GOALS) {
      const mouth = goalIndexAt(frog.col);
      if (mouth < 0 || goals[mouth]) {
        killFrog(); // muro entre bocas o boca ya ocupada
        return;
      }
      goals[mouth] = true;
      score +=
        GOAL_POINTS + Math.floor(timeLeft / 1000) * TIME_BONUS_PER_SECOND;
      if (goals.every(Boolean)) completeRound();
      else respawn();
    } else if (isRiverRow(frog.row) && !getSupport(frog, lanes)) {
      killFrog(); // cayó al agua
    }
  }

  // La rana viaja con el tronco o las tortugas sobre las que descansa.
  function carryFrog(dt: number) {
    if (checkRoadCollision(frog, lanes)) {
      killFrog();
      return;
    }
    if (!isRiverRow(frog.row)) return;
    const support = getSupport(frog, lanes);
    if (!support) {
      killFrog(); // tortuga sumergida bajo la rana
      return;
    }
    frog.col += cellsPerMs(support.lane) * dt;
    if (frog.col < -0.5 || frog.col > COLS - 0.5) killFrog(); // arrastrada fuera del río
  }

  function completeRound() {
    score += ROUND_POINTS;
    level += 1;
    goals = Array<boolean>(GOAL_COUNT).fill(false);
    lanes = buildLanes(level);
    timeTotal = roundSeconds(level) * 1000;
    respawn();
  }

  function killFrog() {
    if (over) return;
    lives -= 1;
    if (lives > 0) {
      respawn();
      return;
    }
    over = true;
    pendingDir = null;
    emitStats(); // vidas = 0 antes de avisar del fin de partida
    callbacks.onGameOver(score);
  }

  function update(dt: number) {
    moveEntities(dt);
    updateFrog(dt);
    if (!frog.animating) carryFrog(dt);
    else if (checkRoadCollision(frog, lanes)) killFrog();
    timeLeft -= dt;
    if (timeLeft <= 0) killFrog();
    emitStats();
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  // Rellena la ruta actual con brillo opcional y borde duro opcional.
  function paint(color: string) {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = skin.glow;
  }

  function fillRectS(
    color: string,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    paint(color);
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
    if (skin.outline) {
      ctx.strokeStyle = skin.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }

  function fillPathS(color: string) {
    paint(color);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (skin.outline) {
      ctx.strokeStyle = skin.outline;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawZones() {
    const bands: [number, number, string][] = [
      [ROW_GOALS, ROW_GOALS, skin.goalsBand],
      [ROW_RIVER_TOP, ROW_RIVER_BOT, skin.river],
      [ROW_SAFE_MID, ROW_SAFE_MID, skin.safe],
      [ROW_ROAD_TOP, ROW_ROAD_BOT, skin.road],
      [ROW_START, ROW_START, skin.safe],
    ];
    for (const [from, to, color] of bands) {
      ctx.fillStyle = color;
      ctx.fillRect(0, from * CELL, W, (to - from + 1) * CELL);
    }
    // Líneas discontinuas entre carriles de carretera.
    ctx.strokeStyle = skin.laneLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(W, r * CELL);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGoals() {
    for (let i = 0; i < GOAL_COUNT; i++) {
      const x = goalStartCol(i) * CELL;
      const w = GOAL_WIDTH * CELL;
      ctx.fillStyle = skin.goalFill;
      ctx.fillRect(x, ROW_GOALS * CELL + 4, w, CELL - 4);
      ctx.strokeStyle = skin.goalBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, ROW_GOALS * CELL + 5, w - 2, CELL - 6);
      if (goals[i])
        drawFrogShape(x + w / 2, ROW_GOALS * CELL + CELL / 2 + 2, "up", 0.8);
    }
  }

  function drawEntity(lane: Lane, e: Entity, index: number) {
    const x = e.col * CELL;
    const y = lane.row * CELL;
    const w = e.width * CELL;
    if (e.type === "car") {
      fillRectS(
        skin.carColors[(lane.row + index) % skin.carColors.length],
        x + 3,
        y + 8,
        w - 6,
        CELL - 16
      );
      ctx.fillStyle = skin.carWindow;
      ctx.fillRect(x + (lane.dir === 1 ? w - 16 : 6), y + 11, 10, CELL - 22);
      drawWheels(x, y, w);
    } else if (e.type === "truck") {
      fillRectS(skin.truckBody, x + 3, y + 7, w - 6, CELL - 14);
      const cabX = lane.dir === 1 ? x + w - 20 : x + 3;
      fillRectS(skin.truckCab, cabX, y + 7, 17, CELL - 14);
      drawWheels(x, y, w);
    } else if (e.type === "log") {
      fillRectS(skin.log, x + 1, y + 6, w - 2, CELL - 12);
      ctx.strokeStyle = skin.logGrain;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let lx = x + 14; lx < x + w - 6; lx += 22) {
        ctx.moveTo(lx, y + 9);
        ctx.lineTo(lx, y + CELL - 9);
      }
      ctx.stroke();
    } else {
      for (let c = 0; c < e.width; c++) {
        const cx = x + c * CELL + CELL / 2;
        const cy = y + CELL / 2;
        if (e.submerged) {
          ctx.strokeStyle = skin.turtleSubmerged;
          ctx.lineWidth = 2;
          if (skin.blocky) ctx.setLineDash([6, 4]);
          ctx.beginPath();
          if (skin.blocky) ctx.rect(cx - 14, cy - 14, 28, 28);
          else ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          continue;
        }
        ctx.beginPath();
        if (skin.blocky) ctx.rect(cx - 15, cy - 15, 30, 30);
        else ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        fillPathS(skin.turtle);
        ctx.strokeStyle = skin.turtleLine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.moveTo(cx - 15, cy);
        ctx.lineTo(cx + 15, cy);
        ctx.moveTo(cx, cy - 15);
        ctx.lineTo(cx, cy + 15);
        ctx.stroke();
      }
    }
  }

  function drawWheels(x: number, y: number, w: number) {
    ctx.fillStyle = skin.wheel;
    for (const wx of [x + 12, x + w - 12]) {
      ctx.beginPath();
      ctx.arc(wx, y + 8, 4, 0, Math.PI * 2);
      ctx.arc(wx, y + CELL - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Rana centrada en (cx, cy). `scale` 1 = celda completa.
  function drawFrogShape(
    cx: number,
    cy: number,
    dir: Direction,
    scale: number,
    leap = 0
  ) {
    ctx.save();
    ctx.translate(cx, cy);
    const angle = {
      up: 0,
      right: Math.PI / 2,
      down: Math.PI,
      left: -Math.PI / 2,
    }[dir];
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    // Patas: más abiertas durante el salto.
    const spread = 12 + leap * 6;
    for (const sx of [-1, 1]) {
      fillRectS(skin.frog, sx * spread - 3, -11, 6, 8);
      fillRectS(skin.frog, sx * spread - 3, 5, 6, 8);
    }
    ctx.beginPath();
    if (skin.blocky) ctx.rect(-13, -11, 26, 22);
    else ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
    fillPathS(skin.frog);
    ctx.fillStyle = skin.frogEye;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * 6, -9, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = skin.frogPupil;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * 6, -10, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFrog() {
    let col = frog.col;
    let row = frog.row;
    let leap = 0;
    if (frog.animating) {
      const t = Math.min(frog.animT / JUMP_MS, 1);
      col = fromCol + (frog.targetCol - fromCol) * t;
      row = fromRow + (frog.targetRow - fromRow) * t;
      leap = Math.sin(t * Math.PI);
    }
    drawFrogShape(
      col * CELL + CELL / 2,
      row * CELL + CELL / 2,
      facing,
      1 + leap * 0.15,
      leap
    );
  }

  // Única información de partida que el HUD de React no muestra.
  function drawTimeBar() {
    const ratio = Math.max(0, timeLeft / timeTotal);
    ctx.fillStyle =
      ratio > 0.5 ? skin.timeHigh : ratio > 0.25 ? skin.timeMid : skin.timeLow;
    ctx.fillRect(0, 0, W * ratio, 6);
  }

  function draw() {
    drawZones();
    drawGoals();
    for (const lane of lanes)
      lane.entities.forEach((e, i) => drawEntity(lane, e, i));
    drawFrog();
    drawTimeBar();
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  let rafId = 0;
  let lastTime: number | null = null;
  let running = false;

  function loop(ts: number) {
    if (!running) return;
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt);
    draw();
    if (over) {
      cancelLoop();
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (running || stopped || over || paused) return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function cancelLoop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // ── Entrada ─────────────────────────────────────────────────────────────────
  function isTextField(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    );
  }

  function press(code: string) {
    const dir = KEY_TO_DIR[code];
    if (!dir || paused || over || stopped) return;
    pendingDir = dir;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTextField(e.target)) return;
    if (!KEY_TO_DIR[e.code]) return;
    e.preventDefault();
    if (!e.repeat) press(e.code);
  }

  window.addEventListener("keydown", onKeyDown);

  // ── Arranque ────────────────────────────────────────────────────────────────
  draw();
  emitStats();
  startLoop();

  return {
    pause() {
      if (paused) return;
      paused = true;
      cancelLoop();
    },
    resume() {
      if (!paused) return;
      paused = false;
      startLoop();
    },
    setInput(code, pressed) {
      if (pressed) press(code);
    },
    setSkin(id) {
      skin = SKINS[id] ?? SKINS[DEFAULT_SKIN];
      if (!running) draw(); // pausada o terminada: repinta con el nuevo aspecto
    },
    stop() {
      stopped = true;
      cancelLoop();
      window.removeEventListener("keydown", onKeyDown);
    },
    destroy() {
      this.stop();
      lanes = [];
      goals = [];
      pendingDir = null;
    },
  };
}
