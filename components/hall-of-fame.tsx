"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import type { Game } from "@/lib/games";
import type { PlayerBest, ScoreRow } from "@/lib/data/scores";

interface HallOfFameProps {
  games: Game[];
  scoresByGame: Record<string, ScoreRow[]>;
  loadError?: boolean;
}

const EMPTY_SLOT = { name: "---", score: "—", date: "" };

export function HallOfFame({ games, scoresByGame, loadError = false }: HallOfFameProps) {
  const { user } = useSession();
  const [tab, setTab] = useState(games[0]?.id ?? "");
  const [best, setBest] = useState<{ key: string; mejor: PlayerBest | null } | null>(null);
  const rows = scoresByGame[tab] ?? [];
  const game = games.find((g) => g.id === tab);

  const bestKey = user && tab ? `${tab}|${user.name}` : null;
  useEffect(() => {
    if (!bestKey || !user) return;
    let cancelled = false;
    const query = new URLSearchParams({ juego: tab, jugador: user.name });
    fetch(`/api/puntuaciones?${query}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setBest({ key: bestKey, mejor: data?.mejor ?? null });
      })
      .catch(() => {
        if (!cancelled) setBest({ key: bestKey, mejor: null });
      });
    return () => {
      cancelled = true;
    };
  }, [bestKey, tab, user]);

  const mejor = best && best.key === bestKey ? best.mejor : null;
  const slot = (i: number) =>
    rows[i]
      ? { name: rows[i].name, score: rows[i].score.toLocaleString("es-ES"), date: rows[i].date }
      : EMPTY_SLOT;
  const [first, second, third] = [slot(0), slot(1), slot(2)];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className="hall-empty" style={{ textAlign: "center", padding: 60 }}>
          <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)" }}>
            NO SE PUDO CARGAR EL RANKING
          </div>
          <div style={{ color: "var(--ink-faint)", marginTop: 12 }}>Intenta de nuevo en unos minutos.</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="hall-empty" style={{ textAlign: "center", padding: 60 }}>
          <div className="pixel" style={{ fontSize: 14, color: "var(--yellow)" }}>
            NADIE HA ENTRADO AL SALÓN TODAVÍA
          </div>
          <div style={{ color: "var(--ink-faint)", marginTop: 12 }}>
            Sé el primero en dejar tu nombre en {game?.title}.
          </div>
        </div>
      ) : (
        <>
          <div className="podium">
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{second.name}</div>
              <div className="score">{second.score}</div>
              <div className="date">{second.date}</div>
            </div>
            <div className="podium-slot gold">
              <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>01</div>
              <div className="name">{first.name}</div>
              <div className="score" style={{ fontSize: 20 }}>{first.score}</div>
              <div className="date">{first.date}</div>
            </div>
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{third.name}</div>
              <div className="score">{third.score}</div>
              <div className="date">{third.date}</div>
            </div>
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name + i}
                className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {user && mejor && (
              <>
                <div className="tr you-label">▸ TU MEJOR MARCA EN {game?.title}</div>
                <div className="tr you" style={{ animationDelay: `${rows.length * 50 + 50}ms` }}>
                  <div className="rk" style={{ color: "var(--yellow)" }}>#{String(mejor.rank).padStart(2, "0")}</div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>{user.name}</div>
                  <div className="sc" style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}>
                    {mejor.score.toLocaleString("es-ES")}
                  </div>
                  <div className="dt">{mejor.date}</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
