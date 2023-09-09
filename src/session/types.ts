export type Context = {
  sessionId: string;
};

export type PartialContext<T extends Context> = Omit<T, "sessionId">;
