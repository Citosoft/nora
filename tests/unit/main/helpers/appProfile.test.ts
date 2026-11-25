import { applyAppProfile, resolveAppProfile } from "@main/helpers/appProfile";
import { configureNoraRoot, getNoraRoot, getStateDir } from "@main/noraPaths";
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

const home = path.join(path.sep, "home", "dev");
const appData = path.join(home, "Library", "Application Support");

test("installed builds keep the data locations every release uses", () => {
  assert.deepEqual(resolveAppProfile({ isPackaged: true, homeDirectory: home, appDataDirectory: appData, productName: "Nora" }),
    { kind: "installed", noraRoot: path.join(home, ".nora") });
});

test("development builds get their own Nora root and userData directory", () => {
  assert.deepEqual(resolveAppProfile({ isPackaged: false, homeDirectory: home, appDataDirectory: appData, productName: "Nora" }), {
    kind: "development",
    noraRoot: path.join(home, ".nora-dev"),
    userDataDirectory: path.join(appData, "Nora Development")
  });
});

test("applying a profile redirects state paths and only moves userData for development", (t) => {
  const original = getNoraRoot();
  t.after(() => configureNoraRoot(original));
  const fakeApp = (isPackaged: boolean) => {
    const set: Array<[string, string]> = [];
    return { set, app: { isPackaged, getPath: () => appData, setPath: (name: string, value: string) => { set.push([name, value]); } } };
  };

  const dev = fakeApp(false);
  applyAppProfile(dev.app, { homeDirectory: home, productName: "Nora" });
  assert.equal(getStateDir(), path.join(home, ".nora-dev", "state"));
  assert.deepEqual(dev.set, [["userData", path.join(appData, "Nora Development")]]);

  const installed = fakeApp(true);
  applyAppProfile(installed.app, { homeDirectory: home, productName: "Nora" });
  assert.equal(getStateDir(), path.join(home, ".nora", "state"));
  assert.deepEqual(installed.set, []);
});
