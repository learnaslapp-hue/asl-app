// src/app/directives/autoplay-mute.directive.ts
import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: 'video[autoplayMute]', // use as an attribute on <video>
  standalone: true,
})
export class AutoplayMuteDirective implements AfterViewInit {
  @Input() autoplayMute = true;

  constructor(private el: ElementRef<HTMLVideoElement>) {}

  ngAfterViewInit(): void {
    const v = this.el.nativeElement;
    if (!this.autoplayMute) return;

    // set properties (not just attributes)
    v.muted = true;
    v.defaultMuted = true;
    v.volume = 0;
    v.setAttribute('muted', '');       // keep attribute too (some UAs check both)
    v.setAttribute('playsinline', ''); // iOS
    v.setAttribute('preload', 'auto');

    const tryPlay = () => v.play().catch(() => {/* ignore */});

    if (v.readyState >= 1) {
      tryPlay();
    } else {
      v.addEventListener('loadedmetadata', tryPlay, { once: true });
    }
  }
}
