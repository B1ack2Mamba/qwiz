import crypto from "node:crypto";
import type { NextApiRequest } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee } from "./qwizData";

type EmployeeRow = {
  id: string;
  full_name: string;
  role: string;
  avatar: string;
  total_points: number;
  weekly_points: number;
  streak: number;
};

type SessionRow = {
  employee_id: string;
};

export function generateAccessCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSecret(value: string) {
  const pepper = process.env.QWIZ_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "qwiz-local";

  return crypto.createHash("sha256").update(`${pepper}:${value.trim()}`).digest("hex");
}

export function readSessionToken(req: NextApiRequest) {
  const headerToken = req.headers["x-qwiz-session"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}

export async function createEmployeeSession(supabase: SupabaseClient, employeeId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSecret(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("qwiz_employee_sessions").insert({
    employee_id: employeeId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    token,
    expiresAt,
  };
}

export async function getEmployeeBySession(supabase: SupabaseClient, req: NextApiRequest) {
  const token = readSessionToken(req);
  if (!token) {
    return null;
  }

  const { data: session, error: sessionError } = await supabase
    .from("qwiz_employee_sessions")
    .select("employee_id")
    .eq("token_hash", hashSecret(token))
    .gt("expires_at", new Date().toISOString())
    .single();

  if (sessionError || !session) {
    return null;
  }

  const { data: employee, error: employeeError } = await supabase
    .from("qwiz_employees")
    .select("id, full_name, role, avatar, total_points, weekly_points, streak")
    .eq("id", (session as SessionRow).employee_id)
    .eq("is_active", true)
    .single();

  if (employeeError || !employee) {
    return null;
  }

  return mapEmployee(employee as EmployeeRow);
}

export function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.full_name,
    role: row.role,
    avatar: row.avatar,
    totalPoints: row.total_points,
    weeklyPoints: row.weekly_points,
    streak: row.streak,
  };
}
