export type Task = {
  title: string;
  run(): Promise<void>;
};
