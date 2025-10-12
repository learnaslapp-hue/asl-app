import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextToSignPage } from './text-to-sign.page';

describe('TextToSignPage', () => {
  let component: TextToSignPage;
  let fixture: ComponentFixture<TextToSignPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TextToSignPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
