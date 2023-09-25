import type {
  BaseQuestion,
  Choice,
  MultipleChoiceQuestion,
  OpenAnswerQuestion,
} from "./types";

export enum QuestionType {
  OpenAnswer = "Open Answer",
  MultipleChoice = "Multiple Choice",
}

export const QuestionTypes = Object.values(QuestionType);

export const InitialChoice: Choice = {
  label: "",
  description: "",
};

export const InitialBaseQuestion: BaseQuestion = {
  ask: "",
  description: "",
};

export const InitialMultipleChoiceQuestion: MultipleChoiceQuestion = {
  ...InitialBaseQuestion,
  type: QuestionType.MultipleChoice,
  minValues: 1,
  maxValues: 1,
  choices: [],
};

export const InitialOpenAnswerQuestion: OpenAnswerQuestion = {
  ...InitialBaseQuestion,
  type: QuestionType.OpenAnswer,
};

export const InitialQuestion = InitialOpenAnswerQuestion;
