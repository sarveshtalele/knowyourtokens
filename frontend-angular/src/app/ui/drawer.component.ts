import { Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Port of components/ui/Drawer.tsx: renders nothing when closed (the host is display:contents and hidden then). */
@Component({
  selector: 'tt-drawer',
  standalone: true,
  imports: [IconComponent],
  host: { style: 'display: contents', '[attr.hidden]': "open() ? null : ''" },
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/40" (click)="closed.emit()"></div>
        <aside class="absolute right-0 top-0 h-full w-full max-w-[620px] bg-surface shadow-[-16px_0_50px_rgba(15,23,42,.16)] overflow-y-auto">
          <div class="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface z-10">
            <strong class="text-sm">{{ title() }}</strong>
            <button (click)="closed.emit()" class="w-8 h-8 grid place-items-center rounded-md hover:bg-surface-muted text-ink-soft"><svg ttIcon="close"></svg></button>
          </div>
          <div class="p-5"><ng-content /></div>
        </aside>
      </div>
    }
  `,
})
export class DrawerComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly closed = output<void>();
}
