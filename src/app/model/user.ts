import { Progress } from "./progress";

export class User {
    userId: string;
    name: string;
    email: string;
    isVerifiedUser: boolean;
    active: boolean;
    progress: {
      alphabet: Progress;
      lessons: Progress;
      quiz: Progress;
    } = {
      alphabet: {
        lastOpened: "A",
        compeleted: [],
        status: "",
      },
      lessons: new Progress,
      quiz: new Progress
    };
  }
