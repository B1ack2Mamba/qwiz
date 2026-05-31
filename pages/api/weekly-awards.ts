import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

type AwardRequest = {
  weekKey?: string;
  winners?: Array<{
    place: number;
    employeeId: string;
    name: string;
    weeklyPoints: number;
    prize: string;
  }>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(202).json({ synced: false, reason: "supabase_not_configured" });
    return;
  }

  const body = req.body as AwardRequest;
  if (typeof body.weekKey !== "string" || !Array.isArray(body.winners)) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const { error } = await supabase.from("qwiz_weekly_awards").insert({
    week_start: body.weekKey,
    winners: body.winners,
  });

  if (error) {
    if (error.code === "23505") {
      res.status(200).json({ synced: false, duplicate: true });
      return;
    }

    res.status(500).json({ error: "supabase_error", detail: error.message });
    return;
  }

  res.status(200).json({ synced: true });
}
