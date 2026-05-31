import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/adminAuth";
import { getTodayKey } from "../../../lib/qwizData";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { loadAdminSummary } from "../../../lib/qwizSupabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(500).json({ error: "supabase_not_configured" });
    return;
  }

  try {
    const todayKey = typeof req.query.dateKey === "string" ? req.query.dateKey : getTodayKey();
    const summary = await loadAdminSummary(supabase, todayKey);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({
      error: "supabase_error",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
