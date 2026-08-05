import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored MediaPipe runtime. Self-hosted so the face scanner never calls
    // a CDN with a customer's face; it is generated Emscripten output and is
    // not ours to lint or fix.
    "public/mediapipe/**",
  ]),
]);

export default eslintConfig;
