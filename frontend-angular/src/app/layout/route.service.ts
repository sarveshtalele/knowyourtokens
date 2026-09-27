import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** The current location's pathname, like react-router's useLocation().pathname. */
@Injectable({ providedIn: 'root' })
export class RouteService {
  private readonly router = inject(Router);
  readonly pathname = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => window.location.pathname),
    ),
    { initialValue: window.location.pathname },
  );
}
