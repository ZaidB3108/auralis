import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export const isTauri = "__TAURI_INTERNALS__" in window;

export async function requestGreeting(name: string) {
  if (!isTauri) return `Hello, ${name}. (Running in browser preview.)`;
  return invoke<string>("greet", { name });
}

export async function announceTheme(theme: string) {
  if (!isTauri) return;
  await emit("theme-changed", { theme });
}

export async function onThemeChanged(handler: (theme: string) => void) {
  if (!isTauri) return () => undefined;
  return listen<{ theme: string }>("theme-changed", event => handler(event.payload.theme));
}

export async function onDesktopThemeConfirmed(handler: (payload: string) => void) {
  if (!isTauri) return () => undefined;
  return listen<string>("desktop-theme-confirmed", event => handler(event.payload));
}
