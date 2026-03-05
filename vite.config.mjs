// vite.config.mjs — uses .mjs extension to be treated as ESM
// regardless of "type": "commonjs" in package.json
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],

    // Use relative paths so Electron can load dist/index.html via file://
    base: "./",

    build: {
        outDir: "dist",
        emptyOutDir: true,   // clean dist/ on every build
        sourcemap: false,
        rollupOptions: {
            output: {
                // Readable chunk names for debugging
                chunkFileNames: "assets/[name]-[hash].js",
                entryFileNames: "assets/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]",
            },
        },
    },

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },

    server: {
        port: 5173,
        strictPort: true,   // fail fast if port is busy
    },
});
