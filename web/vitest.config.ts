import {defineConfig} from "vitest/config";
import react from "@vitejs/plugin-react";
import {fileURLToPath} from "node:url";

export default defineConfig({
  plugins:[react()],
  resolve:{alias:{"@":fileURLToPath(new URL(".",import.meta.url))}},
  test:{
    environment:"jsdom",
    setupFiles:["./vitest.setup.ts"],
    include:["**/*.{test,spec}.{ts,tsx}"],
    coverage:{
      provider:"v8",
      reporter:["text","json-summary","lcov"],
      reportsDirectory:"coverage",
      include:["components/**/*.{ts,tsx}","lib/**/*.{ts,tsx}","app/**/*.{ts,tsx}"],
      exclude:["**/*.d.ts","**/layout.tsx"],
      thresholds:{lines:65,functions:50,statements:65,branches:55}
    }
  }
});
