import { describe, expect, it } from "vitest";
import { FRAME_MS, latencyFrames, windowInFrames } from "../src/latency";

describe("latency", () => {
  it("aynı karede 0 gecikme", () => {
    expect(latencyFrames(1000, 1000)).toBe(0);
  });

  it("100ms sonra ~6 kare gecikme", () => {
    expect(latencyFrames(1000, 1100)).toBeCloseTo(100 / FRAME_MS, 10);
    expect(latencyFrames(1000, 1100)).toBeCloseTo(6, 1); // 6.0
  });

  it("120ms pencere ≈ 7.2 kare", () => {
    expect(windowInFrames(120)).toBeCloseTo(7.2, 5);
  });
});
