import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./index.css";
import App from "./App.jsx";

// SOC console defaults to dark; a toggle can flip to the light projector fallback.
const saved = (() => { try { return localStorage.getItem("auditor-theme"); } catch { return null; } })();
document.documentElement.classList.add(saved === "light" ? "light" : "dark");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
