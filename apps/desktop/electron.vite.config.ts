import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

/** Workspace ESM packages — bundle into Electron CJS (preload must stay Node-builtin-free). */
const bundleWorkspace = externalizeDepsPlugin({
  exclude: ["@teka/shared", "@teka/shared/crypto"],
});

export default defineConfig({
  main: {
    plugins: [bundleWorkspace],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [bundleWorkspace],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
        },
      },
    },
    plugins: [react()],
  },
});
