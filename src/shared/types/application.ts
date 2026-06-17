export interface Application {
  start(): Promise<void>;
  stop(signal?: NodeJS.Signals): Promise<void>;
}
