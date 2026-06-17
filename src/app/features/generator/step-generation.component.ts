import {
  Component, ChangeDetectionStrategy, input, model, output, signal, computed, OnDestroy,
} from '@angular/core';
import { LecIconComponent } from '../../shared/ui/lec-icon.component';
import { GpStarsComponent } from '../../shared/ui/gp-stars.component';
import {
  GenCandidate, GEN_OBJECTIVES, GEN_WEIGHTS, GEN_PRESETS, GEN_CANDIDATES,
  GEN_METRIC_LABELS, ObjectiveWeights, genScore, genMetricTone,
} from '../../core/generation.model';

type Phase = 'setup' | 'running' | 'compare';

/**
 * Paso 4 — Objetivos de optimización con pesos, motor en vivo (animado) y
 * comparación de 3 soluciones candidatas puntuadas. El motor real (.NET) se
 * lanza en paralelo desde el orquestador al emitir `launch`.
 */
@Component({
  selector: 'app-step-generation',
  standalone: true,
  imports: [LecIconComponent, GpStarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (phase()) {
      @case ('running') {
        <!-- Motor en vivo -->
        <div class="lec-card" style="padding:0;overflow:hidden;border-color:var(--madrid)" data-testid="live-engine">
          <div class="engine-head">
            <gp-stars [light]="true"></gp-stars>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
              <span class="engine-badge"><lec-icon name="cpu" [size]="24" style="animation:lec-pulse-dot 1.1s ease-in-out infinite"></lec-icon></span>
              <div style="flex:1;min-width:160px">
                <div style="font-weight:800;font-size:var(--text-lg);letter-spacing:-0.01em">Resolviendo el horario…</div>
                <div style="font-size:var(--text-xs);opacity:0.85">{{ phaseLabel() }}…</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:var(--text-3xl);font-weight:800;letter-spacing:-0.02em;line-height:1">{{ scoreLive() }}</div>
                <div style="font-size:10px;opacity:0.85;font-weight:600">puntuación</div>
              </div>
            </div>
            <div class="engine-bar"><div class="engine-bar-fill" [style.width.%]="prog()"></div></div>
          </div>
          <div class="engine-body">
            <div style="flex:0 0 auto">
              <div class="overline" style="margin-bottom:8px">Encaje en vivo</div>
              <div class="mini-grid">
                @for (i of cells; track i) {
                  <div class="mini-cell" [class.mini-cell--on]="filledSet().has(i)"
                    [style.background]="filledSet().has(i) ? 'var(--subj-' + cellColor[i] + ')' : 'var(--secondary)'"
                    [style.box-shadow]="filledSet().has(i) ? 'inset 0 0 0 1.5px var(--subj-' + cellColor[i] + '-fg)' : 'none'"></div>
                }
              </div>
            </div>
            <div class="counters">
              <div class="counter"><div class="counter-label"><lec-icon name="activity" [size]="12"></lec-icon> Iteraciones</div><div class="counter-val">{{ iters() }}</div></div>
              <div class="counter"><div class="counter-label"><lec-icon name="lock" [size]="12"></lec-icon> Reglas satisfechas</div><div class="counter-val">{{ satisfied() }}/{{ constraintsCount() }}</div></div>
              <div class="counter"><div class="counter-label"><lec-icon name="gitCompare" [size]="12"></lec-icon> Candidatas exploradas</div><div class="counter-val">{{ explored() }}</div></div>
              <div class="counter"><div class="counter-label"><lec-icon name="target" [size]="12"></lec-icon> Conflictos</div><div class="counter-val" [style.color]="prog() > 70 ? 'oklch(0.45 0.11 65)' : 'var(--foreground)'">{{ prog() > 70 ? '2' : '—' }}</div></div>
            </div>
          </div>
        </div>
      }

      @case ('compare') {
        <!-- Comparación de candidatas -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <span class="ok-badge"><lec-icon name="checkCircle" [size]="20"></lec-icon></span>
          <div style="flex:1;min-width:200px">
            <div style="font-weight:800;font-size:var(--text-lg);letter-spacing:-0.01em">3 soluciones generadas</div>
            <div style="font-size:var(--text-sm);color:var(--muted-foreground)">Compara y elige la que mejor encaje con tu centro.</div>
          </div>
          <button class="btn-ghost" (click)="rerun()"><lec-icon name="refresh" [size]="16"></lec-icon> Volver a generar</button>
        </div>
        <div class="candidates">
          @for (c of candidates(); track c.id) {
            <div class="lec-card cand" [class.cand--rec]="c.recommended" style="padding:0;overflow:hidden" data-testid="candidate-card">
              <div class="cand-head">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
                  <span style="font-size:10px;font-weight:800;color:var(--muted-foreground);letter-spacing:0.08em">OPCIÓN {{ c.id }}</span>
                  @if (c.recommended) {
                    <span class="lec-badge" style="background:var(--success-tint);color:var(--success)"><lec-icon name="award" [size]="12"></lec-icon> Recomendada</span>
                  }
                </div>
                <div style="display:flex;align-items:flex-end;gap:10px">
                  <div style="font-size:2.6rem;font-weight:800;line-height:0.9;letter-spacing:-0.03em" [style.color]="c.recommended ? 'var(--success)' : 'var(--foreground)'">{{ c.score }}</div>
                  <div style="font-size:11px;color:var(--muted-foreground);padding-bottom:4px">/100<br>puntuación</div>
                </div>
                <div style="font-weight:700;font-size:var(--text-sm);margin-top:10px">{{ c.name }}</div>
                <div style="font-size:var(--text-xs);color:var(--muted-foreground)">{{ c.tag }}</div>
              </div>
              <div class="cand-metrics">
                @for (m of topMetrics(c); track m.id) {
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                      <span style="color:var(--muted-foreground)">{{ m.label }}</span>
                      <span style="font-weight:700" [style.color]="m.tone.c">{{ m.v }}</span>
                    </div>
                    <div style="background:var(--muted);border-radius:99px;height:5px;overflow:hidden">
                      <div style="height:100%;border-radius:99px" [style.width.%]="m.v" [style.background]="m.tone.c"></div>
                    </div>
                  </div>
                }
              </div>
              <div style="padding:0 16px 16px">
                <button class="cand-btn" [class.cand-btn--rec]="c.recommended" (click)="choose.emit(c)" data-testid="choose-candidate">
                  Elegir y revisar <lec-icon name="arrowRight" [size]="17"></lec-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }

      @default {
        <!-- Objetivos + lanzamiento -->
        <div style="display:grid;gap:18px">
          <div class="lec-card" style="padding:18px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
              <span class="obj-icon"><lec-icon name="sliders" [size]="18"></lec-icon></span>
              <div>
                <div style="font-weight:800;font-size:var(--text-base)">Objetivos de optimización</div>
                <div style="font-size:var(--text-xs);color:var(--muted-foreground)">Indica qué debe priorizar el motor. Reordena el resultado.</div>
              </div>
            </div>
            <div class="presets">
              @for (p of presets; track p.k) {
                <button class="preset" [class.preset--on]="activePreset() === p.k" (click)="applyPreset(p.k)">
                  <lec-icon [name]="p.ic" [size]="14"></lec-icon> {{ p.l }}
                </button>
              }
              <span style="align-self:center;font-size:11px;color:var(--muted-foreground)">{{ activePreset() ? 'Plantilla aplicada' : 'Ajuste personalizado' }}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
              @for (o of objectivesList; track o.id) {
                <div class="obj-row">
                  <span class="obj-row-icon"><lec-icon [name]="o.icon" [size]="16"></lec-icon></span>
                  <div style="flex:1;min-width:180px">
                    <div style="font-weight:600;font-size:var(--text-sm)">{{ o.label }}</div>
                    <div style="font-size:11px;color:var(--muted-foreground)">{{ o.desc }}</div>
                  </div>
                  <div class="weights">
                    @for (w of weights; track $index) {
                      <button class="weight" [class.weight--on]="objectives()[o.id] === $index"
                        [style.color]="weightColor(o.id, $index)" (click)="setWeight(o.id, $index)">{{ w }}</button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="lec-card launch" style="border-color:var(--madrid)">
            <gp-stars></gp-stars>
            <div class="launch-icon"><lec-icon name="cpu" [size]="34"></lec-icon></div>
            <h2 style="font-size:var(--text-xl);font-weight:800;letter-spacing:-0.02em">Motor listo para resolver</h2>
            <p style="color:var(--muted-foreground);max-width:460px;margin:8px auto 0;line-height:1.5;font-size:var(--text-sm)">
              Cruzaré disponibilidad, carga docente, aulas y reglas para encajar el horario y te ofreceré
              <b style="color:var(--foreground)">varias soluciones</b> entre las que elegir.
            </p>
            <div class="launch-stats">
              <div><div class="ls-n">{{ groupsCount() }}</div><div class="ls-l"><lec-icon name="bookOpen" [size]="12"></lec-icon> grupos</div></div>
              <div><div class="ls-n">{{ teachersCount() }}</div><div class="ls-l"><lec-icon name="users" [size]="12"></lec-icon> docentes</div></div>
              <div><div class="ls-n">{{ completionPct() }}%</div><div class="ls-l"><lec-icon name="layers" [size]="12"></lec-icon> asignado</div></div>
              <div><div class="ls-n">{{ constraintsCount() }}</div><div class="ls-l"><lec-icon name="ban" [size]="12"></lec-icon> reglas</div></div>
            </div>
            <button class="launch-btn" (click)="run()" data-testid="generate-button"><lec-icon name="zap" [size]="20"></lec-icon> Generar horarios</button>
            <p style="font-size:11px;color:var(--muted-foreground);margin-top:13px">{{ hardCount() }} reglas obligatorias se garantizan · podrás revisar y editar el resultado.</p>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .overline { font-size: 10px; font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em; }

    /* objetivos */
    .obj-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--primary-tint); color: var(--primary-strong); display: flex; align-items: center; justify-content: center; }
    .presets { display: flex; gap: 7px; flex-wrap: wrap; margin: 14px 0 18px; }
    .preset { display: flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: var(--radius-full); font-weight: 700; font-size: var(--text-xs); background: var(--surface-2); color: var(--foreground); border: 1px solid var(--border); transition: all .15s; }
    .preset--on { background: var(--primary); color: #fff; border-color: var(--primary); }
    .obj-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .obj-row-icon { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; background: var(--secondary); color: var(--primary); display: flex; align-items: center; justify-content: center; }
    .weights { display: flex; gap: 4px; background: var(--secondary); border-radius: var(--radius-md); padding: 3px; }
    .weight { padding: 6px 11px; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); transition: all .12s; }
    .weight--on { background: var(--card); box-shadow: var(--shadow-xs); }

    /* launch */
    .launch { text-align: center; padding: 34px 24px; position: relative; overflow: hidden; }
    .launch-icon { width: 72px; height: 72px; border-radius: 50%; background: var(--madrid-tint); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--madrid); }
    .launch-stats { display: flex; gap: 22px; justify-content: center; margin: 20px 0; flex-wrap: wrap; }
    .ls-n { font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.02em; }
    .ls-l { font-size: 11px; color: var(--muted-foreground); display: flex; align-items: center; gap: 4px; justify-content: center; }
    .launch-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-width: 260px; min-height: 52px; padding: 14px 22px; font-size: var(--text-base); font-weight: 700; border-radius: var(--radius-md); background: var(--madrid); color: #fff; box-shadow: 0 8px 24px var(--madrid-tint-2); transition: filter .15s, transform .05s; }
    .launch-btn:hover { filter: brightness(0.97); }
    .launch-btn:active { transform: translateY(1px); }

    /* engine */
    .engine-head { padding: 22px 24px; background: linear-gradient(135deg, var(--madrid) 0%, var(--madrid-strong) 100%); color: #fff; position: relative; overflow: hidden; }
    .engine-badge { width: 46px; height: 46px; border-radius: 12px; background: rgba(255,255,255,0.16); display: flex; align-items: center; justify-content: center; }
    .engine-bar { margin-top: 16px; background: rgba(255,255,255,0.2); border-radius: 99px; height: 8px; overflow: hidden; }
    .engine-bar-fill { height: 100%; border-radius: 99px; background: #fff; transition: width .12s linear; }
    .engine-body { display: flex; gap: 22px; padding: 22px; flex-wrap: wrap; }
    .mini-grid { display: grid; grid-template-columns: repeat(5, 26px); grid-auto-rows: 26px; gap: 4px; }
    .mini-cell { border-radius: 5px; transition: all .25s; transform: scale(0.85); opacity: 0.5; }
    .mini-cell--on { transform: scale(1); opacity: 1; }
    .counters { flex: 1 1 220px; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap: 12px; align-content: start; }
    .counter { background: var(--surface-2); border-radius: var(--radius-md); padding: 11px 13px; }
    .counter-label { display: flex; align-items: center; gap: 6px; color: var(--muted-foreground); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .counter-val { font-size: var(--text-xl); font-weight: 800; margin-top: 4px; letter-spacing: -0.01em; }

    /* compare */
    .ok-badge { width: 38px; height: 38px; border-radius: 10px; background: var(--success-tint); color: var(--success); display: flex; align-items: center; justify-content: center; }
    .candidates { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    @media (max-width: 760px) { .candidates { grid-template-columns: 1fr; } }
    .cand--rec { border-color: var(--success); box-shadow: 0 8px 26px oklch(0.58 0.13 155 / 0.18); }
    .cand-head { padding: 16px 16px 14px; border-bottom: 1px solid var(--border); }
    .cand-metrics { padding: 14px 16px; display: flex; flex-direction: column; gap: 9px; }
    .cand-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm); background: var(--card); color: var(--foreground); box-shadow: inset 0 0 0 1px var(--border-strong); }
    .cand-btn--rec { background: var(--primary); color: #fff; box-shadow: none; }
    .btn-ghost { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: transparent; color: var(--foreground); border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm); }
  `],
})
export class StepGenerationComponent implements OnDestroy {
  readonly objectives = model<ObjectiveWeights>({ ...GEN_PRESETS['equilibrado'] });
  readonly constraintsCount = input(0);
  readonly hardCount = input(0);
  readonly groupsCount = input(0);
  readonly teachersCount = input(0);
  readonly completionPct = input(0);

  readonly launch = output<void>();
  readonly choose = output<GenCandidate>();

  protected readonly objectivesList = GEN_OBJECTIVES;
  protected readonly weights = GEN_WEIGHTS;
  protected readonly presets = [
    { k: 'equilibrado', l: 'Equilibrado', ic: 'scale' },
    { k: 'profesorado', l: 'Profesorado', ic: 'users' },
    { k: 'pedagogico', l: 'Pedagógico', ic: 'graduation' },
  ];
  protected readonly cells = Array.from({ length: 25 }, (_, i) => i);
  protected readonly cellColor: string[];

  protected readonly phase = signal<Phase>('setup');
  protected readonly candidates = signal<GenCandidate[]>([]);
  protected readonly prog = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  private readonly fillOrder: number[];

  constructor() {
    const subjKeys = ['mat', 'len', 'cie', 'soc', 'ing', 'ef', 'art', 'mus', 'rel', 'tut'];
    this.cellColor = Array.from({ length: 25 }, (_, i) => subjKeys[(i * 7 + 3) % subjKeys.length]);
    const arr = Array.from({ length: 25 }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) { const j = (i * 13 + 5) % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    this.fillOrder = arr;
  }

  protected readonly activePreset = computed(() => {
    const obj = this.objectives();
    return Object.keys(GEN_PRESETS).find(k => GEN_OBJECTIVES.every(o => GEN_PRESETS[k][o.id] === obj[o.id])) ?? null;
  });

  protected applyPreset(k: string): void { this.objectives.set({ ...GEN_PRESETS[k] }); }
  protected setWeight(id: string, w: number): void { this.objectives.update(o => ({ ...o, [id]: w })); }
  protected weightColor(id: string, idx: number): string {
    if (this.objectives()[id] !== idx) return 'var(--muted-foreground)';
    return idx === 0 ? 'var(--muted-foreground)' : 'var(--primary-strong)';
  }

  protected topMetrics(c: GenCandidate) {
    return GEN_OBJECTIVES.slice(0, 4).map(o => ({ id: o.id, label: GEN_METRIC_LABELS[o.id], v: c.str[o.id], tone: genMetricTone(c.str[o.id]) }));
  }

  // ── live engine derived state ──
  protected readonly filledSet = computed(() => {
    const n = Math.round((this.prog() / 100) * 25);
    return new Set(this.fillOrder.slice(0, n));
  });
  protected readonly scoreLive = computed(() => Math.round(this.prog() * 0.94));
  protected readonly iters = computed(() => Math.round(this.prog() * 18.4).toLocaleString('es-ES'));
  protected readonly satisfied = computed(() => Math.round((this.prog() / 100) * this.constraintsCount()));
  protected readonly explored = computed(() => Math.min(18, Math.round((this.prog() / 100) * 18)));
  private readonly phases = ['Leyendo asignaciones y carga docente', 'Reservando aulas especiales', 'Colocando asignaturas troncales', 'Aplicando reglas obligatorias', 'Optimizando huecos y preferencias', 'Comparando soluciones candidatas'];
  protected readonly phaseLabel = computed(() => this.phases[Math.min(this.phases.length - 1, Math.floor((this.prog() / 100) * this.phases.length))]);

  protected run(): void {
    const obj = this.objectives();
    const cands = GEN_CANDIDATES.map(c => ({ ...c, score: genScore(c.str, obj) }));
    const best = Math.max(...cands.map(c => c.score!));
    cands.forEach(c => (c.recommended = c.score === best));
    this.candidates.set(cands);
    this.launch.emit();
    this.phase.set('running');
    this.prog.set(0);
    this.timer = setInterval(() => {
      const p = Math.min(100, this.prog() + (this.prog() > 80 ? 1.6 : 2.6));
      this.prog.set(p);
      if (p >= 100) {
        clearInterval(this.timer);
        setTimeout(() => this.phase.set('compare'), 650);
      }
    }, 70);
  }

  protected rerun(): void { this.phase.set('setup'); }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }
}
