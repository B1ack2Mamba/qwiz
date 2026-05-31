import { readFileSync, readdirSync } from "node:fs";

function readLocalEnv() {
  const env = {};

  for (const fileName of [".env", ".env.local"]) {
    let content = "";
    try {
      content = readFileSync(fileName, "utf8");
    } catch {
      continue;
    }

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      const quote = value[0];
      if ((quote === '"' || quote === "'") && value.at(-1) === quote) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  }

  return env;
}

const env = { ...readLocalEnv(), ...process.env };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const accessToken = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_MANAGEMENT_TOKEN;

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
  process.exit(1);
}

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Project API keys cannot run database DDL migrations.");
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).host.split(".")[0];
const migrationFiles = readdirSync("supabase/migrations")
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

for (const fileName of migrationFiles) {
  const query = readFileSync(`supabase/migrations/${fileName}`, "utf8");
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      read_only: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Supabase migration ${fileName} failed: ${response.status} ${response.statusText}`);
    console.error(detail);
    process.exit(1);
  }

  console.log(`${fileName}: applied`);
}

console.log("Supabase migrations applied.");
