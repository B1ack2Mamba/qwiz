import type { NextApiRequest, NextApiResponse } from "next";
import { createEmployeeSession, hashSecret, mapEmployee } from "../../../lib/employeeAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type LoginRequest = {
  code?: string;
};

type EmployeeRow = {
  id: string;
  full_name: string;
  role: string;
  avatar: string;
  total_points: number;
  weekly_points: number;
  streak: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(500).json({ error: "supabase_not_configured" });
    return;
  }

  const body = req.body as LoginRequest;
  const code = body.code?.trim();

  if (!code) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const { data: employee, error } = await supabase
    .from("qwiz_employees")
    .select("id, full_name, role, avatar, total_points, weekly_points, streak")
    .eq("access_code_hash", hashSecret(code))
    .eq("is_active", true)
    .single();

  if (error || !employee) {
    res.status(401).json({ error: "invalid_code" });
    return;
  }

  await supabase.from("qwiz_employees").update({ last_login_at: new Date().toISOString() }).eq("id", employee.id);

  try {
    const session = await createEmployeeSession(supabase, employee.id);
    res.status(200).json({
      employee: mapEmployee(employee as EmployeeRow),
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (sessionError) {
    res.status(500).json({
      error: "session_create_failed",
      detail: sessionError instanceof Error ? sessionError.message : "Unknown error",
    });
  }
}
