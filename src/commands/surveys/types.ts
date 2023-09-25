import type { QuestionType } from "./constants";

export type Choice = {
  label: string;
  description: string;
};

export type BaseQuestion = {
  ask: string;
  description: string;
};

export type MultipleChoiceQuestion = BaseQuestion & {
  type: QuestionType.MultipleChoice;
  choices: Choice[];
  minValues: number;
  maxValues: number;
};

export type OpenAnswerQuestion = BaseQuestion & {
  type: QuestionType.OpenAnswer;
};

export type Question = MultipleChoiceQuestion | OpenAnswerQuestion;

export type PartialSurvey = {
  id: string;
  guildId: string;
  title: string;
  channelId: string;
};

export type Survey = PartialSurvey & {
  description: string;
  createdBy: string;
  questions: Question[];
};

export type SkippedAnswer = null;
export type OpenAnswer = string;
export type SelectedAnswers = number[];
export type Answer = SkippedAnswer | OpenAnswer | SelectedAnswers;
