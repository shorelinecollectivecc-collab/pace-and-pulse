import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import "./theme-palettes.css";
import { registerPacePulseServiceWorker } from "./pwa";

void registerPacePulseServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
