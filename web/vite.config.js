import { fileURLToPath } from "url";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const commonConfig = {
    plugins: [react()],
    build: {
      target: "esnext",
    },
    optimizeDeps: {
      include: ["bson"],
      esbuildOptions: {
        supported: {
          "top-level-await": true,
        },
      },
    },
    resolve: {
      alias: {
        "@web/": fileURLToPath(new URL("./src/", import.meta.url)),
        "@api/": fileURLToPath(new URL("../api/src/", import.meta.url)),
        "@data/": fileURLToPath(new URL("../data/", import.meta.url)),
        "@shared/": fileURLToPath(new URL("../shared/", import.meta.url)),
      },
    },
  };

  if (mode === "development") {
    return {
      ...commonConfig,
      server: {
        proxy: {
          "/api": "http://localhost:3000/",
          "/wsb": "http://localhost:3000/",
        },
      },
    };
  }

  return commonConfig;
});
