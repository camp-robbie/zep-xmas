import { defineConfig } from "vite";

export default defineConfig({
    optimizeDeps: {
        include: ["three"],
    },
    build: {
        commonjsOptions: {
            include: [/three/, /node_modules/],
        },
    },
});