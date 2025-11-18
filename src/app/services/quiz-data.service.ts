// src/app/services/quiz-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QuizItem } from '../model/quiz';

@Injectable({ providedIn: 'root' })
export class QuizDataService {
  private cache: QuizItem[] | null = null;

  constructor(private http: HttpClient) {}

  async loadAll(): Promise<QuizItem[]> {
    if (this.cache) return this.cache;
    // place your JSON in /assets/data/quiz.json
    const data = await firstValueFrom(this.http.get<QuizItem[]>('/assets/quiz/quiz.json'));
    // normalize legacy keys if needed
    this.cache = data.sort((a, b) => a.level - b.level || a.id - b.id);
    return this.cache;
  }

  async getLevels(): Promise<number[]> {
    const all = await this.loadAll();
    return Array.from(new Set(all.map(q => q.level))).sort((a, b) => a - b);
  }

  async getByLevel(level: number): Promise<QuizItem[]> {
    const all = await this.loadAll();
    return all.filter(q => q.level === level);
  }

  async getById(id: number): Promise<QuizItem | undefined> {
    const all = await this.loadAll();
    return all.find(q => q.id === id);
  }
}
