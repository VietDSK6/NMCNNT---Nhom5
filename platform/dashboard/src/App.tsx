import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { AuroraBackground } from "./components/background/AuroraBackground";
import { CursorGlow } from "./components/background/CursorGlow";
import { LoadingScreen } from "./features/auth/AuthScreens";
import { LoginPage } from "./features/auth/LoginPage";
import { duration, easing } from "./motion/constants";
import type { UserSession } from "./types";

// Khu quản trị (biểu đồ, bảng, form) chỉ tải sau khi đăng nhập để màn hình đăng nhập nhẹ hơn.
const Dashboard = lazy(() => import("./Dashboard").then((module) => ({ default: module.Dashboard })));

type AuthState =
  | { readonly status: "loading" }
  | { readonly status: "guest" }
  | { readonly status: "authenticated"; readonly session: UserSession };

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    api.session()
      .then((session) => setAuth({ status: "authenticated", session }))
      .catch(() => setAuth({ status: "guest" }));
  }, []);

  const authenticate = useCallback((session: UserSession) => setAuth({ status: "authenticated", session }), []);
  const signOut = useCallback(() => setAuth({ status: "guest" }), []);

  return (
    <>
      <AuroraBackground calm={auth.status === "authenticated"} />
      {auth.status !== "authenticated" && <CursorGlow />}
      <AnimatePresence>
        {auth.status === "loading" && <LoadingScreen key="loading" />}
        {auth.status === "guest" && (
          <motion.div key="login" className="auth-stage" exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: duration.base, ease: easing.out }}>
            <LoginPage onAuthenticated={authenticate} />
          </motion.div>
        )}
        {auth.status === "authenticated" && (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: duration.base, ease: easing.out }}>
            <Suspense fallback={<LoadingScreen />}>
              <Dashboard session={auth.session} onLoggedOut={signOut} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
