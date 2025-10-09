import 'webrtc-adapter';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
  ModalController, IonButtons, IonIcon, IonFab, IonFabButton
} from '@ionic/angular/standalone';
import { ScrollService } from '../../services/scroll.service';
import { arrowBack, repeat, cameraReverse } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { StorageService } from '../../services/storage.service';
import { User } from '../model/user';

type RFClassPrediction = { class: string; confidence: number };
type RFResponseSingleLabel = {
  time: number;
  image: { width: number; height: number };
  predictions: RFClassPrediction[];
  top: string;
  confidence: number;
  prediction_type: 'ClassificationModel' | string;
};

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons, IonIcon, IonFab, IonFabButton],
})
export class ScanPage implements OnInit, OnDestroy {
  currentProfile: User;
  @ViewChild('videoEl', { static: true }) videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl', { static: true }) canvasEl!: ElementRef<HTMLCanvasElement>;

  // Roboflow
  private readonly MODEL_SLUG = 'asl-alphabet-recognition';
  private readonly MODEL_VERSION = '7';
  private readonly API_KEY = 'EqFTjiqhfpdUYDL1N9UG';

  // Target
  targetLetter = 'A';

  // Sampling config
  private readonly frameIntervalMs = 250;   // how often we send frames
  private readonly minVoteConfidence = 0.45; // confidence threshold to accept a single hit
  private readonly maxWaitMs = 30000;        // optional: auto-timeout if nothing is found in 30s

  // Timers/state
  private frameTimer: any;
  private timeoutTimer: any;
  private running = false;
  private captureCanvas!: HTMLCanvasElement;

  // UI state
  isScanning = false;
  showRetry = false;
  resultText = '';
  liveLabel = '';
  liveConfidence = 0;
  previewSrc: string | null = null;

  // WebRTC extras
  private stream: MediaStream | null = null;
  needsTapToStart = false;
  unsupportedMsg: string | null = null;
  showSplash = true;

  // Camera switching
  currentFacing: 'user' | 'environment' = 'environment';
  hasMultipleCams = false;

  constructor(
    private readonly modalCtrl: ModalController,
    public scrollService: ScrollService,
    public storageService: StorageService,
  ) {
    addIcons({ arrowBack, repeat, cameraReverse });
  }

  // ---------- Lifecycle ----------
  async ngOnInit() {
    this.captureCanvas = document.createElement('canvas');

    if (!this.ensureGetUserMedia()) {
      this.unsupportedMsg = 'Camera not supported in this WebView. Please update Android System WebView / iOS.';
      return;
    }

    // restore facing if you persist it
    const savedFacing = await this.storageService.getCameraFacing();
    if (savedFacing === 'user' || savedFacing === 'environment') {
      this.currentFacing = savedFacing;
    }

    await this.startCamera();
    this.startScanningUntilHit(); // <— new “wait-until-detected” logic

    new ResizeObserver(() => this.fitCanvasToWrapper()).observe(
      document.querySelector('.video-wrap') as Element
    );
  }

  ngOnDestroy(): void {
    this.stopScanning();
    this.releaseCamera();
  }

  ionViewWillLeave() {
    if (this.resultText && this.resultText?.toString().toLowerCase().includes('correct')) {
      this.logCompleted();
    }
  }

