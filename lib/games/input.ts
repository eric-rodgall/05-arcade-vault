// Entrada compartida entre el gamepad táctil y los motores. Sin React.
// Los códigos coinciden con `KeyboardEvent.code` que ya usa cada motor.
export type GameInputCode =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Space";

export interface GameInputSink {
  setInput(code: GameInputCode, pressed: boolean): void;
}
