module.exports = {
  env: {
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    project: true,
    tsConfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  root: true,
};
