import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // hydration/guards: the initial client-only mount uses setState inside a one-time effect.
      // react-hooks/set-state-in-effect flags it, but the pattern is intentional here
      // (zustand is the external store; the flag is just a mount guard).
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;