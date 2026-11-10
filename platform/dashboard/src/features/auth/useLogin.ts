import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../api";
import { choreography } from "../../motion/constants";
import type { UserSession } from "../../types";
import { authStrings } from "./strings";

export type LoginStatus = "idle" | "loading" | "success" | "error";
export type LoginFailure = "invalid" | "locked" | "network";

interface LoginState {
  readonly status: LoginStatus;
  readonly failure: LoginFailure | null;
  readonly message: string;
  readonly attempt: number;
}

function classify(error: unknown): { failure: LoginFailure; message: string } {
  if (error instanceof ApiError) {
    if (error.status === 423 || error.status === 429) return { failure: "locked", message: error.message || authStrings.locked };
    return { failure: "invalid", message: error.message || authStrings.invalidCredentials };
  }
  return { failure: "network", message: authStrings.network };
}

export function useLogin(onAuthenticated: (session: UserSession) => void) {
  const [state, setState] = useState<LoginState>({ status: "idle", failure: null, message: "", attempt: 0 });
  const timer = useRef<number>(0);
  const busy = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const submit = useCallback(async (username: string, password: string) => {
    if (busy.current) return;
    busy.current = true;
    setState((current) => ({ ...current, status: "loading", failure: null, message: "" }));
    try {
      const session = await api.login(username.trim(), password);
      setState((current) => ({ ...current, status: "success" }));
      timer.current = window.setTimeout(() => onAuthenticated(session), choreography.successHold * 1000);
    } catch (error) {
      const { failure, message } = classify(error);
      setState((current) => ({ status: "error", failure, message, attempt: current.attempt + 1 }));
      busy.current = false;
    }
  }, [onAuthenticated]);

  const dismiss = useCallback(() => {
    setState((current) => (current.status === "error" ? { ...current, status: "idle", failure: null, message: "" } : current));
  }, []);

  return { ...state, submit, dismiss };
}
