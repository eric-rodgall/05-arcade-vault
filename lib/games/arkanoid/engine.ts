// Motor de BLOQUE BUSTER (Arkanoid). Sin React: solo recibe un canvas y callbacks.
import { LEVELS } from "./levels";
import {
  BALL_SPRITE,
  BLOCK_SPRITES,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  PADDLE_SPRITE,
  loadSpritesheet,
  type BlockColor,
  type Frame,
} from "./sprites";

export interface ArkanoidCallbacks {
  onStats: (stats: { score: number; lives: number; level: number }) => void; // solo al cambiar
  onGameOver: (finalScore: number) => void; // una sola vez (derrota o victoria)
}

export interface ArkanoidGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number; // ms
}

export const W = 800;
export const H = 600;
const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const START_LIVES = 3;
const BLOCK_POINTS = 10;
const GAME_KEYS = ["ArrowLeft", "ArrowRight"];

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks
): ArkanoidGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  // ── Estado ──────────────────────────────────────────────────────────────────
  const paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = START_LIVES;
  let score = 0;
  let level = 1;
  let over = false;
  let paused = false;
  let stopped = false;
  let sheet: HTMLImageElement | null = null;
  const keys = { ArrowLeft: false, ArrowRight: false };

  let lastEmitted = "";
  function emitStats() {
    const key = `${score}|${lives}|${level}`;
    if (key === lastEmitted) return;
    lastEmitted = key;
    callbacks.onStats({ score, lives, level });
  }

  function placeBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    placeBall();
  }

  function collideAABB(block: Block): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function finish() {
    over = true;
    emitStats();
    cancelLoop();
    draw();
    callbacks.onGameOver(score);
  }

  // ── Simulación ──────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Paredes (izquierda, derecha, techo)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    // Paleta
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    // Bloques (uno por frame)
    for (const block of blocks) {
      if (!block.alive || !collideAABB(block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      score += BLOCK_POINTS;
      ball.vy = -ball.vy;
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) loadLevel(level + 1);
        else {
          emitStats();
          finish();
          return;
        }
      }
      break;
    }

    // Explosiones
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Pelota perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        finish();
        return;
      }
      placeBall();
    }

    emitStats();
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function drawFrame(f: Frame, x: number, y: number, w: number, h: number) {
    if (!sheet || !ctx) return;
    ctx.drawImage(sheet, f.sx, f.sy, f.sw, f.sh, x, y, w, h);
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (!sheet) return;

    for (const b of blocks) {
      if (b.alive) drawFrame(BLOCK_SPRITES[b.color], b.x, b.y, b.w, b.h);
    }
    for (const exp of explosions) {
      const i = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
      drawFrame(EXPLOSION_FRAMES[exp.color][i], exp.x, exp.y, exp.w, exp.h);
    }
    drawFrame(PADDLE_SPRITE, paddle.x, paddle.y, paddle.w, paddle.h);
    drawFrame(BALL_SPRITE, ball.x, ball.y, ball.w, ball.h);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  let rafId = 0;
  let lastTime: number | null = null;
  let running = false;

  function loop(ts: number) {
    if (!running) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    if (!running) return; // finish() detuvo el loop
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (running || stopped || over || paused || !sheet) return;
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
    if (isTextField(e.target) || !GAME_KEYS.includes(e.code)) return;
    e.preventDefault();
    if (e.code === "ArrowLeft") keys.ArrowLeft = true;
    else keys.ArrowRight = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft") keys.ArrowLeft = false;
    else if (e.code === "ArrowRight") keys.ArrowRight = false;
  }

  function onMouseMove(e: MouseEvent) {
    if (paused || over || stopped) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) * W) / rect.width;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);

  // ── Arranque (espera al spritesheet) ────────────────────────────────────────
  paddle.x = (W - paddle.w) / 2;
  loadLevel(1);
  loadSpritesheet()
    .then((img) => {
      if (stopped) return;
      sheet = img;
      draw();
      emitStats();
      startLoop();
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
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
    destroy() {
      this.stop();
      sheet = null;
      blocks = [];
      explosions = [];
    },
  };
}
