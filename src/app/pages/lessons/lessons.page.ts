// src/app/pages/lessons/lessons.page.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader,
  IonCardTitle, IonContent, IonFab, IonFabButton, IonFabList, IonFooter,
  IonHeader, IonIcon, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';

import { ScrollService } from 'src/app/services/scroll.service';
import { StatusBarService } from 'src/app/services/status-bar.service';
import { Style } from '@capacitor/status-bar';
import { RouterModule } from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';
import { LessonCategory, CategoryProgress } from 'src/app/model/lessons';
import { LessonsService } from 'src/app/services/lessons.service';

@Component({
  selector: 'app-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./lessons.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    IonContent, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonHeader, IonBackButton,
    IonFab, IonFabList, IonFabButton, IonFooter, IonCard, IonCardHeader, IonCardContent, IonCardTitle
  ],
})
export class LessonsPage implements OnInit {
  showShadow = false;

  categories$!: Observable<LessonCategory[]>;
  progressMap$!: Observable<Record<string, CategoryProgress>>;

  @ViewChild(IonContent, { static: true }) content!: IonContent;

  constructor(
    public scrollService: ScrollService,
    private readonly statusBarService: StatusBarService,
    private readonly lessonsService: LessonsService,
    private readonly auth: AuthService,
  ) {
    addIcons({ arrowBack });
    this.scrollService.scrollTop$.subscribe(v => (this.showShadow = v > 0));
  }

  ngOnInit() {
    // cache categories once
    this.categories$ = this.lessonsService.getCategories().pipe(shareReplay(1));

    // progress always follows the latest user profile
    this.progressMap$ = this.auth.user$.pipe(
      switchMap(user => this.lessonsService.progressFor(user || undefined)),
      shareReplay(1)
    );
  }

  ngAfterViewInit() {
    this.initializeStatusBar();
    this.scrollService.register(this.content);
  }

  ionViewWillEnter() {
    this.initializeStatusBar();
  }

  private initializeStatusBar() {
    this.statusBarService.show(true);
    this.statusBarService.modifyStatusBar(Style.Light);
    this.statusBarService.overLay(false);
  }
}
