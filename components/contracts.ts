export type SaveOutcome = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};
