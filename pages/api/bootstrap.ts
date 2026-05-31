import type { NextApiRequest, NextApiResponse } from "next";
import { getEmployeeBySession, readSessionToken } from "../../lib/employeeAuth";
import { createInitialState, getTodayKey } from "../../lib/qwizData";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { loadQwizState } from "../../lib/qwizSupabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const todayKey = typeof req.query.dateKey === "string" ? req.query.dateKey : getTodayKey();
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    res.status(200).json({ source: "local", state: createInitialState() });
    return;
  }

  try {
    if (!readSessionToken(req)) {
      res.status(401).json({ error: "auth_required" });
      return;
    }

    const employee = await getEmployeeBySession(supabase, req);
    if (!employee) {
      res.status(401).json({ error: "invalid_session" });
      return;
    }

    const state = await loadQwizState(supabase, todayKey, employee.id);
    res.status(200).json({ authenticatedEmployeeId: employee?.id || null, source: "supabase", state });
  } catch (error) {
    res.status(500).json({
      error: "supabase_error",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
