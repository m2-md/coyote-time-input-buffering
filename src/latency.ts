// latency.ts
export const FRAME_MS = 1000 / 60; // 60 FPS'te bir kare ≈ 16.67 ms

/**
 * Basış ile eylemin gerçekleştiği an arasındaki gecikme, kare cinsinden.
 * Pozitif: eylem basıştan sonra ateşlendi (tamponlandı/geç). 0: aynı karede.
 */
export function latencyFrames(
  pressAt: number,
  actionAt: number,
  frameMs = FRAME_MS,
): number {
  return (actionAt - pressAt) / frameMs;
}

/** Bir pencere süresi (ms) kaç kareye denk gelir. */
export function windowInFrames(window: number, frameMs = FRAME_MS): number {
  return window / frameMs;
}
