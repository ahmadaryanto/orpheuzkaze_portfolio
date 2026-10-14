// Refresh data/x-profile.json (and the avatar/banner images) from the official X API v2.
//
// Usage (PowerShell):
//   $env:X_BEARER_TOKEN = "your-app-bearer-token"; node scripts/fetch-x-profile.mjs
// Usage (bash):
//   X_BEARER_TOKEN=your-app-bearer-token node scripts/fetch-x-profile.mjs
//
// Get a bearer token from https://developer.x.com (Projects & Apps -> Keys and tokens).
// Your API plan must include user lookup. Never commit the token.
//
// Only values returned by the API are written. Anything missing stays null and
// is hidden on the site. Fields you edited by hand (e.g. "interests") are kept.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "data", "x-profile.json");
const token = process.env.X_BEARER_TOKEN;

if (!token) {
  console.error("Missing X_BEARER_TOKEN. See the usage notes at the top of this file.");
  process.exit(1);
}

const current = JSON.parse(await fs.readFile(dataFile, "utf8"));
const username = process.argv[2] || current.username || "orpheuskaze";

const baseFields = ["description", "public_metrics", "profile_image_url", "location", "url", "verified", "created_at", "entities"];

const lookup = async (fields) => {
  const url = `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=${fields.join(",")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
};

// profile_banner_url isn't available on every API version/plan; fall back without it.
let result = await lookup([...baseFields, "profile_banner_url"]);
if (!result.ok && result.status === 400) result = await lookup(baseFields);
if (!result.ok || !result.body.data) {
  console.error(`X API request failed (HTTP ${result.status}):`, JSON.stringify(result.body.errors || result.body, null, 2));
  process.exit(1);
}

const u = result.body.data;
const m = u.public_metrics || {};

const download = async (url, file) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  await fs.writeFile(path.join(root, file), Buffer.from(await res.arrayBuffer()));
  return `./${file.replace(/\\/g, "/")}`;
};

await fs.mkdir(path.join(root, "assets", "x"), { recursive: true });

let avatar = current.avatar;
if (u.profile_image_url) {
  avatar = await download(u.profile_image_url.replace("_normal.", "_400x400."), path.join("assets", "x", "avatar.jpg"));
}

let banner = current.banner;
if (u.profile_banner_url) {
  banner = await download(`${u.profile_banner_url}/1500x500`, path.join("assets", "x", "banner.jpg"));
}

// Prefer the expanded link over the t.co short link for the website field.
const website = u.entities?.url?.urls?.[0]?.expanded_url || u.url || null;

const joined = u.created_at
  ? new Date(u.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  : current.joined;

const next = {
  ...current,
  username: u.username,
  displayName: u.name,
  profileUrl: `https://x.com/${u.username}`,
  avatar,
  banner,
  bio: u.description || null,
  location: u.location || null,
  website,
  verified: typeof u.verified === "boolean" ? u.verified : null,
  followers: m.followers_count ?? null,
  following: m.following_count ?? null,
  posts: m.tweet_count ?? current.posts,
  joined,
  source: {
    method: "Official X API v2 (GET /2/users/by/username)",
    fetchedAt: new Date().toISOString().slice(0, 10),
    notes: "Interests are maintained by hand."
  }
};

await fs.writeFile(dataFile, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Updated ${path.relative(root, dataFile)}:`);
console.log(`  @${next.username} · ${next.followers ?? "?"} followers · ${next.following ?? "?"} following · ${next.posts} posts`);
if (next.bio) console.log(`  Bio: ${next.bio}`);
