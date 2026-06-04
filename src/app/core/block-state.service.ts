import { Injectable, signal } from '@angular/core';
import { BlockId } from './blocks.model';

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
}
