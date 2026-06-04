import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('EmptyStateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('should render the message', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    
    // Configurar inputs usando ComponentRef
    fixture.componentRef.setInput('message', 'No data available');
    fixture.componentRef.setInput('icon', '📅');
    fixture.componentRef.setInput('hint', 'Try creating a new record');
    
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    
    expect(element.querySelector('.empty-state__msg')?.textContent).toContain('No data available');
    expect(element.querySelector('.empty-state__icon')?.textContent).toContain('📅');
    expect(element.querySelector('.empty-state__hint')?.textContent).toContain('Try creating a new record');
  });

  it('should not render icon or hint when not provided', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'No data available');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    
    expect(element.querySelector('.empty-state__msg')?.textContent).toContain('No data available');
    expect(element.querySelector('.empty-state__icon')).toBeNull();
    expect(element.querySelector('.empty-state__hint')).toBeNull();
  });
});
