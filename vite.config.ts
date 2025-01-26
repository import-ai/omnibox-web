import path from "node:path";
import react from "@vitejs/plugin-react";
import jotaiDebugLabel from "jotai/babel/plugin-debug-label";
import jotaiReactRefresh from "jotai/babel/plugin-react-refresh";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [
      react({
        babel: {
          plugins: [jotaiDebugLabel, jotaiReactRefresh],
          presets: ["jotai/babel/preset"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api/v1": {
          target:
            process.env.VITE_API_PATH ??
            env.VITE_API_PATH ??
            "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
