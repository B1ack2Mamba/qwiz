import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/adminAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type QuizRequest = {
  id?: string;
  title?: string;
  category?: string;
  questions?: Array<{
    text?: string;
    options?: string[];
    correct?: number;
  }>;
};

type QuizQuestionRequest = NonNullable<QuizRequest["questions"]>[number];

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

  const body = req.body as QuizRequest;
  const id = normalizeId(body.id || body.title || "");
  const title = body.title?.trim();
  const category = body.category?.trim();
  const questions = body.questions || [];

  if (!id || !title || !category || questions.length === 0 || !questions.every(isValidQuestion)) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const { error: quizError } = await supabase.from("qwiz_quizzes").upsert(
    {
      id,
      title,
      category,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (quizError) {
    res.status(500).json({ error: "supabase_error", detail: quizError.message });
    return;
  }

  const { error: deleteError } = await supabase.from("qwiz_questions").delete().eq("quiz_id", id);
  if (deleteError) {
    res.status(500).json({ error: "supabase_error", detail: deleteError.message });
    return;
  }

  const { error: questionsError } = await supabase.from("qwiz_questions").insert(
    questions.map((question, index) => ({
      quiz_id: id,
      sort_order: index + 1,
      prompt: question.text?.trim(),
      options: question.options?.map((option) => option.trim()),
      correct_index: Number(question.correct),
      updated_at: new Date().toISOString(),
    })),
  );

  if (questionsError) {
    res.status(500).json({ error: "supabase_error", detail: questionsError.message });
    return;
  }

  res.status(200).json({ ok: true, id });
}

function normalizeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function isValidQuestion(question: QuizQuestionRequest) {
  const options = question.options || [];
  const correct = Number(question.correct);

  return (
    Boolean(question.text?.trim()) &&
    options.length >= 2 &&
    options.every((option: string) => Boolean(option.trim())) &&
    Number.isInteger(correct) &&
    correct >= 0 &&
    correct < options.length
  );
}
