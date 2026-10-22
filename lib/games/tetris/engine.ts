// Motor de TETRIS. Sin React: solo recibe un canvas y callbacks.
import {
  BLOCK,
  COLS,
  KICKS,
  LINE_SCORES,
  PIECES,
  ROWS,
  collide,
  createBoard,
  rotateCW,
  type Board,
  type Shape,
} from "./pieces";
import { SKINS, DEFAULT_SKIN, type SkinDef } from "./skins";
import type { SkinId } from "../skin-ids";
import type { GameInputCode } from "../input";

export interface TetrisCallbacks {
  onStats: (stats: { score: number; level: number; lines: number }) => void; // solo al cambiar
  onGameOver: (finalScore: number) => void; // una sola vez
}

export interface TetrisGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias
  setSkin(skin: SkinId): void; // cambia el aspecto sin reiniciar la partida
  setInput(code: GameInputCode, pressed: boolean): void; // gamepad táctil
}

interface Piece {
  type: number;
  shape: Shape;
  x: number;
  y: number;
}

// Canvas lógico: tablero de 300×600 + columna de 120 px con la siguiente pieza.
export const W = 420;
export const H = 600;
const BOARD_W = COLS * BLOCK;
const NEXT_BLOCK = 30;
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"];

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = (PIECES[type] as Shape).map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
  skinId: SkinId = DEFAULT_SKIN
): TetrisGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  // ── Estado ──────────────────────────────────────────────────────────────────
  let board: Board = createBoard();
  let current: Piece;
  let next: Piece;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = 1; // segundos
  let dropAccum = 0;
  let over = false;
  let paused = false;
  let destroyed = false;
  let skin: SkinDef = SKINS[skinId] ?? SKINS[DEFAULT_SKIN];

  let lastEmitted = "";
  function emitStats() {
    const key = `${score}|${level}|${lines}`;
    if (key === lastEmitted) return;
    lastEmitted = key;
    callbacks.onStats({ score, level, lines });
  }

  // ── Reglas ──────────────────────────────────────────────────────────────────
  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90) / 1000;
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(board, current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) endGame();
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function endGame() {
    over = true;
    halt();
    emitStats();
    callbacks.onGameOver(score);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const isTextField = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  const press = (code: string) => {
    if (paused || over || stopped) return;
    switch (code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y))
          current.x--;
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y))
          current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
      default:
        return;
    }
    emitStats();
    if (!over) draw();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextField(e.target)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    press(e.code);
  };

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function drawBlock(
    x: number,
    y: number,
    colorIndex: number,
    size: number,
    ghost = false
  ) {
    if (!ctx || !colorIndex) return;
    const color = skin.colors[colorIndex] as string;
    const px = x * size + 1;
    const py = y * size + 1;
    const s = size - 2;
    if (ghost && skin.ghost === "outline") {
      ctx.globalAlpha = skin.ghostAlpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = ghost ? skin.ghostAlpha : 1;
    ctx.fillStyle = color;
    if (skin.glow && !ghost) {
      ctx.shadowColor = color;
      ctx.shadowBlur = skin.glow;
    }
    ctx.fillRect(px, py, s, s);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    if (skin.border && !ghost) {
      ctx.strokeStyle = skin.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
    }
    if (skin.bevel) {
      ctx.fillStyle = skin.bevel;
      ctx.fillRect(px, py, s, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawGrid(c: CanvasRenderingContext2D) {
    c.strokeStyle = skin.grid;
    c.lineWidth = skin.gridWidth;
    for (let col = 1; col < COLS; col++) {
      c.beginPath();
      c.moveTo(col * BLOCK, 0);
      c.lineTo(col * BLOCK, ROWS * BLOCK);
      c.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      c.beginPath();
      c.moveTo(0, r * BLOCK);
      c.lineTo(BOARD_W, r * BLOCK);
      c.stroke();
    }
  }

  function drawNext(c: CanvasRenderingContext2D) {
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    c.save();
    c.translate(BOARD_W, NEXT_BLOCK); // panel derecho, 4×4 bloques
    for (let r = 0; r < shape.length; r++)
      for (let col = 0; col < shape[r].length; col++)
        drawBlock(offX + col, offY + r, shape[r][col], NEXT_BLOCK);
    c.restore();
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = skin.background;
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx);

    // separador del panel «siguiente»
    ctx.strokeStyle = skin.separator;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BOARD_W + 0.5, 0);
    ctx.lineTo(BOARD_W + 0.5, H);
    ctx.stroke();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(c, r, board[r][c], BLOCK);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(current.x + c, gy + r, current.shape[r][c], BLOCK, true);

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(current.x + c, current.y + r, current.shape[r][c], BLOCK);

    drawNext(ctx);
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let running = false;
  let stopped = false;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
      emitStats();
    }
    if (over) return;
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || stopped || over) return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function halt() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ── Arranque ────────────────────────────────────────────────────────────────
  next = randomPiece();
  current = next; // se sobrescribe en spawn()
  spawn();
  emitStats();
  window.addEventListener("keydown", onKeyDown);
  if (!over) {
    draw();
    start();
  }

  return {
    pause() {
      paused = true;
      halt();
    },
    resume() {
      paused = false;
      start();
    },
    setSkin(id: SkinId) {
      skin = SKINS[id] ?? SKINS[DEFAULT_SKIN];
      if (!destroyed) draw();
    },
    setInput(code, pressed) {
      if (pressed) press(code);
    },
    stop() {
      stopped = true;
      halt();
      window.removeEventListener("keydown", onKeyDown);
    },
    destroy() {
      this.stop();
      destroyed = true;
      board = [];
    },
  };
}
