import { createRequire } from "module";

const require = createRequire(import.meta.url);
const tsx = require("tsx/esm");

export async function processAsync(source, filePath) {
  const result = await tsx.tsImport(filePath, import.meta.url);
  return result;
}

export default {
  async process(source, filePath) {
    if (filePath.endsWith(".ts")) {
      const result = await tsx.tsImport(filePath, import.meta.url);
      return { code: result, format: "module" };
    }
    return { code: source, format: "module" };
  },
};
