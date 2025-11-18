import { TestBed } from '@angular/core/testing';

import { VideoCacheService } from './video-cache.service';

describe('VideoCacheService', () => {
  let service: VideoCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VideoCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
