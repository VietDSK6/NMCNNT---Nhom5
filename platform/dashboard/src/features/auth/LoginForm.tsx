import { type FormEvent, useState } from "react";
import { motion } from "motion/react";
import { FloatingLabelInput } from "../../components/ui/FloatingLabelInput";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { AlertIcon, ChevronIcon, ShieldIcon, UserIcon } from "../../icons";
import { duration, easing } from "../../motion/constants";
import { authStrings } from "./strings";
import type { LoginStatus } from "./useLogin";
import { validatePassword, validateUsername } from "./validators";

type FieldName = "username" | "password";

export function LoginForm({
  status,
  summaryError,
  onSubmit,
  onFieldFocus,
  onTyping,
}: {
  readonly status: LoginStatus;
  readonly summaryError: string;
  readonly onSubmit: (username: string, password: string) => void;
  readonly onFieldFocus: (field: FieldName | null) => void;
  readonly onTyping: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Readonly<Record<FieldName, boolean>>>({ username: false, password: false });

  const usernameError = touched.username ? validateUsername(username) : null;
  const passwordError = touched.password ? validatePassword(password) : null;
  const locked = status === "loading" || status === "success";

  function blur(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
    onFieldFocus(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched({ username: true, password: true });
    if (validateUsername(username) || validatePassword(password) || locked) return;
    onSubmit(username, password);
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      {summaryError && <div className="form-error" role="alert"><AlertIcon />{summaryError}</div>}
      <FloatingLabelInput
        label={authStrings.usernameLabel}
        icon={<UserIcon />}
        autoComplete="username"
        autoFocus
        value={username}
        readOnly={locked}
        error={usernameError}
        valid={Boolean(username.trim())}
        onChange={(event) => { setUsername(event.target.value); onTyping(); }}
        onFocus={() => onFieldFocus("username")}
        onBlur={() => blur("username")}
      />
      <PasswordInput
        label={authStrings.passwordLabel}
        showLabel={authStrings.showPassword}
        hideLabel={authStrings.hidePassword}
        autoComplete="current-password"
        value={password}
        readOnly={locked}
        error={passwordError}
        valid={Boolean(password)}
        onChange={(event) => { setPassword(event.target.value); onTyping(); }}
        onFocus={() => onFieldFocus("password")}
        onBlur={() => blur("password")}
      />
      <div className="login-form__submit">
        <motion.button
          className="btn-gradient"
          type="submit"
          disabled={locked}
          animate={{ width: locked ? 52 : "100%" }}
          transition={{ duration: duration.base, ease: easing.out }}
          aria-label={status === "success" ? authStrings.succeeded : status === "loading" ? authStrings.submitting : undefined}
        >
          {status === "loading" && <span className="spinner" aria-hidden="true" />}
          {status === "success" && (
            <svg className="tick" viewBox="0 0 24 24" aria-hidden="true">
              <motion.path d="m5 12.5 4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: duration.base, ease: easing.out }} />
            </svg>
          )}
          {!locked && <>{authStrings.submit}<ChevronIcon /></>}
        </motion.button>
      </div>
      <p className="login-form__note"><ShieldIcon />{authStrings.sessionNote}</p>
    </form>
  );
}
