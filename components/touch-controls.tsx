"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { GameInputCode, GameInputSink } from "@/lib/games/input";
import type { TouchButton, TouchLayout } from "@/lib/games/touch-layouts";

const REPEAT_DELAY = 220; // ms hasta empezar a repetir
const REPEAT_EVERY = 80; // ms entre repeticiones

const DIR_CLASS: Partial<Record<GameInputCode, string>> = {
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "down",
};

// Triángulos de las flechas del D-pad (viewBox 24×24).
const DIR_ARROW: Partial<Record<GameInputCode, string>> = {
  ArrowUp: "M12 4 L20 16 L4 16 Z",
  ArrowRight: "M8 4 L20 12 L8 20 Z",
  ArrowDown: "M4 8 L20 8 L12 20 Z",
  ArrowLeft: "M16 4 L16 20 L4 12 Z",
};

const DIR_ARIA: Partial<Record<GameInputCode, string>> = {
  ArrowUp: "Arriba",
  ArrowLeft: "Izquierda",
  ArrowRight: "Derecha",
  ArrowDown: "Abajo",
};

interface PadButtonProps {
  button: TouchButton;
  className: string;
  ariaLabel: string;
  inputRef: RefObject<GameInputSink | null>;
  disabled: boolean;
  children: ReactNode;
}

function PadButton({
  button,
  className,
  ariaLabel,
  inputRef,
  disabled,
  children,
}: PadButtonProps) {
  const [pressed, setPressed] = useState(false);
  const heldRef = useRef(false);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { code, repeat } = button;

  const stopTimers = () => {
    if (delayRef.current !== null) clearTimeout(delayRef.current);
    if (repeatRef.current !== null) clearInterval(repeatRef.current);
    delayRef.current = null;
    repeatRef.current = null;
  };

  const release = () => {
    stopTimers();
    if (!heldRef.current) return;
    heldRef.current = false;
    setPressed(false);
    inputRef.current?.setInput(code, false);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled || heldRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    heldRef.current = true;
    setPressed(true);
    inputRef.current?.setInput(code, true);
    if (repeat) {
      delayRef.current = setTimeout(() => {
        repeatRef.current = setInterval(
          () => inputRef.current?.setInput(code, true),
          REPEAT_EVERY
        );
      }, REPEAT_DELAY);
    }
  };

  // Pausa o fin de partida: suelta la tecla aunque el dedo siga apoyado.
  useEffect(() => {
    if (disabled) release();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(() => release, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      type="button"
      className={pressed ? `${className} on` : className}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

interface TouchControlsProps {
  layout: TouchLayout;
  inputRef: RefObject<GameInputSink | null>;
  disabled: boolean; // pausa o modal de fin abierto
}

// Gamepad virtual (estilo MK-II). Su visibilidad la decide el CSS con
// `(pointer: coarse)`.
export function TouchControls({
  layout,
  inputRef,
  disabled,
}: TouchControlsProps) {
  return (
    <div
      className="touch-controls"
      role="group"
      aria-label="Controles táctiles"
    >
      <div className="gp">
        <div className="gp-body">
          <div className="gp-dpad">
            {layout.dpad.map((b) => (
              <PadButton
                key={b.code}
                button={b}
                className={`dp dp-${DIR_CLASS[b.code]}`}
                ariaLabel={DIR_ARIA[b.code] ?? b.label}
                inputRef={inputRef}
                disabled={disabled}
              >
                <svg
                  className="dp-arrow"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d={DIR_ARROW[b.code]} fill="currentColor" />
                </svg>
              </PadButton>
            ))}
            <div className="dp-hub" aria-hidden="true">
              <span className="dp-hub-gem" />
            </div>
          </div>
          {layout.actions.length > 0 && (
            <div className="gp-actions">
              {layout.actions.map((b, i) => {
                const letter = i === 0 ? "A" : "B";
                return (
                  <div key={`${b.code}-${i}`} className="ab-wrap">
                    <PadButton
                      button={b}
                      className={`ab ${letter.toLowerCase()}`}
                      ariaLabel={b.label}
                      inputRef={inputRef}
                      disabled={disabled}
                    >
                      <span className="ab-ring" aria-hidden="true" />
                      <span className="ab-letter" aria-hidden="true">
                        {letter}
                      </span>
                    </PadButton>
                    <span className="ab-label" aria-hidden="true">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
