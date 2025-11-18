import { Component, OnInit, inject, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonFab, IonFabButton, IonFabList, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, checkmarkCircle, play } from 'ionicons/icons';
import { Observable, map, switchMap } from 'rxjs';
import { ScrollService } from 'src/app/services/scroll.service';
import { DomSanitizer } from '@angular/platform-browser';
import { StatusBarService } from 'src/app/services/status-bar.service';
import { Style } from '@capacitor/status-bar';
import { User } from 'src/app/model/user';
import { StorageService } from 'src/app/services/storage.service';
import { VideoPlayerModal } from 'src/app/components/video-player-modal/video-player-modal';
import { LessonCategory, LessonItem } from 'src/app/model/lessons';
import { LessonsService } from 'src/app/services/lessons.service';

@Component({
  selector: 'app-category',
  templateUrl: './category.page.html',
  styleUrls: ['./category.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    IonContent, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonHeader, IonBackButton,
    IonFab, IonFabList, IonFabButton, IonFooter, IonCard, IonCardHeader, IonCardContent, IonCardTitle
  ],
})
export class CategoryPage implements OnInit {
  currentProfile: User;
  private route = inject(ActivatedRoute);
  private lessons = inject(LessonsService);

  showShadow = false;
  current = ''; // current category slug from route
  category$!: Observable<LessonCategory | undefined>;

  @ViewChild(IonContent, { static: true }) content!: IonContent;

  constructor(public scrollService: ScrollService,
    private readonly statusBarService: StatusBarService,
    private storageService: StorageService,
    private readonly lessonsService: LessonsService,
    private readonly modalCtrl: ModalController,
    private readonly domSanitizer: DomSanitizer) {
    addIcons({ arrowBack, play, checkmarkCircle });
    this.scrollService.scrollTop$.subscribe(v => this.showShadow = v > 0);
  }

  async ngOnInit() {
    this.currentProfile = await this.storageService.getSavedProfile();
    // /lessons/:category
    this.category$ = this.route.paramMap.pipe(
      map(params => params.get('category') || ''),
      switchMap(slug => {
        this.current = slug;
        return this.lessons.getCategory(slug);
      })
    );
  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.

    this.initializeStatusBar();
    this.scrollService.register(this.content);
  }

  ionViewWillEnter() {
    this.initializeStatusBar();
  }

  isItemDone(catSlug: string, itemSlug: string) {
    return this.lessonsService.isItemDone(this.currentProfile || undefined, catSlug, itemSlug);
  }

  async onShowVideoPlayer(lessonItem: LessonItem, category: LessonCategory) {
    const modal = await this.modalCtrl.create({
      component: VideoPlayerModal,
      cssClass: 'modal-fullscreen',
      backdropDismiss: false,
      canDismiss: true,
      componentProps: { item: lessonItem, category, currentProfile: this.currentProfile },
    });
    await modal.present();
    modal.onDidDismiss().then((res: { data: { result: string; currentFacing: "user" | "environment" } }) => {
      this.statusBarService.modifyStatusBar(Style.Light);
    });
  }

  private initializeStatusBar() {
    // document.body.classList.add('status-bar-overlay');
    this.statusBarService.show(true);
    this.statusBarService.modifyStatusBar(Style.Light);
    this.statusBarService.overLay(false);

  }
}

