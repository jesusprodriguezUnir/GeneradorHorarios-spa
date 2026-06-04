import { TestBed } from '@angular/core/testing';
import { GenerationHubService } from './generation-hub.service';
import { provideZonelessChangeDetection } from '@angular/core';

describe('GenerationHubService', () => {
  let service: GenerationHubService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GenerationHubService,
        provideZonelessChangeDetection(),
      ],
    });
    service = TestBed.inject(GenerationHubService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.state()).toBe('disconnected');
    expect(service.progress()).toBeNull();
  });
});
