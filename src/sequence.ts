// sequence.ts
export class SequenceMatcher {
  private progress = 0;
  private lastStepAt = 0;

  constructor(
    private readonly steps: readonly string[],
    private readonly stepWindow: number, // maximum allowed delay between steps (ms)
  ) {}

  /**
   * Feed a token with timestamp `now`. Returns true when sequence completes and
   * resets progress (allowing consecutive executions).
   */
  feed(token: string, now: number): boolean {
    // If delay between steps exceeded limit, reset progress: sequence broke.
    if (this.progress > 0 && now - this.lastStepAt > this.stepWindow) {
      this.progress = 0;
    }

    const expected = this.steps[this.progress];
    if (token === expected) {
      this.progress++;
      this.lastStepAt = now;
      if (this.progress === this.steps.length) {
        this.progress = 0;
        return true; // SPECIAL!
      }
      return false;
    }

    // Expected token did not arrive. If it matches first step, start a new attempt;
    // otherwise reset completely.
    if (token === this.steps[0]) {
      this.progress = 1;
      this.lastStepAt = now;
    } else {
      this.progress = 0;
    }
    return false;
  }

  /** Overlay helper: current step index in sequence. */
  get step(): number {
    return this.progress;
  }
}
