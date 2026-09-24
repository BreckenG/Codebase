import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(here, "..", "app", "pages");

// every static page route has to be in one of these two lists or the build stops,
// so a new page can never sneak into the sitemap and can never be silently dropped
const INDEXABLE = {
  "/": "landing page",
  "/ranked": "how the ranked system works, no player data",
  "/play": "modes and how to get into a game, signed-out shape has no player data",
  "/launcher": "launcher download",
  "/subscribe": "plans and pricing",
  "/legal/terms": "public policy",
  "/legal/privacy": "public policy",
  "/legal/cookies": "public policy",
  "/legal/refunds": "public policy",
  "/legal/business": "public contact details",
  "/leaderboard": "owner asked for it in google; renders player names and discord ids"
};

// blocked in robots.txt as well as noindexed: these are the ones we do not want
// fetched at all, not just kept out of the index
const BLOCKED = {
  "/admin": "admin only",
  "/launcher/connect": "device code approval step"
};

// crawlable but noindexed, so Google can actually read the noindex and drop the url.
// none of these render another player's data to a signed-out request
const NOINDEX = {
  "/me": "your own profile, needs a session",
  "/history": "your match history, needs a session",
  "/replays": "your replays, needs a session",
  "/settings": "account settings, needs a session",
  "/notifications": "your notifications, needs a session",
  "/sign-in": "auth step, nothing to rank for"
};

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { out.push(...walk(full)); continue; }
    if (!entry.name.endsWith(".vue")) continue;
    if (entry.name.includes(".before-") || entry.name.includes(".capture-")) continue;
    out.push(full);
  }
  return out;
}

function routeOf(file) {
  const rel = relative(pagesDir, file).split("\\").join("/").replace(/\.vue$/, "");
  const path = "/" + rel.replace(/(^|\/)index$/, "");
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function gitDate(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { cwd: here, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^\d{4}-\d\d-\d\d/.test(out) ? out : "";
  } catch { return ""; }
}

export function collectRoutes() {
  const files = walk(pagesDir);
  const indexable = [];
  const lastmod = {};
  const unknown = [];
  for (const file of files) {
    const path = routeOf(file);
    if (path.includes("[")) continue; // dynamic, /player/:id is the only one and it names a player
    if (BLOCKED[path] || NOINDEX[path]) continue;
    if (!INDEXABLE[path]) { unknown.push(path); continue; }
    indexable.push(path);
    const date = gitDate(file);
    if (date) lastmod[path] = date;
  }
  if (unknown.length) throw new Error("seo/public-routes.mjs: classify these page routes as INDEXABLE, BLOCKED or NOINDEX: " + unknown.sort().join(", "));
  for (const path of Object.keys(INDEXABLE)) if (!indexable.includes(path)) throw new Error("seo/public-routes.mjs: " + path + " is listed as INDEXABLE but has no page file");
  indexable.sort();
  return { indexable, lastmod, disallow: Object.keys(BLOCKED).sort() };
}
