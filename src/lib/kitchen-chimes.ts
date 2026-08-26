/**
 * Kitchen counter chimes — synthesized with Web Audio (no MP3 assets).
 * Distinct patterns so staff hear "new ticket" vs "existing ticket changed".
 */

export type KitchenChimeKind = "new_order" | "order_update";

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function isKitchenAudioUnlocked() {
  return unlocked && audioCtx?.state === "running";
}

/** Browsers block sound until a user gesture — call from a button click. */
export async function unlockKitchenAudio() {
  const ctx = getCtx();
  if (!ctx) return false;
  if (ctx.state === "suspended") await ctx.resume();
  // Prime a near-silent tick so later chimes are allowed.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.02);
  unlocked = ctx.state === "running";
  return unlocked;
}

function tone(
  ctx: AudioContext,
  {
    frequency,
    start,
    duration,
    volume = 0.18,
    type = "sine",
  }: {
    frequency: number;
    start: number;
    duration: number;
    volume?: number;
    type?: OscillatorType;
  },
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Urgent rising triple — brand-new guest ticket. */
function playNewOrder(ctx: AudioContext) {
  tone(ctx, { frequency: 880, start: 0, duration: 0.14, volume: 0.22, type: "triangle" });
  tone(ctx, { frequency: 1174.7, start: 0.16, duration: 0.14, volume: 0.22, type: "triangle" });
  tone(ctx, { frequency: 1396.9, start: 0.32, duration: 0.22, volume: 0.2, type: "triangle" });
}

/** Softer two-note — existing ticket status / update. */
function playOrderUpdate(ctx: AudioContext) {
  tone(ctx, { frequency: 523.25, start: 0, duration: 0.12, volume: 0.14, type: "sine" });
  tone(ctx, { frequency: 659.25, start: 0.14, duration: 0.18, volume: 0.14, type: "sine" });
}

export async function playKitchenChime(kind: KitchenChimeKind) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  if (ctx.state !== "running") return;
  unlocked = true;
  if (kind === "new_order") playNewOrder(ctx);
  else playOrderUpdate(ctx);
}
