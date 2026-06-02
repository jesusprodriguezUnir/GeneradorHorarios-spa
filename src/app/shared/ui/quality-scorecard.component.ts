import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GpRingComponent } from './gp-ring.component';
import { LecIconComponent } from './lec-icon.component';
import { GenCandidate, GEN_CANDIDATES, GEN_METRIC_LABELS, genMetricTone } from '../../core/generation.model';

/**
 * Cuadro de calidad del horario — se muestra en la cabecera del Resultado.
 * Nota global (anillo), 6 métricas con semáforo y estado de reglas/preferencias.
 */
@Component({
  selector: 'app-quality-scorecard',
  standalone: true,
  imports: [CommonModule, GpRingComponent, LecIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-card scorecard" style="padding:0;overflow:hidden;margin-top:16px">
      <div style="display:flex;flex-wrap:wrap">
        <div class="scorecard-head">
          <gp-ring [value]="score()" [size]="64" [tone]="tone().c"></gp-ring>
          <div>
            <div class="overline">Calidad del horario</div>
            <div style="font-size:var(--text-xl);font-weight:800;letter-spacing:-0.01em">{{ sol().name || 'Solución elegida' }}</div>
            <span class="lec-badge" [style.background]="tone().t" [style.color]="tone().c" style="margin-top:4px">
              <lec-icon name="award" [size]="12" [stroke]="2.25"></lec-icon> {{ tone().l }}
            </span>
          </div>
        </div>
        <div class="scorecard-metrics">
          @for (m of metrics(); track m.key) {
            <div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                <span style="color:var(--muted-foreground)">{{ m.label }}</span>
                <span style="font-weight:700" [style.color]="m.tone.c">{{ m.value }}</span>
              </div>
              <div style="background:var(--muted);border-radius:99px;height:6px;overflow:hidden">
                <div style="height:100%;border-radius:99px" [style.width.%]="m.value" [style.background]="m.tone.c"></div>
              </div>
            </div>
          }
        </div>
      </div>
      <div class="scorecard-foot">
        <span style="display:flex;align-items:center;gap:6px;color:var(--success);font-weight:600">
          <lec-icon name="lock" [size]="14"></lec-icon> Reglas obligatorias: todas cumplidas
        </span>
        <span style="display:flex;align-items:center;gap:6px;color:var(--foreground);font-weight:600">
          <lec-icon name="star" [size]="14" style="color:var(--accent-foreground)"></lec-icon> Preferencias: {{ sol().str['prefs'] }}% satisfechas
        </span>
        @if (state === 'conflicts') {
          <span style="display:flex;align-items:center;gap:6px;color:oklch(0.45 0.11 65);font-weight:600">
            <lec-icon name="alert" [size]="14"></lec-icon> {{ conflicts }} ajustes manuales sugeridos
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .scorecard-head {
      flex: 0 0 auto; padding: 18px 22px; display: flex; align-items: center; gap: 16px;
      border-right: 1px solid var(--border); min-width: 220px;
    }
    .scorecard-metrics {
      flex: 1 1 360px; padding: 16px 22px;
      display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;
    }
    .scorecard-foot {
      display: flex; align-items: center; gap: 16px; padding: 11px 22px;
      border-top: 1px solid var(--border); background: var(--surface-2);
      flex-wrap: wrap; font-size: var(--text-xs);
    }
    .overline {
      font-size: 10px; font-weight: 700; color: var(--muted-foreground);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    @media (max-width: 760px) { .scorecard-head { border-right: none; } }
  `],
})
export class QualityScorecardComponent {
  private readonly _sol = signal<GenCandidate>(GEN_CANDIDATES[0]);
  @Input() set solution(v: GenCandidate | null | undefined) {
    if (v) this._sol.set(v);
  }
  @Input() state: 'clean' | 'conflicts' = 'clean';
  @Input() conflicts = 0;

  protected readonly sol = this._sol;
  protected readonly score = computed(() => this.sol().score ?? 89);
  protected readonly tone = computed(() => genMetricTone(this.score()));
  protected readonly metrics = computed(() =>
    Object.keys(GEN_METRIC_LABELS).map(key => {
      const value = this.sol().str[key];
      return { key, label: GEN_METRIC_LABELS[key], value, tone: genMetricTone(value) };
    })
  );
}
