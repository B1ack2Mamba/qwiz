import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/adminAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type PointsRequest = {
  amount?: number;
  employeeId?: string;
  includeWeekly?: boolean;
  reason?: string;
};

type AdjustmentRow = {
  total_points: number;
  weekly_points: number;
  transaction_id: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  const body = req.body as PointsRequest;
  const employeeId = body.employeeId?.trim();
  const amount = Number(body.amount);
  const reason = body.reason?.trim() || "Ручная корректировка";
  const includeWeekly = body.includeWeekly !== false;

  if (!employeeId || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 10000 || reason.length > 160) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const { data, error } = await supabase.rpc("qwiz_adjust_points", {
    p_amount: amount,
    p_employee_id: employeeId,
    p_include_weekly: includeWeekly,
    p_reason: reason,
  });

  if (error) {
    const isBadRequest =
      error.message.includes("employee not found") ||
      error.message.includes("points cannot be negative") ||
      error.message.includes("amount must not be zero");
    res.status(isBadRequest ? 400 : 500).json({ error: "supabase_error", detail: error.message });
    return;
  }

  const adjustment = Array.isArray(data) ? (data[0] as AdjustmentRow | undefined) : undefined;
  res.status(200).json({ ok: true, adjustment });
}
