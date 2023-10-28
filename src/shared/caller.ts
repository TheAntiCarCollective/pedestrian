export type Caller = `${string}#${string}`;

export default (
  { filename }: NodeModule,
  { name }: Record<"name", string>,
): Caller => `${filename}#${name}`;
