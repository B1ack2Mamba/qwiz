import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/adminAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type PrizeRequest = {
  place?: number;
  title?: string;
  detail?: string;
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

  const body = req.body as PrizeRequest;
  const place = Number(body.place);
  const title = body.title?.trim();
  const detail = body.detail?.trim();

  if (!Number.isInteger(place) || place < 1 || !title || !detail) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const { error } = await supabase.from("qwiz_prizes").upsert(
    {
      place,
      title,
      detail,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "place" },
  );

  if (error) {
    res.status(500).json({ error: "supabase_error", detail: error.message });
    return;
  }

  res.status(200).json({ ok: true, place });
}
