import { effect, signal, untracked } from '@angular/core';

/**
 * Port of hooks/useApi.ts: fetch on creation and whenever `deps` change (or reload()); a refetch keeps the previous
 * data on screen, like the source's `setState(s => ({ ...s, loading: true }))`. Create it in an injection context.
 */
export class ApiResource<T> {
  readonly data = signal<T | undefined>(undefined);
  readonly loading = signal(true);
  readonly error = signal<Error | null>(null);
  private readonly tick = signal(0);

  constructor(fetcher: () => Promise<{ data: T }>, deps: () => unknown[] = () => []) {
    effect(
      (onCleanup) => {
        deps();
        this.tick();
        let cancelled = false;
        onCleanup(() => (cancelled = true));
        untracked(() => {
          this.loading.set(true);
          this.error.set(null);
          fetcher()
            .then((res) => {
              if (cancelled) return;
              this.data.set(res.data);
              this.loading.set(false);
              this.error.set(null);
            })
            .catch((err) => {
              if (cancelled) return;
              this.data.set(undefined);
              this.loading.set(false);
              this.error.set(err instanceof Error ? err : new Error(String(err)));
            });
        });
      },
      { allowSignalWrites: true },
    );
  }

  reload = () => this.tick.update((t) => t + 1);
}
