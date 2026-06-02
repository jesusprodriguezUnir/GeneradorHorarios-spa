import { Injectable, signal } from '@angular/core';
import { GenCandidate } from './generation.model';

/**
 * Conserva la solución candidata elegida en el generador para que la pantalla
 * de Resultado pueda mostrar su Cuadro de calidad. (El backend aún no persiste
 * métricas de calidad; ver doc/horarios-escolares/docs/generador-pro-backend.md.)
 */
@Injectable({ providedIn: 'root' })
export class GenerationStateService {
  readonly chosenSolution = signal<GenCandidate | null>(null);

  setChosen(c: GenCandidate): void { this.chosenSolution.set(c); }
}
