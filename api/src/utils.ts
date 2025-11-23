import fs from "node:fs";
import path from "node:path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const dirPath = (...args: string[]) => path.join(__dirname, ...args);

export const loadJSON = (filePath: string) =>
  JSON.parse(fs.readFileSync(dirPath(filePath), "utf8"));

export const loadAllJSONFromDir = (dir: string) => {
  const workDir = dirPath(dir);
  const files = fs.readdirSync(workDir);
  const jsons = files
    .filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(fs.readFileSync(`${workDir}/${f}`, "utf8")));

  return jsons.flat();
};

const filesToProcess = (dir: string, fileRegexp: RegExp) => {
  const files = fs.readdirSync(dirPath(dir)).filter(file => !!file.match(fileRegexp));

  if (process.env.LOCAL_DEV) {
    const last = files[files.length - 1];
    return [last];
  }

  return files;
};

export const processImportAsyncSeq = async (
  dir: string,
  fileRegexp: RegExp,
  forEachFileJSONCb: (obj: Record<string, unknown>) => Promise<void>,
) => {
  const files = filesToProcess(dir, fileRegexp);
  for (const file of files) {
    const curJSON = loadJSON(`${dir}/${file}`);
    for (const obj of curJSON) {
      await forEachFileJSONCb(obj);
    }
  }
};

export const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validApiKeys = new Set(
  (() => {
    try {
      return JSON.parse(process.env.API_KEYS ?? "[]");
    } catch (all) {
      console.error("BAD API_KEYS env variable");
      console.error(all);
    }
    return [];
  })(),
);
const validApiKeyPreHandler = async (req, res) => {
  const clientApiKey = req.headers["x-api-key"];
  if (!clientApiKey || !validApiKeys.has(clientApiKey)) {
    return res.code(401).send({ error: "Unauthorized" });
  }
};
export const verifyApiKey = { preHandler: validApiKeyPreHandler };
