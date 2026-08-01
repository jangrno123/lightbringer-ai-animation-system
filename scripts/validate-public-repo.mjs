import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const textExtensions = new Set([".md", ".txt", ".json", ".yml", ".yaml", ".cff", ".mjs"]);
const ignoredDirectories = new Set([".git", "node_modules"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const files = walk(root);
const markdownFiles = files.filter((file) => file.endsWith(".md"));

for (const file of files.filter((item) => item.endsWith(".json"))) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${path.relative(root, file)}: invalid JSON (${error.message})`);
  }
}

for (const file of markdownFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    const target = rawTarget.split("#", 1)[0];
    if (!target || /^(https?:|mailto:)/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) failures.push(`${path.relative(root, file)}: missing link target ${rawTarget}`);
  }
  for (const match of source.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi)) {
    const target = match[1];
    if (/^https?:/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) failures.push(`${path.relative(root, file)}: missing image ${target}`);
  }
}

const forbidden = [
  /sk-ant-[A-Za-z0-9_-]{20,}/,
  /sk-(?:proj|svcacct)-[A-Za-z0-9_-]{20,}/,
  /chatgpt\.site\/admin/i,
  /창세기전/,
  /서풍의 광시곡/,
  /시라노/,
  /이루스/,
  /샤른호스트/,
];

for (const file of files.filter((item) => textExtensions.has(path.extname(item).toLowerCase()))) {
  if (file.endsWith("validate-public-repo.mjs")) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) failures.push(`${path.relative(root, file)}: public-boundary pattern ${pattern}`);
  }
}

if (failures.length) {
  console.error(`Public repository validation failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validated ${markdownFiles.length} Markdown files, ${files.filter((file) => file.endsWith(".json")).length} JSON files, local links, images, and public-boundary patterns.`);
