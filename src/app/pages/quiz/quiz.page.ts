import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonBackButton, IonButton, IonButtons, IonChip, IonContent, IonHeader, IonLabel, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { QuizItem } from 'src/app/model/quiz';
import { QuizStatus } from 'src/app/model/quiz-status';
import { QuizDataService } from 'src/app/services/quiz-data.service';
import { QuizStatusService } from 'src/app/services/quiz-status.service';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButtons, IonButton, IonLabel, IonChip, IonBackButton
  ]
})
export class QuizPage implements OnInit {
  status!: QuizStatus;
  levels: number[] = [];
  itemsByLevel = new Map<number, QuizItem[]>();
  loading = true;

  constructor(
    private router: Router,
    private data: QuizDataService,
    private statusSvc: QuizStatusService
  ) { }

  async ngOnInit() {
    this.levels = await this.data.getLevels();
    for (const lvl of this.levels) {
      this.itemsByLevel.set(lvl, await this.data.getByLevel(lvl));
    }
    this.loading = false;
  }

  ionViewWillEnter() {
    this.loadStatus();
  }

  get points() {
    return this.status?.currentHighScore || 0;
  }

  canOpen(level: number) {
    return level <= this.status?.currentLevel;
  }

  startNext() {
    // pick first not-completed item at or below currentLevel
    const pool = this.levels
      .filter(l => l <= this.status?.currentLevel)
      .flatMap(l => this.itemsByLevel.get(l) || []);
    const next = pool.find(q => !this.status?.completedQuiz.includes(q.id)) ?? pool[0];
    if (next) this.openQuiz(next.id);
    else this.openQuiz(1);
  }

  openQuiz(id: number) {
    if (this.status) {
      this.status.currentQuizId = id;
    }
    this.statusSvc.saveLocal(this.status);
    this.router.navigate(['/quiz/quiz-game'], { queryParams: { id } });
  }

  private async loadStatus() {
    this.status = await this.statusSvc.load();
  }
}
