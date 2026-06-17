export interface SourceModule {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}
