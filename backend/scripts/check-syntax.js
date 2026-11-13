const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");

const roots = ["controllers", "middleware", "models", "routes", "services", "utils"];
const ignored = new Set(["node_modules", "tmp", "temp"]);
const files = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(fullPath);
  }
}

for (const root of roots) collect(path.join(__dirname, "..", root));
files.push(path.join(__dirname, "..", "server.js"));

const failures = [];
for (const file of files) {
  try {
    const source = fs.readFileSync(file, "utf8");
    new vm.Script(Module.wrap(source), { filename: file });
  } catch (error) {
    failures.push(`${file}\n${error.stack || error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Syntax OK: ${files.length} backend files checked.`);
