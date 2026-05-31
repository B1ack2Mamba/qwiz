import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/adminAuth";
import { getTodayKey, getWeekStartKey } from "../../../lib/qwizData";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type CloseWeekRequest = {
  confirm?: boolean;
  resetWeeklyPoints?: boolean;
  weekKey?: string;
};

type EmployeeAwardRow = {
  id: string;
  full_name: string;
  total_points: number;
  weekly_points: number;
};

type PrizeAwardRow = {
  title: string;
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

  const body = req.body as CloseWeekRequest;
  if (body.confirm !== true) {
    res.status(400).json({ error: "confirmation_required" });
    return;
  }

  const weekKey = body.weekKey || getWeekStartKey(getTodayKey());
  const resetWeeklyPoints = body.resetWeeklyPoints !== false;

  const [employeesResult, prizesResult] = await Promise.all([
    supabase
      .from("qwiz_employees")
      .select("id, full_name, total_points, weekly_points")
      .eq("is_active", true)
      .order("weekly_points", { ascending: false })
      .order("total_points", { ascending: false }),
    supabase.from("qwiz_prizes").select("title").eq("is_active", true).order("place"),
  ]);

  if (employeesResult.error) {
    res.status(500).json({ error: "supabase_error", detail: employeesResult.error.message });
    return;
  }

  if (prizesResult.error) {
    res.status(500).json({ error: "supabase_error", detail: prizesResult.error.message });
    return;
  }

  const employees = ((employeesResult.data || []) as EmployeeAwardRow[]).filter(
    (employee) => employee.weekly_points > 0,
  );
  const prizes = (prizesResult.data || []) as PrizeAwardRow[];
  const prizeSlots = Math.max(prizes.length, 3);
  const winners = employees.slice(0, prizeSlots).map((employee, index) => ({
    place: index + 1,
    employeeId: employee.id,
    name: employee.full_name,
    weeklyPoints: employee.weekly_points,
    prize: prizes[index]?.title || "Бонус",
  }));

  if (winners.length === 0) {
    res.status(400).json({ error: "no_weekly_points" });
    return;
  }

  const { error: awardError } = await supabase.from("qwiz_weekly_awards").insert({
    week_start: weekKey,
    winners,
  });

  if (awardError) {
    if (awardError.code === "23505") {
      res.status(200).json({ synced: false, duplicate: true, winners: [] });
      return;
    }

    res.status(500).json({ error: "supabase_error", detail: awardError.message });
    return;
  }

  if (resetWeeklyPoints) {
    const { error: resetError } = await supabase
      .from("qwiz_employees")
      .update({ weekly_points: 0, updated_at: new Date().toISOString() })
      .eq("is_active", true);

    if (resetError) {
      res.status(500).json({ error: "supabase_error", detail: resetError.message });
      return;
    }
  }

  res.status(200).json({ synced: true, resetWeeklyPoints, winners });
}
