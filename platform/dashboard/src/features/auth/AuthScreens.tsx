import { authStrings } from "./strings";

export function LoadingScreen() {
  return (
    <main className="boot-screen" aria-live="polite">
      <div className="brand-mark brand-mark--large"><span /><span /><span /></div>
      <p>{authStrings.connecting}</p>
    </main>
  );
}
