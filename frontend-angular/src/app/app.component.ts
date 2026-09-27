import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Port of App.tsx: BrowserRouter + Routes; the route table is in app.routes.ts. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
