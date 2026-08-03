/** @type {import('jest').Config} */
export default {
  transform: {
    "^.+\\.ts$": "./jest-transform.mjs",
  },
  testMatch: ["**/tests/**/*.test.ts"],
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js", "json"],
  extensionsToTreatAsEsm: [".ts"],
  modulePathIgnorePatterns: ["<rootDir>/AuraPost/", "<rootDir>/DEPLOYMENT/"],
};
