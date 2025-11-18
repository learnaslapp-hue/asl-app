import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, ModalController, IonSpinner,
  IonFooter
} from '@ionic/angular/standalone';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ScrollService } from 'src/app/services/scroll.service';
import { environment } from 'src/environments/environment';
import { StatusBarService } from 'src/app/services/status-bar.service';
import { Style } from '@capacitor/status-bar';
import { User } from 'src/app/pages/model/user';
import { VideoPlayerComponent } from '../video-player/video-player.component';
import { AuthService } from 'src/app/services/auth.service';
import { StorageService } from 'src/app/services/storage.service';
import { LessonCategory, LessonItem } from 'src/app/model/lessons';
import { lessonKey } from 'src/app/services/lessons.service';

@Component({
  selector: 'app-video-player-modal',
  templateUrl: './video-player-modal.html',
  styleUrls: ['./video-player-modal.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonButton, IonIcon, IonSpinner, IonFooter, VideoPlayerComponent]
})
export class VideoPlayerModal implements OnInit {
  currentProfile: User;
  category!: LessonCategory;
  item!: LessonItem;
  safeSrc!: SafeResourceUrl;
  @ViewChild('videoPlayer', { static: true }) videoPlayer!: VideoPlayerComponent;

  duration = 0;
  watchedSeconds: boolean[] = [];    // marks each played second
  lastTime = 0;                      // last observed currentTime
  lastContinuousStart = 0;           // start time of current continuous play streak
  seeking = false;
  completionFired = false;           // ensure we only log once
  CONT_END_TAIL = 1.0;               // how close to the end (seconds)
  CONT_REQUIRED = 5.0;               // require last 5s continuous to count
  MAX_JUMP_FOR_CONT = 1.25;          // tolerance for timeupdate gaps
  playSrc = '';

  constructor(
    public scrollService: ScrollService,
    private readonly statusBarService: StatusBarService,
    private readonly modalCtrl: ModalController,
    private readonly storageService: StorageService,
    private readonly authService: AuthService,
  ) { }

  ngOnInit() {
    if (this.item?.video) {
      // item.video stays as the fileId (e.g., "1AbC...XYZ")
      this.playSrc = `${environment.apiBaseUrl}/video/${this.item.video}`; // this path should 302 redirect
    }
  }
  ionViewWillEnter() {
    this.initializeStatusBar();
  }

  ionViewWillLeave() {
    this.statusBarService.modifyStatusBar(Style.Light);
  }

  async close() {
    const modal = await this.modalCtrl.getTop();
    await modal?.dismiss({});
  }

  private initializeStatusBar() {
    // document.body.classList.add('status-bar-overlay');
    this.statusBarService.show(true);
    this.statusBarService.modifyStatusBar(Style.Dark);
    this.statusBarService.overLay(false);

  }
  onCanPlay() {
    // try to start in case autoplay was blocked then allowed
    this.videoPlayer?.vid?.nativeElement?.play().catch(() => { });
  }

  onError(e: Event) {
    console.error('video error', e);
  }
  onMeta() {
    const v = this.videoPlayer?.vid?.nativeElement;
    if (!v) return;
    this.duration = Number.isFinite(v.duration) ? v.duration : 0;
    const slots = Math.max(1, Math.ceil(this.duration || 0));
    this.watchedSeconds = new Array(slots).fill(false);
    this.lastTime = 0;
    this.lastContinuousStart = 0;
    this.completionFired = false;
  }

  onTimeUpdate() {
    const v = this.videoPlayer?.vid?.nativeElement;
    if (!v || !this.duration) return;

    const t = v.currentTime;

    // mark watched second bucket (real playback, not just seek-to)
    const sec = Math.floor(t);
    if (sec >= 0 && sec < this.watchedSeconds.length) {
      this.watchedSeconds[sec] = true;
    }

    // detect loop wraparound (currentTime jumped backwards while looping),
    // credit as an "attempted to end" if we were near the end before wrap.
    if (!this.completionFired && t < this.lastTime && this.lastTime >= (this.duration - this.CONT_END_TAIL)) {
      this.markAttemptedEnd('loop-wrap');
    }

    // update continuous segment (resets on scrubs or big jumps)
    if (Math.abs(t - this.lastTime) > this.MAX_JUMP_FOR_CONT || this.seeking) {
      this.lastContinuousStart = t;
    }

    // if we’re within the tail and we’ve watched the last few seconds continuously → done
    const reachedTail = t >= (this.duration - this.CONT_END_TAIL);
    const contLen = t - this.lastContinuousStart;
    if (!this.completionFired && reachedTail && contLen >= this.CONT_REQUIRED) {
      this.markAttemptedEnd('tail-reached-continuous');
    }

    this.lastTime = t;
  }

  onSeeking() {
    this.seeking = true;
  }

  onSeeked() {
    // after seek completes, restart the continuous window from the new point
    const v = this.videoPlayer?.vid?.nativeElement;
    this.seeking = false;
    if (v) this.lastContinuousStart = v.currentTime;
  }

  onRateChange() {
    // Optional: if you want to disallow super-fast playback from counting,
    // you can reset the continuous window when rate > 2x, etc.
    const rate = this.videoPlayer?.vid?.nativeElement?.playbackRate ?? 1;
    if (rate > 2 && !this.completionFired) {
      this.lastContinuousStart = this.videoPlayer?.vid.nativeElement.currentTime;
    }
  }

  onEnded() {
    // If you remove loop, native ended will fire.
    if (!this.completionFired) this.markAttemptedEnd('native-ended');
  }

  private markAttemptedEnd(reason: 'native-ended' | 'tail-reached-continuous' | 'loop-wrap') {
    this.completionFired = true;
    const payload = {
      itemId: this.item?.video ?? null,
      reason,
      duration: this.duration,
      watchedPercent: this.watchedPercent(),
      watchedSeconds: this.countWatchedSeconds(),
      timestamp: Date.now()
    };

    // TODO: send to your server
    // fetch(`${environment.apiBaseUrl}/video/complete`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });

    // For now:
    console.log('Video completion (attempt) logged:', payload);
    this.logCompleted();
  }

  private watchedPercent(): number {
    if (!this.duration || !this.watchedSeconds.length) return 0;
    const watched = this.watchedSeconds.reduce((a, b) => a + (b ? 1 : 0), 0);
    return Math.min(100, (watched / this.watchedSeconds.length) * 100);
  }

  private countWatchedSeconds(): number {
    return this.watchedSeconds.reduce((a, b) => a + (b ? 1 : 0), 0);
  }

  private logCompleted() {
    const key = lessonKey(this.category?.slug, this.item?.slug);
    const arr = (this.currentProfile?.progress?.lessons as any).compeleted ?? [];
    if (!arr.includes(key)) arr.push(key);
    (this.currentProfile?.progress?.lessons as any).compeleted = arr;
    this.storageService.saveProfile(this.currentProfile);
    this.authService.setCurrentLogin(this.currentProfile);
  }
}
