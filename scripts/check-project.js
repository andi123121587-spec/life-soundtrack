const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const ignored = new Set(["node_modules"]);

function collect(directory, extension, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(target, extension, output);
    else if (target.endsWith(extension)) output.push(target);
  }
  return output;
}

for (const file of collect(root, ".js")) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/require\(["'](\.{1,2}\/[^"']+)["']\)/g)) {
    const requested = path.resolve(path.dirname(file), match[1]);
    const candidates = [requested, `${requested}.js`, `${requested}.json`, path.join(requested, "index.js")];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      throw new Error(`Unresolved local require in ${path.relative(root, file)}: ${match[1]}`);
    }
  }
}

for (const file of collect(root, ".json")) {
  JSON.parse(fs.readFileSync(file, "utf8"));
}

const requiredDirectories = ["Core", "Features", "UI", "Services", "Tests", "Docs"];
for (const directory of requiredDirectories) {
  if (!fs.existsSync(path.join(root, directory))) {
    throw new Error(`Missing architecture directory: ${directory}`);
  }
}

for (const directory of ["models", "domain"]) {
  if (!fs.existsSync(path.join(root, "Core", directory))) throw new Error(`Missing Core directory: ${directory}`);
}
for (const directory of ["api", "ai", "database"]) {
  if (!fs.existsSync(path.join(root, "Services", directory))) throw new Error(`Missing Services directory: ${directory}`);
}

for (const file of collect(path.join(root, "Core"), ".js")) {
  const source = fs.readFileSync(file, "utf8");
  if (/\bwx\s*\./.test(source)) throw new Error(`Core must not call wx API: ${path.relative(root, file)}`);
  if (/(?:^|[\\/])(?:pages|components|cloudfunctions)(?:[\\/]|$)/.test(source)) {
    throw new Error(`Core must not depend on UI or cloudfunction paths: ${path.relative(root, file)}`);
  }
}

const appConfig = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
for (const page of appConfig.pages || []) {
  if (!fs.existsSync(path.join(root, `${page}.js`))) throw new Error(`Unresolved app page: ${page}`);
}
for (const component of Object.values(appConfig.usingComponents || {})) {
  if (!fs.existsSync(path.join(root, `${component.slice(1)}.js`))) throw new Error(`Unresolved app component: ${component}`);
}

console.log("Project checks passed: JavaScript syntax and JSON parsing.");
