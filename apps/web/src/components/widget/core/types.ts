export interface WidgetDefinition {
  schema: Record<string, any>;
}

export interface Submission {
  answer: any;
  evaluation: {
    isCorrect: boolean;
    score: number;
    maxScore: number;
  };
}
