import { TestBed } from '@angular/core/testing';

import { QuizStatusService } from './quiz-status.service';

describe('QuizStatusService', () => {
  let service: QuizStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuizStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
