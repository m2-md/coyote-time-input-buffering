// latency.ts
export const FRAME_MS = 1000 / 60; // one frame at 60 FPS ≈ 16.67 ms

/**
 * Latency between button press and action execution, in frames.
 * Positive: action fired after press (buffered/delayed). 0: same frame.
 */
export function latencyFrames(
  pressAt: number,
  actionAt: number,
  frameMs = FRAME_MS,
): number {
  return (actionAt - pressAt) / frameMs;
}

/** Converts window duration (ms) to frame count. */
export function windowInFrames(window: number, frameMs = FRAME_MS): number {
  return window / frameMs;
}
