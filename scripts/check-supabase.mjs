import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

function readJwtPayload(token) {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const serviceRolePayload = readJwtPayload(serviceRoleKey);
const serviceRole = serviceRolePayload?.role;
if (serviceRole !== "service_role") {
  console.error(`SUPABASE_SERVICE_ROLE_KEY role is ${serviceRole || "unknown"}, expected service_role.`);
  process.exit(1);
}

console.log("SUPABASE_SERVICE_ROLE_KEY: service_role");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const tables = [
  "qwiz_employees",
  "qwiz_quizzes",
  "qwiz_questions",
  "qwiz_prizes",
  "qwiz_daily_attempts",
  "qwiz_point_transactions",
  "qwiz_employee_sessions",
  "qwiz_weekly_awards",
];

for (const table of tables) {
  const { count, error } = await supabase.from(table).select("*", {
    count: "exact",
    head: true,
  });

  if (error) {
    console.error(`${table}: ${error.code || "supabase_error"}: ${error.message}`);
    process.exit(1);
  }

  console.log(`${table}: ${count ?? 0}`);
}

console.log("Supabase OK");
