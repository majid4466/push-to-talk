import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    // Use relative asset paths so the build works on GitHub Pages
    // project sites: https://<user>.github.io/<repo>/
    base: "./",
    plugins: [],
});
