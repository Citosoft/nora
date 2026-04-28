import type { PackageJsonAppMeta } from "./types/appMeta.types";

const packageJson = require("../package.json") as PackageJsonAppMeta;

export const APP_SHORT_NAME = packageJson.productName || packageJson.name || "App";
export const APP_NAME = packageJson.displayName || APP_SHORT_NAME;
export const APP_DESCRIPTION = packageJson.description || APP_NAME;
export const APP_VERSION = packageJson.version || "0.0.0";
const repositoryUrl =
  typeof packageJson.repository === "string"
    ? packageJson.repository
    : packageJson.repository?.url;
export const APP_REPOSITORY_URL =
  (typeof repositoryUrl === "string" ? repositoryUrl.replace(/\.git$/, "") : "") ||
  "https://github.com/Citosoft/nora";
export const APP_SUBMIT_ISSUE_URL = `${APP_REPOSITORY_URL}/issues/new`;
