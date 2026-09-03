// input-buffer.ts
// A "token" represents raw input: "jump", "punch", or a negative edge
// like "punch^" (release). The buffer does not interpret token meaning, it only timestamps.

export type Token = string;

export interface Stamp {
  token: Token;
  at: number; // timestamp when pressed (ms)
  consumed: boolean;
}

export class InputBuffer {
  private stamps: Stamp[] = [];

  /** Timestamped record. `now` is passed from outside (no wall clock). */
  press(token: Token, now: number): void {
    this.stamps.push({ token, at: now, consumed: false });
  }

  /**
   * If within the window, consume the newest unconsumed stamp (once) and return true.
   * Valid if `now - at <= window`; otherwise false. A consumed stamp cannot be
   * consumed again.
   */
  consume(token: Token, now: number, window: number): boolean {
    for (let i = this.stamps.length - 1; i >= 0; i--) {
      const s = this.stamps[i];
      if (s.consumed || s.token !== token) continue;
      const age = now - s.at;
      if (age >= 0 && age <= window) {
        s.consumed = true;
        return true;
      }
    }
    return false;
  }

  /** Discard expired or consumed stamps. Called once per frame. */
  prune(now: number, maxAge: number): void {
    this.stamps = this.stamps.filter(
      (s) => !s.consumed && now - s.at <= maxAge,
    );
  }

  /** Read-only copy for visualization (demo overlay reads this). */
  peek(): ReadonlyArray<Readonly<Stamp>> {
    return this.stamps.map((s) => ({ ...s }));
  }
}

// coyote is a special case of a generalized time window
export function coyoteWindow(
  lastGroundedAt: number,
  now: number,
  window: number,
): boolean {
  const age = now - lastGroundedAt;
  return age >= 0 && age <= window;
}
