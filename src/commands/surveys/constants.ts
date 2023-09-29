import type {
  BaseQuestion,
  Choice,
  MultipleChoiceQuestion,
  OpenAnswerQuestion,
} from "./types";

export enum QuestionType {
  MultipleChoice = "Multiple Choice",
  OpenAnswer = "Open Answer",
}

export const QuestionTypes = Object.values(QuestionType);

export const InitialChoice: Choice = {
  description: "",
  label: "",
};

export const InitialBaseQuestion: BaseQuestion = {
  ask: "",
  description: "",
};

export const InitialMultipleChoiceQuestion: MultipleChoiceQuestion = {
  ...InitialBaseQuestion,
  choices: [],
  maxValues: 1,
  minValues: 1,
  type: QuestionType.MultipleChoice,
};

export const InitialOpenAnswerQuestion: OpenAnswerQuestion = {
  ...InitialBaseQuestion,
  type: QuestionType.OpenAnswer,
};

export const InitialQuestion = InitialOpenAnswerQuestion;
