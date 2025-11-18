
export type LessonItem = {
  name: string;
  slug: string;
  image: string;
  video: string;
  backgroundColor?: string;
  fontColor?: string;
  content?: string;
};

export type LessonCategory = {
  category: string;
  slug: string;
  image: string;
  items: LessonItem[];
};

export type CategoryProgress = {
  done: number;
  total: number;
  complete: boolean;
};
