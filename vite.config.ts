import { defineConfig, loadEnv } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import preserveDirectives from "rollup-preserve-directives";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      react(),
      visualizer({
        open: process.env.NODE_ENV !== "CI",
        filename: "./dist/stats.html",
      }),
    ],
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
    server: {
      port: parseInt(env.VITE_PORT) || 5000,
      open: true,
      proxy: {
        "/graphql": {
          target: env.VITE_AUTH_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    base: "./",
    esbuild: {
      keepNames: true,
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        plugins: [preserveDirectives()],
      },
    },
    resolve: {
      preserveSymlinks: true,
      alias: [
        {
          find: "react-router-dom",
          replacement: path.resolve(
            __dirname,
            `node_modules/react-router/dist/${mode === "production" ? "production" : "development"}/index.mjs`,
          ),
        },
        {
          find: "react-router",
          replacement: path.resolve(
            __dirname,
            `node_modules/react-router/dist/${mode === "production" ? "production" : "development"}/index.mjs`,
          ),
        },
        {
          find: /^@mui\/([a-zA-Z0-9-_]+)\/*(.*)$/,
          replacement: path.resolve(__dirname, "node_modules/@mui/$1/esm/$2"),
        },
      ],
    },
  };
});