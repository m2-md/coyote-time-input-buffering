// command-queue.ts
export interface Command<Ctx> {
  action: string;
  at: number; // timestamp when queued (ms)
  ready: (ctx: Ctx) => boolean; // condition when executable
}

export class CommandQueue<Ctx> {
  private items: Command<Ctx>[] = [];

  enqueue(cmd: Command<Ctx>): void {
    this.items.push(cmd);
  }

  /**
   * Dispatch commands whose condition is met in order; silently drop expired ones past `ttl`.
   * Return: actions fired this frame. No side effects: the queue only updates its
   * internal list; caller executes the action (e.g. sends to FSM).
   */
  flush(now: number, ttl: number, ctx: Ctx): string[] {
    const fired: string[] = [];
    const keep: Command<Ctx>[] = [];
    for (const cmd of this.items) {
      if (now - cmd.at > ttl) continue; // expired: drop
      if (cmd.ready(ctx)) {
        fired.push(cmd.action); // condition met: fire
      } else {
        keep.push(cmd); // not ready yet: keep
      }
    }
    this.items = keep;
    return fired;
  }

  /** Pending commands for visualization. */
  get pending(): ReadonlyArray<Readonly<Command<Ctx>>> {
    return this.items;
  }
}
