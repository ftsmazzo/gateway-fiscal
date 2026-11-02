import { MockSefazAdapter } from "./mock-adapter.js";
import type { SefazAdapter } from "./types.js";

export type SefazMode = "mock" | "sefaz";

export function createSefazAdapter(mode: SefazMode): SefazAdapter {
  if (mode === "mock") return new MockSefazAdapter();
  // Fase seguinte: implementar adapter real (XML assinado + WS SEFAZ).
  throw new Error(
    "SEFAZ_MODE=sefaz ainda não implementado. Use mock até o motor real estar pronto.",
  );
}

export type { SefazAdapter, EmitInput, EmitResult } from "./types.js";
