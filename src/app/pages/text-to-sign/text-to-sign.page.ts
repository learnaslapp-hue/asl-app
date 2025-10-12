import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonFab, IonFabButton, IonFabList, IonFooter, IonHeader, IonIcon, IonInput,
  IonModal, IonTextarea, IonTitle, IonToolbar, createGesture
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { ScrollService } from 'src/app/services/scroll.service';
import { arrowBack } from 'ionicons/icons';
import { addIcons } from 'ionicons';

type Slide = { ch: string; src: string };

@Component({
  selector: 'app-text-to-sign',
  templateUrl: './text-to-sign.page.html',
  styleUrls: ['./text-to-sign.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    IonContent, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonHeader, IonBackButton,
    IonFab, IonFabList, IonFabButton, IonFooter, IonCard, IonCardHeader, IonCardContent, IonCardTitle,
    IonInput, IonTextarea, IonModal
  ],
})
export class TextToSignPage implements OnInit {
  showShadow = false;
  inputTranslate = new FormControl<string>('', { nonNullable: true });

  @ViewChild(IonContent, { static: true }) content!: IonContent;
  @ViewChild('translateResultModal') translateResultModal!: IonModal;
  @ViewChild('carousel', { read: ElementRef }) carouselEl!: ElementRef<HTMLDivElement>;
  @ViewChild('track',   { read: ElementRef }) trackEl!: ElementRef<HTMLDivElement>;
  @ViewChild('pager',   { read: ElementRef }) pagerEl!: ElementRef<HTMLDivElement>;

  slides: Slide[] = [];
  active = 0;

  // transform state
  translateX = 0;   // committed offset
  deltaX = 0;       // live drag offset
  cardW = 0;        // used for threshold
  gap = 16;         // keep aligned with CSS --card-gap
  gesture?: ReturnType<typeof createGesture>;

  constructor(public scrollService: ScrollService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    addIcons({ arrowBack });
    this.scrollService.scrollTop$.subscribe(v => (this.showShadow = v > 0));
  }

  private buildSlides(text: string) {
    const arr: Slide[] = [];
    const cleaned = (text || '').toUpperCase();
    for (const ch of cleaned) {
      if (/[A-Z]/.test(ch)) {
        arr.push({ ch, src: `assets/asl/${ch}.png` }); // ensure assets exist
      }
      // If you want a SPACE card, handle it here.
    }
    this.slides = arr;
    this.active = 0;
    this.translateX = 0;
    this.deltaX = 0;
  }

  async onShowResult() {
    this.buildSlides(this.inputTranslate.value || '');
    await this.translateResultModal.present();
    setTimeout(() => this.initCarousel(), 0);
  }

  @HostListener('window:resize')
  onResize() {
    // Snap accurately if breakpoints changed
    setTimeout(() => this.snapToActiveByMeasure(), 0);
  }

  private initCarousel() {
    if (!this.trackEl?.nativeElement) return;

    // measure for threshold
    const firstCard = this.trackEl.nativeElement.querySelector<HTMLElement>('.slide-card');
    const rect = firstCard?.getBoundingClientRect();
    this.cardW = rect ? rect.width : this.carouselEl.nativeElement.clientWidth * 0.76;

    // precise snap for the first card
    this.commitToActive(0);

    // (Re)create gesture
    this.gesture?.destroy();
    this.gesture = createGesture({
      el: this.carouselEl.nativeElement,
      gestureName: 'sign-swipe',
      threshold: 0,
      onStart: () => { this.deltaX = 0; },
      onMove: ev => { this.deltaX = ev.deltaX; this.updateTransform(); },
      onEnd: ev => {
        const velocity = ev.velocityX;
        const moved = ev.deltaX;
        const threshold = this.cardW * 0.25;
        if (moved < -threshold || velocity < -0.35) this.goTo(this.active + 1);
        else if (moved > threshold || velocity > 0.35) this.goTo(this.active - 1);
        else this.goTo(this.active);
      }
    });
    this.gesture.enable(true);
  }

  private updateTransform() {
    const x = this.translateX + this.deltaX;
    this.trackEl?.nativeElement.style.setProperty('transform', `translate3d(${x}px,0,0)`);
  }

  private commitToActive(idx: number) {
    const clamped = Math.max(0, Math.min(idx, this.slides.length - 1));
    this.active = clamped;
    this.snapToActiveByMeasure();
  }

  /** Precisely align the target card’s left edge with the carousel’s left edge */
  private snapToActiveByMeasure() {
    if (!this.trackEl?.nativeElement || !this.carouselEl?.nativeElement) return;
    const cards = this.trackEl.nativeElement.querySelectorAll<HTMLElement>('.slide-card');
    if (!cards.length) return;

    const target = cards[this.active];
    const carRect = this.carouselEl.nativeElement.getBoundingClientRect();
    const tgtRect = target.getBoundingClientRect();

    // keep threshold accurate to current layout
    this.cardW = tgtRect.width;

    // delta: how far target is from the left edge of the carousel
    const delta = tgtRect.left - carRect.left;

    // adjust committed translate so target aligns flush-left
    this.translateX -= delta;
    this.deltaX = 0;

    const el = this.trackEl.nativeElement;
    el.style.transition = 'transform 220ms ease';
    el.style.transform = `translate3d(${this.translateX}px,0,0)`;
    setTimeout(() => { el.style.transition = 'none'; }, 240);

    // center the active chip in pager
    setTimeout(() => {
      const pager = this.pagerEl?.nativeElement;
      if (!pager) return;
      const activeChip = pager.querySelector<HTMLButtonElement>('.chip.on');
      activeChip?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, 0);

    this.cdr.detectChanges();
  }

  goTo(idx: number) { this.commitToActive(idx); }
  onKeyLeft()  { this.goTo(this.active - 1); }
  onKeyRight() { this.goTo(this.active + 1); }
}
