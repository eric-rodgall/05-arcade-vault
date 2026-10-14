import { FRUITS, loadFruits } from "./fruits";

export interface SnakeCallbacks {
  onStats: (stats: { score: number }) => void; // solo al cambiar
  onGameOver: (finalScore: number) => void; // una sola vez
}

export interface SnakeGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias
}

interface Cell {
  x: number;
  y: number;
}

const COLS = 16;
const ROWS = 12;
const CELL = 40;
const W = COLS * CELL;
const H = ROWS * CELL;
const STEP = 0.125; // segundos por paso (8 pasos/s)
const MAX_DT = 0.05;
const MAX_STEPS_PER_FRAME = 2;
const MAX_QUEUED_TURNS = 2;
const FRUIT_POINTS = 10;
const FRUIT_NAMES = Object.keys(FRUITS);

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEY_TO_DIR: Record<string, Cell> = {
  ArrowUp: DIRS.up,
  ArrowDown: DIRS.down,
  ArrowLeft: DIRS.left,
  ArrowRight: DIRS.right,
  KeyW: DIRS.up,
  KeyS: DIRS.down,
  KeyA: DIRS.left,
  KeyD: DIRS.right,
};

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export function createSnakeGame(canvas: HTMLCanvasElement, callbacks: SnakeCallbacks): SnakeGame {
  const ctx = canvas.getContext("2d")!;

  let snake: Cell[] = [];
  let dir: Cell = DIRS.right; // dirección aplicada en el último paso
  let queue: Cell[] = []; // giros pendientes (máx. 2)
  let fruit: Cell = { x: 0, y: 0 };
  let fruitName = FRUIT_NAMES[0];
  let score = 0;
  let acc = 0;
  let over = false;
  let paused = false;
  let stopped = false;
  let sheet: HTMLImageElement | null = null;

  function emitStats() {
    callbacks.onStats({ score });
  }

  function spawnFruit(): boolean {
    const occupied = new Set(snake.map((c) => c.y * COLS + c.x));
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(y * COLS + x)) free.push({ x, y });
      }
    }
    if (free.length === 0) return false;
    fruit = free[Math.floor(Math.random() * free.length)];
    fruitName = FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
    return true;
  }

  function finish() {
    if (over) return;
    over = true;
    cancelLoop();
    callbacks.onGameOver(score);
  }

  function step() {
    if (queue.length > 0) dir = queue.shift()!;
    const head = snake[0];
    const next = { x: head.x + dir.x, y: head.y + dir.y };
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      finish();
      return;
    }
    const eats = next.x === fruit.x && next.y === fruit.y;
    // Si no come, la cola se libera en este mismo paso: no cuenta como choque.
    const body = eats ? snake : snake.slice(0, -1);
    if (body.some((c) => c.x === next.x && c.y === next.y)) {
      finish();
      return;
    }
    snake.unshift(next);
    if (!eats) {
      snake.pop();
      return;
    }
    score += FRUIT_POINTS;
    emitStats();
    if (!spawnFruit()) finish(); // rejilla llena: victoria
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function drawFruit() {
    const cx = fruit.x * CELL + CELL / 2;
    const cy = fruit.y * CELL + CELL / 2;
    const sprite = sheet ? FRUITS[fruitName] : null;
    if (sheet && sprite) {
      const scale = (CELL - 6) / Math.max(sprite.w, sprite.h);
      const dw = sprite.w * scale;
      const dh = sprite.h * scale;
      ctx.drawImage(sheet, sprite.x, sprite.y, sprite.w, sprite.h, cx - dw / 2, cy - dh / 2, dw, dh);
    } else {
      ctx.fillStyle = "#ff2bd6";
      ctx.shadowColor = "#ff2bd6";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL / 2 - 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawSnake() {
    const pad = 3;
    ctx.shadowColor = "#39ff14";
    ctx.shadowBlur = 8;
    for (let i = snake.length - 1; i >= 0; i--) {
      const c = snake[i];
      ctx.fillStyle = i === 0 ? "#b6ffa0" : "#39ff14";
      ctx.fillRect(c.x * CELL + pad, c.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
    }
    ctx.shadowBlur = 0;

    // Ojos: dos puntos desplazados hacia la dirección de avance.
    const head = snake[0];
    const cx = head.x * CELL + CELL / 2;
    const cy = head.y * CELL + CELL / 2;
    const fx = dir.x * 7;
    const fy = dir.y * 7;
    const sx = -dir.y * 7;
    const sy = dir.x * 7;
    ctx.fillStyle = "#0a0a14";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + fx + sx * side, cy + fy + sy * side, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, H);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(W, y * CELL + 0.5);
    }
    ctx.stroke();
    drawFruit();
    drawSnake();
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  let rafId = 0;
  let lastTime: number | null = null;
  let running = false;

  function loop(ts: number) {
    if (!running) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS_PER_FRAME && !over) {
      acc -= STEP;
      steps++;
      step();
    }
    if (over) {
      draw();
      return;
    }
    if (acc > STEP) acc = STEP; // descarta el atraso sobrante
    draw();
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
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTextField(e.target)) return;
    const wanted = KEY_TO_DIR[e.code];
    if (!wanted) return;
    if (ARROW_KEYS.includes(e.code)) e.preventDefault();
    if (paused || over || stopped) return;
    const ref = queue.length > 0 ? queue[queue.length - 1] : dir;
    const same = wanted.x === ref.x && wanted.y === ref.y;
    const opposite = wanted.x === -ref.x && wanted.y === -ref.y;
    if (same || opposite || queue.length >= MAX_QUEUED_TURNS) return;
    queue.push(wanted);
  }

  window.addEventListener("keydown", onKeyDown);

  // ── Arranque ────────────────────────────────────────────────────────────────
  const midX = Math.floor(COLS / 2);
  const midY = Math.floor(ROWS / 2);
  snake = [
    { x: midX, y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];
  spawnFruit();
  draw();
  emitStats();
  startLoop();

  // La imagen es decorativa: el juego no espera a que cargue.
  loadFruits()
    .then((img) => {
      if (stopped) return;
      sheet = img;
      if (!running) draw();
    })
    .catch((err) => console.error(err));

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
    stop() {
      stopped = true;
      cancelLoop();
      window.removeEventListener("keydown", onKeyDown);
    },
    destroy() {
      this.stop();
      sheet = null;
      snake = [];
      queue = [];
    },
  };
}
