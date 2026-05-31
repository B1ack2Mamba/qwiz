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

  const { data: attempt, error: attemptError } = await supabase
    .from("qwiz_daily_attempts")
    .insert({
      employee_id: body.employeeId,
      quiz_id: body.quizId,
      date_key: body.dateKey,
      score: body.score,
      correct_count: body.correct,
      accuracy: body.accuracy,
      answers: body.answers,
      streak_after: body.streakAfter,
    })
    .select("id")
    .single();

  if (attemptError) {
    if (attemptError.code === "23505") {
      res.status(200).json({ synced: false, duplicate: true });
      return;
    }

    res.status(500).json({ error: "supabase_error", detail: attemptError.message });
    return;
  }

  const { error: transactionError } = await supabase.from("qwiz_point_transactions").insert({
    employee_id: body.employeeId,
    amount: body.score,
    reason: "daily_quiz",
    source_type: "qwiz_daily_attempt",
    source_id: attempt.id,
  });

  if (transactionError) {
    res.status(500).json({ error: "supabase_error", detail: transactionError.message });
    return;
  }

  const { data: employee, error: employeeError } = await supabase
    .from("qwiz_employees")
    .select("total_points, weekly_points")
    .eq("id", body.employeeId)
    .single();

  if (employeeError) {
    res.status(500).json({ error: "supabase_error", detail: employeeError.message });
    return;
  }

  const { error: updateError } = await supabase
    .from("qwiz_employees")
    .update({
      total_points: employee.total_points + body.score,
      weekly_points: employee.weekly_points + body.score,
      streak: body.streakAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.employeeId);

  if (updateError) {
    res.status(500).json({ error: "supabase_error", detail: updateError.message });
    return;
  }

  res.status(200).json({ synced: true, attemptId: attempt.id });
}
