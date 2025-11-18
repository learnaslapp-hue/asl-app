import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizGamePage } from './quiz-game.page';

describe('QuizGamePage', () => {
  let component: QuizGamePage;
  let fixture: ComponentFixture<QuizGamePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(QuizGamePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
