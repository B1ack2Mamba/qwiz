import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

type AttemptRequest = {
  employeeId?: string;
  quizId?: string;
  dateKey?: string;
  score?: number;
  correct?: number;
  accuracy?: number;
  answers?: number[];
  streakAfter?: number;
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

  const body = req.body as AttemptRequest;
  const hasRequiredPayload =
    typeof body.employeeId === "string" &&
    typeof body.quizId === "string" &&
    typeof body.dateKey === "string" &&
    typeof body.score === "number" &&
    typeof body.correct === "number" &&
    typeof body.accuracy === "number" &&
    Array.isArray(body.answers) &&
    typeof body.streakAfter === "number";

  if (!hasRequiredPayload) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const { data, error } = await supabase.rpc("qwiz_record_attempt", {
    p_employee_id: body.employeeId,
    p_quiz_id: body.quizId,
    p_date_key: body.dateKey,
    p_score: body.score,
    p_correct_count: body.correct,
    p_accuracy: body.accuracy,
    p_answers: body.answers,
    p_streak_after: body.streakAfter,
  });

  if (error) {
    if (error.code === "23505") {
      res.status(200).json({ synced: false, duplicate: true });
      return;
    }

    res.status(500).json({ error: "supabase_error", detail: error.message });
    return;
  }

  res.status(200).json({ synced: true, attemptId: data });
}
