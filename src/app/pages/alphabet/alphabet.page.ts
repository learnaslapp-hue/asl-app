import { Component, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollService } from '../../services/scroll.service';
import { IonBackButton, IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonFabList, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward, checkmarkCircle, chevronDown, chevronUp, close, ellipsisVertical, grid, keypad, play, scan, star, trophy } from 'ionicons/icons';
import { ScanPage } from '../scan/scan.page';
import { IonicModule } from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { User } from '../model/user';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-alphabet',
  standalone: true,
  imports: [CommonModule, IonContent, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonHeader, IonBackButton,
    IonFab, IonFabList, IonFabButton, IonFooter],
  templateUrl: './alphabet.page.html',
  styleUrls: ['./alphabet.page.scss'],
})
export class AlphabetPage {
  currentProfile: User;
  letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  @ViewChild(IonContent, { static: true }) content!: IonContent;

  imgByLetter: Record<string, string> = this.letters.reduce((acc, L) => {
    acc[L] = `assets/asl/${L}.png`;
    return acc;
  }, {} as Record<string, string>);

  selected = 'A';
  showKeyPad = false;
  showShadow = false;
  cameraFacing: "user" | "environment" = "environment";
  get imgSrc(): string {
    return this.imgByLetter[this.selected] ?? '';
  }

  get isComplted() {
    return this.currentProfile?.progress?.alphabet?.compeleted ? this.currentProfile?.progress?.alphabet?.compeleted?.some(x => x.toLowerCase() === this.selected.toLowerCase()) : false;
  }

  constructor(public scrollService: ScrollService,
    private readonly modalCtrl: ModalController,
    private readonly authService: AuthService,
    private readonly storageService: StorageService
  ) {
    this.storageService.getCameraFacing().then(res => {
      this.cameraFacing = res || "environment";
    });
    addIcons({ arrowBack, arrowForward, chevronUp, chevronDown, keypad, grid, scan, play, star, trophy, checkmarkCircle });
    this.scrollService.scrollTop$.subscribe(res => {
      this.showShadow = res > 0;
    });
  }

  async ngOnInit() {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

    await this.loadProfile();

    await this.saveLastOpened(this.selected);
  }

  ngAfterViewInit() {
    this.scrollService.register(this.content);
  }

  async selectLetter(letter: string) {
    this.selected = letter;
    this.showKeyPad = false;
    this.saveLastOpened(this.selected);
  }

  /** ---- Prev / Next helpers ---- */
  private get currentIndex(): number {
    const i = this.letters.indexOf(this.selected);
    return i < 0 ? 0 : i;
  }

  private selectByOffset(delta: number) {
    const n = this.letters.length;
    const next = (this.currentIndex + delta + n) % n; // wrap-around A <-> Z
    this.selected = this.letters[next];
  }

  async next() {
    this.selectByOffset(1);
    this.showKeyPad = false;
    this.saveLastOpened(this.selected);
  }
  async prev() {
    this.selectByOffset(-1);
    this.showKeyPad = false;
    this.saveLastOpened(this.selected);
  }

  async onShowScanner(targetLetter: string) {
    const modal = await this.modalCtrl.create({
      component: ScanPage,
      cssClass: 'modal-fullscreen scanner',
      backdropDismiss: false,
      canDismiss: true,
      id: "scanner",
      componentProps: { targetLetter, currentFacing: this.cameraFacing, currentProfile: this.currentProfile },
    });
    await modal.present();
    modal.onDidDismiss().then((res: { data: { result: string; currentFacing: "user" | "environment" } }) => {
      console.log(res);
      const { result, currentFacing } = res?.data;
      if (result && result?.toString().toLowerCase().includes("correct")) {
        this.logCompleted();
      }

      if (currentFacing) {
        this.cameraFacing = currentFacing;
      }
    });
  }

  /** Optional: support keyboard arrows */
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') this.prev();
  }

  async loadProfile() {
    this.currentProfile = await this.storageService.getSavedProfile();
    if (this.currentProfile?.progress?.alphabet?.lastOpened && this.currentProfile?.progress?.alphabet?.lastOpened !== "") {
      this.selected = this.currentProfile?.progress?.alphabet?.lastOpened.toString().toUpperCase();
    } else {
      this.selected = "A";
    }
  }

  private saveLastOpened(target: string) {
    if (this.currentProfile?.progress?.alphabet) {
      this.currentProfile.progress.alphabet.lastOpened = target;
    }
    this.authService.setCurrentLogin(this.currentProfile);
    this.storageService.saveProfile(this.currentProfile);
  }

  private logCompleted() {
    const completed = [
      ...this.currentProfile.progress.alphabet.compeleted,
    ];
    if (!completed.some(x => x.toLowerCase().includes(this.selected.toLowerCase()))) {
      completed.push(this.selected);
    }
    this.currentProfile.progress.alphabet.compeleted = completed;
    this.storageService.saveProfile(this.currentProfile);
  }
}
