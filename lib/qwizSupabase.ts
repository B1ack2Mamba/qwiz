import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AppState,
  Completion,
  Employee,
  Prize,
  Quiz,
  WeeklyAward,
  createInitialState,
  displayDate,
} from "./qwizData";

type EmployeeRow = {
  id: string;
  full_name: string;
  role: string;
  avatar: string;
  total_points: number;
  weekly_points: number;
  streak: number;
};

type PrizeRow = {
  place: number;
  title: string;
  detail: string;
};

type QuizRow = {
  id: string;
  title: string;
  category: string;
};

type QuestionRow = {
  quiz_id: string;
  sort_order: number;
  prompt: string;
  options: unknown;
  correct_index: number;
};

type AttemptRow = {
  employee_id: string;
  quiz_id: string;
  score: number;
  correct_count: number;
  accuracy: number;
  answers: unknown;
  streak_after: number;
  created_at: string;
};

type PointTransactionRow = {
  id: string;
  employee_id: string;
  amount: number;
  reason: string;
  source_type: string;
  created_at: string;
};

type AwardRow = {
  week_start: string;
  winners: unknown;
  created_at: string;
};

export type RecentAttempt = {
  employeeId: string;
  employeeName: string;
  quizId: string;
  quizTitle: string;
  score: number;
  correct: number;
  accuracy: number;
  createdAt: string;
};

export type RecentPointTransaction = {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  sourceType: string;
  createdAt: string;
};

export type AdminSummary = {
  state: AppState;
  stats: {
    employees: number;
    quizzes: number;
    questions: number;
    attemptsToday: number;
    weeklyAwards: number;
    totalPoints: number;
  };
  recentAttempts: RecentAttempt[];
  recentPointTransactions: RecentPointTransaction[];
};

export async function loadQwizState(
  supabase: SupabaseClient,
  todayKey: string,
  selectedEmployeeId?: string,
): Promise<AppState> {
  const [employeesResult, prizesResult, quizzesResult, questionsResult, attemptsResult, awardsResult] =
    await Promise.all([
      supabase
        .from("qwiz_employees")
        .select("id, full_name, role, avatar, total_points, weekly_points, streak")
        .eq("is_active", true)
        .order("weekly_points", { ascending: false }),
      supabase.from("qwiz_prizes").select("place, title, detail").eq("is_active", true).order("place"),
      supabase.from("qwiz_quizzes").select("id, title, category").eq("is_active", true).order("created_at"),
      supabase
        .from("qwiz_questions")
        .select("quiz_id, sort_order, prompt, options, correct_index")
        .order("quiz_id")
        .order("sort_order"),
      supabase
        .from("qwiz_daily_attempts")
        .select("employee_id, quiz_id, score, correct_count, accuracy, answers, streak_after, created_at")
        .eq("date_key", todayKey),
      supabase.from("qwiz_weekly_awards").select("week_start, winners, created_at").order("created_at", {
        ascending: false,
      }),
    ]);

  assertSupabaseResult("employees", employeesResult.error);
  assertSupabaseResult("prizes", prizesResult.error);
  assertSupabaseResult("quizzes", quizzesResult.error);
  assertSupabaseResult("questions", questionsResult.error);
  assertSupabaseResult("attempts", attemptsResult.error);
  assertSupabaseResult("weekly_awards", awardsResult.error);

  const employees = ((employeesResult.data || []) as EmployeeRow[]).map(mapEmployee);
  const prizePool = ((prizesResult.data || []) as PrizeRow[]).map(mapPrize);
  const quizzes = mapQuizzes((quizzesResult.data || []) as QuizRow[], (questionsResult.data || []) as QuestionRow[]);
  const completions = mapCompletions(todayKey, (attemptsResult.data || []) as AttemptRow[]);
  const awardHistory = ((awardsResult.data || []) as AwardRow[]).map(mapAward).reverse();
  const fallback = createInitialState();

  return {
    selectedEmployeeId: selectedEmployeeId || employees[0]?.id || fallback.selectedEmployeeId,
    employees: employees.length > 0 ? employees : fallback.employees,
    prizePool: prizePool.length > 0 ? prizePool : fallback.prizePool,
    quizzes: quizzes.length > 0 ? quizzes : fallback.quizzes,
    completions,
    awardHistory,
  };
}

