import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

const ENV_CANDIDATES = [
  resolve(repoRoot, ".env.local"),
  resolve(repoRoot, "secrets/.env.local"),
];

function parseEnvFile(raw) {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

export function loadLocalEnv() {
  const filePath = ENV_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!filePath) {
    throw new Error("Missing .env.local. Expected /Users/nick/proj/kamivoca/.env.local");
  }

  const env = parseEnvFile(readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return { env: { ...process.env }, filePath };
}

export function getFirebaseWebConfig() {
  const { env, filePath } = loadLocalEnv();

  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  for (const [key, value] of Object.entries(config)) {
    if (!value) {
      throw new Error(`Missing Firebase config "${key}" in ${filePath}`);
    }
  }

  return { config, env, filePath };
}

export function getKamiAdminEmail() {
  const { env } = loadLocalEnv();
  return (env.KAMI_ADMIN_KEY || env.NEXT_PUBLIC_KAMI_ADMIN_KEY || "").trim().toLowerCase();
}

export function getRepoRoot() {
  return repoRoot;
}
