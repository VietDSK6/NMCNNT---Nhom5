import { useAnimate, AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Toast } from "../../components/ui/Toast";
import { type AuthAmbience, useAuthAmbience } from "../../hooks/useAuthAmbience";
import { choreography, duration, easing } from "../../motion/constants";
import type { UserSession } from "../../types";
import { LoginForm } from "./LoginForm";
import { LoginHero } from "./LoginHero";
import { authStrings, type PipelineNodeId } from "./strings";
import { useLogin } from "./useLogin";

const shakeKeyframes = [0, -8, 8, -6, 6, -3, 0];
const shakeMilliseconds = 600;
const typingIdleMilliseconds = 1500;

export function LoginPage({ onAuthenticated }: { readonly onAuthenticated: (session: UserSession) => void }) {
  const login = useLogin(onAuthenticated);
  const [panel, animatePanel] = useAnimate<HTMLDivElement>();
  const [typing, setTyping] = useState(false);
  const [typingTick, setTypingTick] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);

  const ambience: AuthAmbience | undefined =
    login.status === "success" ? "success"
      : login.status === "loading" ? "submit"
        : shaking ? "error"
          : typing ? "typing" : undefined;
  useAuthAmbience(ambience);

  const { status, failure, attempt } = login;
  useEffect(() => {
    if (status !== "error" || failure !== "invalid") return;
    setShaking(true);
    void animatePanel(panel.current, { x: shakeKeyframes }, { duration: shakeMilliseconds / 1000, ease: easing.out });
    const timer = window.setTimeout(() => setShaking(false), shakeMilliseconds);
    return () => window.clearTimeout(timer);
  }, [status, failure, attempt, animatePanel, panel]);

  const { dismiss } = login;
  useEffect(() => {
    if (typingTick === 0) return;
    setTyping(true);
    const timer = window.setTimeout(() => setTyping(false), typingIdleMilliseconds);
    return () => window.clearTimeout(timer);
  }, [typingTick]);
  const handleTyping = useCallback(() => { setTypingTick((tick) => tick + 1); dismiss(); }, [dismiss]);
  const activeNode: PipelineNodeId | null = focusedField === "password" ? "runner" : null;
  const converging = status === "loading" || status === "success";
  const toastVisible = status === "error" && failure !== "invalid";

  return (
    <AuthLayout>
      <LoginHero activeNode={activeNode} fast={focusedField === "password" || converging} converging={converging} />
      <motion.div
        className="login-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.base, ease: easing.out, delay: choreography.form }}
      >
        <div ref={panel} className="login-card glass-strong">
          <div className="login-card__heading">
            <span className="eyebrow">{authStrings.formEyebrow}</span>
            <h2>{authStrings.formTitle}</h2>
            <p>{authStrings.formHint}</p>
          </div>
          <LoginForm
            status={status}
            summaryError={status === "error" && failure === "invalid" ? login.message : ""}
            onSubmit={(username, password) => void login.submit(username, password)}
            onFieldFocus={setFocusedField}
            onTyping={handleTyping}
          />
        </div>
      </motion.div>
      <div className="toast-region">
        <AnimatePresence>
          {toastVisible && (
            <Toast
              message={login.message}
              closeLabel={authStrings.closeToast}
              actionLabel={failure === "network" ? authStrings.retry : undefined}
              onAction={failure === "network" ? login.dismiss : undefined}
              onClose={login.dismiss}
            />
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
}
