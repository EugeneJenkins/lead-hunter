export interface JobProcessor {
  readonly type: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process(jobId: string, payload: any): Promise<void>;
}
