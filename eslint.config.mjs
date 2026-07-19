import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Running eslint directly (next lint is deprecated) lints the whole tree,
  // so build artifacts and generated code must be ignored explicitly.
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "prisma/generated/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
