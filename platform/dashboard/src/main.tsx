import "./theme-init";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import App from "./App";
import "./styles/tokens.css";
import "./styles/glass.css";
import "./styles/base.css";
import "./styles/aurora.css";
import "./styles/ui.css";
import "./styles/auth.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
