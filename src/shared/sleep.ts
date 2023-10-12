export default (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
