import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SUBJECT_COLORS } from '../../core/models';

const ALL_SUBJECTS: { key: string; name: string }[] = [
  { key: 'mat', name: 'Mat.' },
  { key: 'len', name: 'Lengua' },
  { key: 'ing', name: 'Inglés' },
  { key: 'cie', name: 'Naturales' },
  { key: 'soc', name: 'Sociales' },
  { key: 'ef',  name: 'E. Física' },
  { key: 'art', name: 'Plástica' },
  { key: 'mus', name: 'Música' },
  { key: 'rel', name: 'Religión' },
  { key: 'tut', name: 'Tutoría' },
];

/**
 * SubjectLegend — leyenda de código de color por asignatura.
 *
 * - `subjectKeys`: si se proporciona, muestra solo esas asignaturas;
 *                  si no, muestra todas.
 * - `label`:       etiqueta opcional a la izquierda (p. ej. «Leyenda:»).
 */
@Component({
  selector: 'app-subject-legend',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      @if (label()) {
        <span style="font-size:var(--text-xs);font-weight:700;color:var(--muted-foreground);
          text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap">{{ label() }}</span>
      }
      @for (s of visibleSubjects(); track s.key) {
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:12px;height:12px;border-radius:3px;flex-shrink:0"
            [style.background]="bg(s.key)"
            [style.border]="'1.5px solid ' + fg(s.key)"></span>
          <span style="font-size:var(--text-xs);color:var(--muted-foreground);font-weight:500;white-space:nowrap">{{ s.name }}</span>
        </div>
      }
    </div>
  `,
})
export class SubjectLegendComponent {
  /** Subset de claves a mostrar. Si vacío/undefined → todas. */
  readonly subjectKeys = input<string[]>([]);
  /** Etiqueta previa al listado. */
  readonly label = input<string>('Leyenda:');

  protected readonly visibleSubjects = computed(() => {
    const keys = this.subjectKeys();
    if (!keys || keys.length === 0) return ALL_SUBJECTS;
    return ALL_SUBJECTS.filter(s => keys.includes(s.key));
  });

  protected bg(key: string): string {
    return SUBJECT_COLORS[key]?.bg ?? SUBJECT_COLORS['tut'].bg;
  }
  protected fg(key: string): string {
    return SUBJECT_COLORS[key]?.fg ?? SUBJECT_COLORS['tut'].fg;
  }
}
