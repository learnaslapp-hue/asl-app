// src/app/model/quiz-status.ts
import { User } from './user';

export interface QuizStatus {
  user: User;
  currentLevel: number;
  currentHighScore: number;
  completedQuiz: number[];
  currentQuizId: number | null;
}
