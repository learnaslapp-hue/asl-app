import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlphabetPage } from './alphabet.page';

describe('AlphabetPage', () => {
  let component: AlphabetPage;
  let fixture: ComponentFixture<AlphabetPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AlphabetPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
