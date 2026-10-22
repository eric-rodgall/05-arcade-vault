"use client";

import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
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
}

function PadButton({
  button,
  className,
  ariaLabel,
  inputRef,
  disabled,
}: PadButtonProps) {
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
    inputRef.current?.setInput(code, false);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled || heldRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    heldRef.current = true;
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
      className={className}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {button.label}
    </button>
  );
}

interface TouchControlsProps {
  layout: TouchLayout;
  inputRef: RefObject<GameInputSink | null>;
  disabled: boolean; // pausa o modal de fin abierto
}

// Gamepad virtual. Su visibilidad la decide el CSS con `(pointer: coarse)`.
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
      <div className="touch-dpad">
        {layout.dpad.map((b) => (
          <PadButton
            key={b.code}
            button={b}
            className={`touch-btn touch-dir touch-dir-${DIR_CLASS[b.code]}`}
            ariaLabel={DIR_ARIA[b.code] ?? b.label}
            inputRef={inputRef}
            disabled={disabled}
          />
        ))}
      </div>
      {layout.actions.length > 0 && (
        <div className="touch-actions">
          {layout.actions.map((b, i) => (
            <PadButton
              key={`${b.code}-${i}`}
              button={b}
              className={`touch-btn touch-action touch-action-${i === 0 ? "a" : "b"}`}
              ariaLabel={b.label}
              inputRef={inputRef}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
