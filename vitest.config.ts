import react from "@vitejs/plugin-react";
import path from "path";

const config = {
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      lines: 80,
      statements: 80,
      branches: 70,
      functions: 80,
    },
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};

export default config;