export async function loadAdminSummary(supabase: SupabaseClient, todayKey: string): Promise<AdminSummary> {
  const state = await loadQwizState(supabase, todayKey);
  const [attemptsTodayResult, awardsResult, recentAttemptsResult, recentTransactionsResult] = await Promise.all([
    supabase.from("qwiz_daily_attempts").select("*", { count: "exact", head: true }).eq("date_key", todayKey),
    supabase.from("qwiz_weekly_awards").select("*", { count: "exact", head: true }),
    supabase
      .from("qwiz_daily_attempts")
      .select("employee_id, quiz_id, score, correct_count, accuracy, answers, streak_after, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("qwiz_point_transactions")
      .select("id, employee_id, amount, reason, source_type, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  assertSupabaseResult("attempts_today_count", attemptsTodayResult.error);
  assertSupabaseResult("weekly_awards_count", awardsResult.error);
  assertSupabaseResult("recent_attempts", recentAttemptsResult.error);
  assertSupabaseResult("recent_point_transactions", recentTransactionsResult.error);

  const employeeById = new Map(state.employees.map((employee) => [employee.id, employee]));
  const quizById = new Map(state.quizzes.map((quiz) => [quiz.id, quiz]));
  const recentAttempts = ((recentAttemptsResult.data || []) as AttemptRow[]).map((attempt) => ({
    employeeId: attempt.employee_id,
    employeeName: employeeById.get(attempt.employee_id)?.name || attempt.employee_id,
    quizId: attempt.quiz_id,
    quizTitle: quizById.get(attempt.quiz_id)?.title || attempt.quiz_id,
    score: attempt.score,
    correct: attempt.correct_count,
    accuracy: attempt.accuracy,
    createdAt: attempt.created_at,
  }));
  const recentPointTransactions = ((recentTransactionsResult.data || []) as PointTransactionRow[]).map(
    (transaction) => ({
      id: transaction.id,
      employeeId: transaction.employee_id,
      employeeName: employeeById.get(transaction.employee_id)?.name || transaction.employee_id,
      amount: transaction.amount,
      reason: transaction.reason,
      sourceType: transaction.source_type,
      createdAt: transaction.created_at,
    }),
  );

  return {
    state,
    stats: {
      employees: state.employees.length,
      quizzes: state.quizzes.length,
      questions: state.quizzes.reduce((total, quiz) => total + quiz.questions.length, 0),
      attemptsToday: attemptsTodayResult.count || 0,
      weeklyAwards: awardsResult.count || 0,
      totalPoints: state.employees.reduce((total, employee) => total + employee.totalPoints, 0),
    },
    recentAttempts,
    recentPointTransactions,
  };
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.full_name,
    role: row.role,
    avatar: row.avatar,
    totalPoints: row.total_points,
    weeklyPoints: row.weekly_points,
    streak: row.streak,
  };
}

function mapPrize(row: PrizeRow): Prize {
  return {
    place: row.place,
    title: row.title,
    detail: row.detail,
  };
}

function mapQuizzes(quizRows: QuizRow[], questionRows: QuestionRow[]): Quiz[] {
  return quizRows.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    category: quiz.category,
    questions: questionRows
      .filter((question) => question.quiz_id === quiz.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((question) => ({
        text: question.prompt,
        options: normalizeStringArray(question.options),
        correct: question.correct_index,
      })),
  }));
}

function mapCompletions(todayKey: string, rows: AttemptRow[]): AppState["completions"] {
  const completions: Record<string, Record<string, Completion>> = {
    [todayKey]: {},
  };

  for (const row of rows) {
    completions[todayKey][row.employee_id] = {
      quizId: row.quiz_id,
      score: row.score,
      correct: row.correct_count,
      accuracy: row.accuracy,
      answers: normalizeNumberArray(row.answers),
      streakAfter: row.streak_after,
      completedAt: row.created_at,
    };
  }

  return completions;
}

function mapAward(row: AwardRow): WeeklyAward {
  const weekKey = row.week_start.slice(0, 10);

  return {
    weekKey,
    label: `Неделя с ${displayDate(weekKey, { day: "numeric", month: "long" })}`,
    winners: Array.isArray(row.winners) ? (row.winners as WeeklyAward["winners"]) : [],
    createdAt: row.created_at,
  };
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function normalizeNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number) : [];
}

function assertSupabaseResult(label: string, error: { message?: string } | null) {
  if (error) {
    throw new Error(`${label}: ${error.message || "Supabase request failed"}`);
  }
}
