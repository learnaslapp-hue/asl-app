// src/app/services/quiz-status.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StorageService } from './storage.service';
import { QuizStatus } from '../model/quiz-status';
import { User } from '../model/user';
import { SEND_USER_ID } from '../interceptor/api-interceptor-interceptor';

const STORAGE_KEY = 'quiz_status_v1';
const API = 'http://localhost:3000/api/quiz-status';

@Injectable({ providedIn: 'root' })
export class QuizStatusService {
  private readonly userIdCtx = new HttpContext().set(SEND_USER_ID, true);
  constructor(private storage: StorageService, private http: HttpClient) {}

  private async defaultStatus(): Promise<QuizStatus> {
    const user = (await this.storage.getSavedProfile()) ?? ({ userId: 'guest' } as User);
    return {
      user,
      currentLevel: 1,
      currentHighScore: 0,
      completedQuiz: [],
      currentQuizId: null,
    };
  }

  async load(): Promise<QuizStatus> {
    const local = await this.storage.getItem<QuizStatus>(STORAGE_KEY);
    if (local) return local;

    // try server (if any token/user available)
    try {
      const user = (await this.storage.getSavedProfile()) ?? ({ userId: 'guest' } as User);
      const remote = await firstValueFrom(this.http.get<QuizStatus>(`${API}?userId=${user.userId}`, {
        context: this.userIdCtx
      }));
      if (remote) {
        await this.storage.setItem(STORAGE_KEY, remote);
        return remote;
      }
    } catch {}
    const fresh = await this.defaultStatus();
    await this.saveLocal(fresh);
    return fresh;
  }

  async saveLocal(status: QuizStatus) {
    await this.storage.setItem(STORAGE_KEY, status);
  }

  async syncToServer(status?: QuizStatus) {
    const s = status ?? (await this.load());
    const body = {
      userId: s.user.userId,
      currentLevel: s.currentLevel,
      currentHighScore: s.currentHighScore,
      completedQuiz: s.completedQuiz,
      currentQuizId: s.currentQuizId,
    };
    try {
      await firstValueFrom(this.http.post(API, body, {
        context: this.userIdCtx
      }));
    } catch {
      // swallow errors; local state remains source of truth offline
    }
  }
}
