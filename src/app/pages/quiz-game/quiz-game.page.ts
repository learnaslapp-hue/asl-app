import { map } from 'rxjs';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonBackButton, IonButton, IonButtons, IonChip, IonContent, IonHeader, IonLabel, IonTitle, IonToolbar, Platform, ToastController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { code } from 'ionicons/icons';
import { QuizItem, QuizOption } from 'src/app/model/quiz';
import { QuizStatus } from 'src/app/model/quiz-status';
import { QuizDataService } from 'src/app/services/quiz-data.service';
import { QuizStatusService } from 'src/app/services/quiz-status.service';
import { VideoPlayerComponent } from 'src/app/components/video-player/video-player.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SafeUrlPipe } from 'src/app/pipes/safe-url.pipe';
import { environment } from 'src/environments/environment.prod';

@Component({
  selector: 'app-quiz-game',
  templateUrl: './quiz-game.page.html',
  styleUrls: ['./quiz-game.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButtons, IonButton, IonBackButton, IonChip, IonLabel, SafeUrlPipe, VideoPlayerComponent
  ]
})
export class QuizGamePage implements OnInit, OnDestroy {
  q?: QuizItem;
  status!: QuizStatus;
  selected?: number;
  answered = false;
  correct = false;

  source = `${environment.apiBaseUrl}/`;

  private san = inject(DomSanitizer);
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data: QuizDataService,
    private statusSvc: QuizStatusService,
    private toast: ToastController,
    private alert: AlertController,
    private platform: Platform
  ) {
    this.init();
  }
  ngOnInit(): void {
  }

  async init() {
    const id = Number(this.route.snapshot.queryParamMap.get('id'));
    this.status = await this.statusSvc.load();
    const q = await this.data.getById(id || this.status.currentQuizId || 0);
    if (!q) {
      const a = await this.alert.create({ header: 'Not found', message: 'Quiz item missing.', buttons: ['OK'] });
      await a.present();
      this.router.navigateByUrl('/quiz');
      return;
    }
    // if(q.questionType === "single-video") {
    //   q.data = `${environment.apiBaseUrl}/${q.data}`;
    // } else if(q.questionType === "multiple-video") {
    //   q.data = q.data.map(x=> {
    //     x = `${environment.apiBaseUrl}/${x}`;
    //     return x;
    //   });
    // }
    this.q = q;
    console.log(this.q);
    this.status.currentQuizId = q.id;
    await this.statusSvc.saveLocal(this.status);
  }

  getSafeSrc(video) {
    if (video) {
      // item.video should be the fileId or your own API expects id in path—adjust if needed
      const url = `${environment.apiBaseUrl}/${video}`;
      return this.san.bypassSecurityTrustResourceUrl(url);
    }
    return null;
  }

  trackById(_: number, opt: QuizOption) { return opt.id; }

  pick(opt: QuizOption) {
    if (this.answered) return;
    this.selected = opt.id;
    this.answered = true;
    this.correct = opt.id === this.q!.correctOptionId;

    // scoring: 1 question = 1 point
    if (this.correct) {
      if (!this.status.completedQuiz.includes(this.q!.id)) {
        this.status.completedQuiz.push(this.q!.id);
        this.status.currentHighScore += 1;
      }
      // level up rule: when all items of current level are completed -> next level unlock
      this.maybeLevelUp();
    }

    this.status.currentQuizId = this.q!.id;
    this.statusSvc.saveLocal(this.status);
  }

  private async maybeLevelUp() {
    const allLevelItems = await this.data.getByLevel(this.status.currentLevel);
    const allDone = allLevelItems.every(i => this.status.completedQuiz.includes(i.id));
    if (allDone) this.status.currentLevel += 1;
  }

  async next() {
    // jump back to dashboard; keep it simple (no timer / no multi-question flow here)
    await this.statusSvc.saveLocal(this.status);
    await this.statusSvc.syncToServer(this.status);
    this.router.navigateByUrl('/quiz');
  }

  ngOnDestroy() {
    // ensure persistence even if the user leaves or app backgrounded
    this.statusSvc.saveLocal(this.status);
    this.statusSvc.syncToServer(this.status);
  }
}
