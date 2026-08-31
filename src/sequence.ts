// sequence.ts
export class SequenceMatcher {
  private progress = 0;
  private lastStepAt = 0;

  constructor(
    private readonly steps: readonly string[],
    private readonly stepWindow: number, // adımlar arası izin verilen max gecikme (ms)
  ) {}

  /**
   * Bir token besle. `now` zaman damgasıyla. Dizi tamamlandıysa true döner ve
   * ilerleme sıfırlanır (aynı hareket peş peşe basılabilsin).
   */
  feed(token: string, now: number): boolean {
    // Araya çok gecikme girdiyse ilerlemeyi sil: hareket "koptu".
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

    // Beklenen gelmedi. Token dizinin başıysa yeni bir denemeye başla,
    // değilse baştan sıfırla.
    if (token === this.steps[0]) {
      this.progress = 1;
      this.lastStepAt = now;
    } else {
      this.progress = 0;
    }
    return false;
  }

  /** Overlay için: dizinin kaçıncı adımındayız. */
  get step(): number {
    return this.progress;
  }
}
