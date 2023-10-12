// Function type is safe since only name is accessed
/* eslint-disable @typescript-eslint/ban-types */
export class Caller {
  private readonly caller: Function;
  private readonly module: NodeModule;

  constructor(module: NodeModule, caller: Function) {
    this.module = module;
    this.caller = caller;
  }

  toString() {
    const { filename: url } = this.module;
    const { name: fragment } = this.caller;
    return `${url}#${fragment}`;
  }
}

export default (module: NodeModule, caller: Function) =>
  new Caller(module, caller);
/* eslint-enable @typescript-eslint/ban-types */
