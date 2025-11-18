
export interface QuizOption {
  id: number;
  key: string;          // label or answer text
  type: 'text' | 'image' | 'video';
  url?: string;         // optional media for options
}

export interface QuizItem {
  id: number;
  group: string;
  name: string;
  category: string;
  questionType: 'text' | 'single-image' | 'single-video' | 'multiple-image' | 'multiple-video';
  data: string | string[] | any;
  options: QuizOption[];
  correctOptionId: number;
  level: number;
}
