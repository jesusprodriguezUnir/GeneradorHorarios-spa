import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state" role="status">
      @if (icon()) {
        <div class="empty-state__icon" aria-hidden="true">{{ icon() }}</div>
      }
      <p class="empty-state__msg">{{ message() }}</p>
      @if (hint()) {
        <p class="empty-state__hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [`
    .empty-state { text-align: center; padding: 48px 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .empty-state__icon { font-size: 2rem; opacity: 0.4; }
    .empty-state__msg { font-size: var(--text-sm); color: var(--muted-foreground); font-weight: 600; }
    .empty-state__hint { font-size: var(--text-xs); color: var(--muted-foreground); }
  `],
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
  readonly hint = input<string>('');
  readonly icon = input<string>('');
}
