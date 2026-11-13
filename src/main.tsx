import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import DesktopBorder from "./DesktopBorder";
import FloatingLyrics from "./FloatingLyrics";
import ListeningScene from "./ListeningScene";

const overlay = window.location.hash === "#desktop-border";
if (overlay) document.documentElement.dataset.overlay = "true";
const lyrics = window.location.hash === "#floating-lyrics";
if (lyrics) document.documentElement.dataset.lyrics = "true";
const scene = window.location.hash === "#listening-scene";
if (scene) document.documentElement.dataset.scene = "true";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{overlay ? <DesktopBorder /> : lyrics ? <FloatingLyrics /> : scene ? <ListeningScene /> : <App />}</React.StrictMode>
);
