import { rm } from "node:fs/promises";

await rm("dist-tests", { force: true, recursive: true });
