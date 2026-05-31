import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/adminAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type ScheduleRequest = {
  dateKey?: string;
  quizId?: string;
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

  const body = req.body as ScheduleRequest;
  const dateKey = body.dateKey?.trim();
  const quizId = body.quizId?.trim();

  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  if (!quizId) {
    const { error } = await supabase.from("qwiz_quiz_schedule").delete().eq("date_key", dateKey);
    if (error) {
      res.status(500).json({ error: "supabase_error", detail: error.message });
      return;
    }

    res.status(200).json({ ok: true, deleted: true, dateKey });
    return;
  }

  const { data: quiz, error: quizError } = await supabase
    .from("qwiz_quizzes")
    .select("id")
    .eq("id", quizId)
    .eq("is_active", true)
    .single();

  if (quizError || !quiz) {
    res.status(400).json({ error: "quiz_not_found" });
    return;
  }

  const { error } = await supabase.from("qwiz_quiz_schedule").upsert(
    {
      date_key: dateKey,
      quiz_id: quizId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "date_key" },
  );

  if (error) {
    res.status(500).json({ error: "supabase_error", detail: error.message });
    return;
  }

  res.status(200).json({ ok: true, dateKey, quizId });
}
