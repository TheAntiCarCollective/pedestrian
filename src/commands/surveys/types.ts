import type { QuestionType } from "./constants";

export type Choice = {
  description: string;
  label: string;
};

export type BaseQuestion = {
  ask: string;
  description: string;
};

export type MultipleChoiceQuestion = BaseQuestion & {
  choices: Choice[];
  maxValues: number;
  minValues: number;
  type: QuestionType.MultipleChoice;
};

export type OpenAnswerQuestion = BaseQuestion & {
  type: QuestionType.OpenAnswer;
};

export type Question = MultipleChoiceQuestion | OpenAnswerQuestion;

export type PartialSurvey = {
  channelId: string;
  guildId: string;
  id: string;
  title: string;
};

export type Survey = PartialSurvey & {
  createdBy: string;
  description: string;
  questions: Question[];
};

export type SkippedAnswer = null;
export type OpenAnswer = string;
export type SelectedAnswers = number[];
export type Answer = OpenAnswer | SelectedAnswers | SkippedAnswer;
