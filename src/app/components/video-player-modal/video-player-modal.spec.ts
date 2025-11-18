import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoPlayerModal } from './video-player-modal';

describe('VideoPlayerModal', () => {
  let component: VideoPlayerModal;
  let fixture: ComponentFixture<VideoPlayerModal>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoPlayerModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
