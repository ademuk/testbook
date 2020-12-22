export class Logger {
  entries: [string, any][];

  constructor() {
    this.entries = [];
  }

  addToLog = (type, args: any[]) => this.entries.push([type, args]);

  getLog = () => this.entries;
}

export const setupConsoleLogger = () =>
  new Proxy(new Logger(), {
    get: (target, name) =>
      target[name] ||
      function wrapper() {
        target.addToLog(name, Array.prototype.slice.call(arguments));
      },
  });
