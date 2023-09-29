module.exports = {
  env: {
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:perfectionist/recommended-natural",
    "plugin:sonarjs/recommended",
    "plugin:unicorn/recommended",
  ],
  ignorePatterns: ["/build/*"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    project: true,
    tsConfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "perfectionist", "sonarjs", "unicorn"],
  root: true,
  rules: {
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/no-unsafe-enum-comparison": "off",
    "no-console": "error",
    "unicorn/no-array-callback-reference": "off",
    "unicorn/no-null": "off",
    "unicorn/no-useless-undefined": "off",
    "unicorn/number-literal-case": "off",
    "unicorn/numeric-separators-style": "off",
    "unicorn/prefer-module": "off",
  },
};
