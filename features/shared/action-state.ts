export type ActionState<T = undefined> = {
  status: "idle" | "success" | "error";
  message?: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = { status: "idle" };
