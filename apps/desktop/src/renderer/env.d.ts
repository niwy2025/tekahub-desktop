import type { TekaApi } from "../preload/index";

declare global {
  interface Window {
    teka: TekaApi;
  }
}

export {};
