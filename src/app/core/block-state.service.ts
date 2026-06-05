import { Injectable, signal } from '@angular/core';
import { BlockId, EtapaBlockId } from './blocks.model';

@Injectable({ providedIn: 'root' })
export class BlockStateService {
  private readonly _activeBlock = signal<BlockId>(
    (localStorage.getItem('lectivo-block') as BlockId) ?? 'all',
  );
  readonly activeBlock = this._activeBlock.asReadonly();

  setActiveBlock(id: BlockId): void {
    localStorage.setItem('lectivo-block', id);
    this._activeBlock.set(id);
  }

  initializeForUser(role: string, assignedStageTypes?: string[]): void {
    if (role === 'school_admin') {
      this.setActiveBlock('all');
    } else if (role === 'teacher') {
      const allowedBlocks = (assignedStageTypes ?? [])
        .map(t => {
          if (t === 'infantil') return 'inf' as EtapaBlockId;
          if (t === 'primaria') return 'pri' as EtapaBlockId;
          if (t === 'secundaria') return 'sec' as EtapaBlockId;
          return null;
        })
        .filter((b): b is EtapaBlockId => b !== null);

      if (allowedBlocks.length > 0) {
        const current = localStorage.getItem('lectivo-block') as BlockId;
        if (current !== 'all' && allowedBlocks.includes(current)) {
          this._activeBlock.set(current);
        } else {
          this.setActiveBlock(allowedBlocks[0]);
        }
      } else {
        this.setActiveBlock('all');
      }
    }
  }
}
