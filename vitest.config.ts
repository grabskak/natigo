import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Configure jsdom for DOM testing
    environment: "jsdom",
    
    // Setup files
    setupFiles: ["./src/test/setup.ts"],
    
    // Global test settings
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "**/__mocks__",
      ],
      // Optional: Set coverage thresholds
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },
    
    // Test file patterns
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    
    // Exclude patterns
    exclude: [
      "node_modules",
      "dist",
      ".astro",
      "e2e",
    ],
  },
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