  // ---------- WebRTC helpers ----------
  private ensureGetUserMedia(): boolean {
    const navAny: any = navigator;
    if (!('mediaDevices' in navigator)) navAny.mediaDevices = {};
    if (!navigator.mediaDevices.getUserMedia) {
      const legacy =
        navAny.getUserMedia ||
        navAny.webkitGetUserMedia ||
        navAny.mozGetUserMedia ||
        navAny.msGetUserMedia;
      if (!legacy) return false;
      navAny.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) =>
        new Promise<MediaStream>((resolve, reject) =>
          legacy.call(navigator, constraints, resolve, reject)
        );
    }
    return true;
  }

  private waitLoadedMetadata(video: HTMLVideoElement) {
    return new Promise<void>((resolve) => {
      if (video.readyState >= 1 && video.videoWidth && video.videoHeight) return resolve();
      video.addEventListener('loadedmetadata', () => resolve(), { once: true });
    });
  }
  private waitCanPlay(video: HTMLVideoElement) {
    return new Promise<void>((resolve) => {
      if (video.readyState >= 2) return resolve();
      video.addEventListener('canplay', () => resolve(), { once: true });
    });
  }

  private async getDeviceIdForFacing(facing: 'user' | 'environment'): Promise<string | null> {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter(d => d.kind === 'videoinput');
      if (cams.length === 0) return null;
      if (cams.length === 1) return cams[0].deviceId;

      const labeled = cams.find(d => {
        const label = (d.label || '').toLowerCase();
        if (!label) return false;
        return facing === 'environment'
          ? label.includes('back') || label.includes('rear') || label.includes('environment')
          : label.includes('front') || label.includes('user');
      });
      if (labeled) return labeled.deviceId;

      // heuristic: first ~ front, last ~ back
      return (facing === 'environment' ? cams[cams.length - 1] : cams[0]).deviceId;
    } catch {
      return null;
    }
  }

  private async startCamera() {
    this.showSplash = true;
    const video = this.videoEl.nativeElement;
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('disablePictureInPicture', '');
    video.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');

    const tryWithFacing = async () =>
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this.currentFacing } },
        audio: false,
      });

    const tryWithDeviceId = async () => {
      const id = await this.getDeviceIdForFacing(this.currentFacing);
      if (!id) throw new Error('No suitable camera deviceId');
      return navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: id } },
        audio: false,
      });
    };

    try {
      try {
        this.stream = await tryWithFacing();
      } catch {
        // fallback for WebViews that ignore facingMode
        this.stream = await tryWithDeviceId();
      }

      video.srcObject = this.stream;

      // multi-cam?
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        this.hasMultipleCams = devs.filter(d => d.kind === 'videoinput').length > 1;
      } catch {
        this.hasMultipleCams = false;
      }

      await this.waitLoadedMetadata(video);
      try { await video.play(); this.needsTapToStart = false; }
      catch { this.needsTapToStart = true; }
      await this.waitCanPlay(video);
    } catch (err) {
      console.error('getUserMedia failed:', err);
      this.unsupportedMsg = 'Unable to open camera on this device.';
    }
    this.showSplash = false;
    this.storageService.setCameraFacing(this.currentFacing);
  }

  async onTapToStart() {
    try {
      await this.videoEl.nativeElement.play();
      this.needsTapToStart = false;
    } catch (e) {
      console.warn('play() still blocked', e);
    }
  }

  private releaseCamera() {
    const v = this.videoEl?.nativeElement;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    if (this.stream) this.stream = null;
  }

  async switchCamera() {
    this.currentFacing = this.currentFacing === 'user' ? 'environment' : 'user';
    this.releaseCamera();
    await this.startCamera();
  }

  // ---------- NEW: scan-until-single-hit ----------
  private startScanningUntilHit() {
    if (this.running) return;
    this.running = true;

    this.previewSrc = null;
    this.resultText = '';
    this.liveLabel = '';
    this.liveConfidence = 0;
    this.showRetry = false;
    this.isScanning = true;

    // continuously sample
    this.frameTimer = setInterval(() => this.captureAndPredictOnce().catch(console.error), this.frameIntervalMs);

    // optional safety timeout
    this.timeoutTimer = setTimeout(() => {
      if (!this.running) return;
      this.stopScanning();
      this.resultText = 'Time out — try again';
      this.capturePreview();
      this.showRetry = true;
    }, this.maxWaitMs);
  }

  private stopScanning() {
    this.running = false;
    if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
    if (this.timeoutTimer) { clearTimeout(this.timeoutTimer); this.timeoutTimer = null; }
    this.isScanning = false;
  }

  private async captureAndPredictOnce() {
    const video = this.videoEl.nativeElement;
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) return;

    const cap = this.captureCanvas;
    cap.width = video.videoWidth;
    cap.height = video.videoHeight;
    const ctx = cap.getContext('2d');
    if (!ctx) return;

    // draw current frame
    ctx.drawImage(video, 0, 0, cap.width, cap.height);
    const base64 = cap.toDataURL('image/jpeg', 0.9).split(',')[1];

    // Roboflow classify
    const url = `https://classify.roboflow.com/${this.MODEL_SLUG}/${this.MODEL_VERSION}?api_key=${this.API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: base64,
    });
    if (!res.ok) return;

    const json = (await res.json()) as RFResponseSingleLabel;

    // Update live HUD with the best label (for user feedback)
    if (json.predictions?.length) {
      const best = [...json.predictions].sort((a, b) => b.confidence - a.confidence)[0];
      this.liveLabel = best.class.toUpperCase();
      this.liveConfidence = best.confidence;
    } else {
      this.liveLabel = '';
      this.liveConfidence = 0;
    }

    // Single-hit decision: if expected appears ONCE above threshold, we’re done
    const expected = this.targetLetter.toUpperCase();
    const found = (json.predictions || []).some(p =>
      p.class?.toUpperCase() === expected && p.confidence >= this.minVoteConfidence
    );

    if (found) {
      console.log("found image", cap.toDataURL('image/jpeg', 0.9))
      this.stopScanning();
      this.resultText = 'Correct!';
      this.capturePreview();
      this.showRetry = true;
      this.logCompleted();

    }

    // keep the HUD dashed guide refreshed
    this.drawOverlay();
  }

  // ---------- HUD / Preview ----------
  private fitCanvasToWrapper() {
    const wrap = document.querySelector('.video-wrap') as HTMLElement | null;
    const canvas = this.canvasEl?.nativeElement;
    if (!wrap || !canvas) return;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }

  private drawOverlay() {
    const canvas = this.canvasEl.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const displayW = Math.max(1, Math.floor(rect.width));
    const displayH = Math.max(1, Math.floor(rect.height));

    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW;
      canvas.height = displayH;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, displayW, displayH);

    // dashed guide
    const gw = Math.floor(displayW * 0.55);
    const gh = Math.floor(displayH * 0.55);
    const gx = Math.floor((displayW - gw) / 2);
    const gy = Math.floor((displayH - gh) / 2);

    ctx.save();
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(30,144,255,0.9)';
    ctx.strokeRect(gx, gy, gw, gh);
    ctx.restore();
  }

  private capturePreview() {
    const video = this.videoEl.nativeElement;
    const hudCanvas = this.canvasEl.nativeElement;

    const rect = hudCanvas.getBoundingClientRect();
    const outW = Math.max(1, Math.floor(rect.width));
    const outH = Math.max(1, Math.floor(rect.height));

    const off = document.createElement('canvas');
    off.width = outW; off.height = outH;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, outW, outH);

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw && vh) {
      const scale = Math.min(outW / vw, outH / vh);
      const dw = Math.floor(vw * scale);
      const dh = Math.floor(vh * scale);
      const dx = Math.floor((outW - dw) / 2);
      const dy = Math.floor((outH - dh) / 2);
      ctx.drawImage(video, dx, dy, dw, dh);
    }

    // guide
    ctx.save();
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(30,144,255,0.9)';
    const gw = Math.floor(outW * 0.55);
    const gh = Math.floor(outH * 0.55);
    const gx = Math.floor((outW - gw) / 2);
    const gy = Math.floor((outH - gh) / 2);
    ctx.strokeRect(gx, gy, gw, gh);
    ctx.restore();

    this.previewSrc = off.toDataURL('image/png');
  }

  onRetry() {
    this.resultText = '';
    this.previewSrc = null;
    this.showRetry = false;
    this.startScanningUntilHit();
  }

  async close() {
    const modal = await this.modalCtrl.getTop();
    modal?.dismiss({ result: this.resultText, currentFacing: this.currentFacing });
  }

  private logCompleted() {
    const completed = [
      ...this.currentProfile.progress.alphabet.compeleted,
    ];
    if (!completed.some(x => x.toLowerCase().includes(this.targetLetter.toLowerCase()))) {
      completed.push(this.targetLetter);
    }
    this.currentProfile.progress.alphabet.compeleted = completed;
    this.storageService.saveProfile(this.currentProfile);
  }
}
