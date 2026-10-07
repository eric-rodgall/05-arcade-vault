// Motor de ASTEROIDES (Asteroids). Sin React: solo recibe un canvas y callbacks.
import {
  Asteroid,
  Bullet,
  H,
  Particle,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  PowerUp,
  Ship,
  W,
  dist,
  rand,
  type Keys,
} from "./entities";

export interface AsteroidsCallbacks {
  onStats: (stats: { score: number; lives: number; level: number }) => void; // al cambiar cualquiera
  onGameOver: (finalScore: number) => void; // al llegar a 0 vidas
}

export interface AsteroidsGame {
  pause(): void;
  resume(): void;
  stop(): void; // detiene el loop y quita los listeners; no se puede reanudar
  destroy(): void; // stop() + liberar referencias; lo llama el cleanup del useEffect
}

type GameState = "playing" | "dead" | "gameover";

const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks
): AsteroidsGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  // ── Input ───────────────────────────────────────────────────────────────────
  let keys: Keys = {};
  let justPressed: Keys = {};

  const isTextField = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextField(e.target)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };

  function pressed(code: string): boolean {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  }

  // ── Estado del juego ────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: GameState = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  let lastStats = { score: -1, lives: -1, level: -1 };
  function emitStats() {
    if (
      lastStats.score === score &&
      lastStats.lives === lives &&
      lastStats.level === level
    )
      return;
    lastStats = { score, lives, level };
    callbacks.onStats({ score, lives, level });
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
    emitStats();
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
    emitStats();
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      emitStats();
      callbacks.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = 2;
      emitStats();
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    emitStats();

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw (sin HUD ni overlays: los muestra GamePlayer) ──────────────────────
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let running = false;
  let stopped = false;

  function loop(ts: number) {
    const dt =
      lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || stopped) return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function halt() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  initGame();
  draw();
  start();

  return {
    pause() {
      halt();
      // Evita teclas "pegadas" si se suelta una tecla durante la pausa.
      keys = {};
      justPressed = {};
    },
    resume() {
      start();
    },
    stop() {
      stopped = true;
      halt();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
    destroy() {
      this.stop();
      bullets = [];
      asteroids = [];
      particles = [];
      powerUps = [];
    },
  };
}
