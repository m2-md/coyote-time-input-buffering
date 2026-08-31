// command-queue.ts
export interface Command<Ctx> {
  action: string;
  at: number; // kuyruğa girdiği an (ms)
  ready: (ctx: Ctx) => boolean; // ne zaman yapılabilir?
}

export class CommandQueue<Ctx> {
  private items: Command<Ctx>[] = [];

  enqueue(cmd: Command<Ctx>): void {
    this.items.push(cmd);
  }

  /**
   * Koşulu sağlanan komutları sırayla dışarı ver; `ttl`'i aşanları sessizce düş.
   * Dönüş: bu karede ateşlenen aksiyonlar. Yan etki yok: kuyruk sadece kendi
   * listesini günceller, eylemi çağıran taraf uygular (ör. FSM'e send).
   */
  flush(now: number, ttl: number, ctx: Ctx): string[] {
    const fired: string[] = [];
    const keep: Command<Ctx>[] = [];
    for (const cmd of this.items) {
      if (now - cmd.at > ttl) continue; // süre aşımı: düş
      if (cmd.ready(ctx)) {
        fired.push(cmd.action); // koşul sağlandı: ateşle
      } else {
        keep.push(cmd); // henüz olmadı: beklet
      }
    }
    this.items = keep;
    return fired;
  }

  /** Görselleştirme için bekleyen komutlar. */
  get pending(): ReadonlyArray<Readonly<Command<Ctx>>> {
    return this.items;
  }
}
