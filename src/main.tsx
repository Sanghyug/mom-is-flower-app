import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import ReactGA from "react-ga4";

import "./index.css";
import App from "./App.tsx";

const GA_ID = import.meta.env.VITE_GA_ID;

if (GA_ID) {
  ReactGA.initialize(GA_ID);
}

registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
