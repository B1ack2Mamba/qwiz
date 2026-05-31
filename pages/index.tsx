import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AppState,
  Completion,
  Quiz,
  WeeklyWinner,
  calculateScore,
  createInitialState,
  displayDate,
  formatNumber,
  getTodayKey,
  getWeekStartKey,
  pickDailyQuiz,
} from "../lib/qwizData";

const SELECTED_EMPLOYEE_KEY = "qwiz-selected-employee-id";
const SESSION_TOKEN_KEY = "qwiz-session-token";

type ToastState = {
  message: string;
  visible: boolean;
};

type BootstrapResponse = {
  authenticatedEmployeeId?: string | null;
  source: "local" | "supabase";
  state: AppState;
};

type LoginResponse = {
  token: string;
  employee: {
    id: string;
  };
};

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>(() => createInitialState());
  const [loading, setLoading] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [dataSource, setDataSource] = useState<BootstrapResponse["source"]>("local");
  const [loadError, setLoadError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState<number[]>([]);
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });

  const todayKey = useMemo(() => getTodayKey(), []);
  const weekStartKey = useMemo(() => getWeekStartKey(todayKey), [todayKey]);
  const quiz = useMemo(() => pickDailyQuiz(appState.quizzes, todayKey), [appState.quizzes, todayKey]);
  const selectedEmployee =
    appState.employees.find((employee) => employee.id === appState.selectedEmployeeId) || appState.employees[0];
  const completion = selectedEmployee ? appState.completions[todayKey]?.[selectedEmployee.id] || null : null;
  const todayCompletions = Object.values(appState.completions[todayKey] || {});
  const rankedEmployees = appState.employees.slice().sort((a, b) => {
    if (b.weeklyPoints !== a.weeklyPoints) {
      return b.weeklyPoints - a.weeklyPoints;
    }
    return b.totalPoints - a.totalPoints;
  });
  const maxWeeklyPoints = Math.max(...rankedEmployees.map((employee) => employee.weeklyPoints), 1);
  const alreadyAwarded = appState.awardHistory.some((award) => award.weekKey === weekStartKey);

  useEffect(() => {
    const selectedEmployeeId = window.localStorage.getItem(SELECTED_EMPLOYEE_KEY) || undefined;
    const token = window.localStorage.getItem(SESSION_TOKEN_KEY) || "";
    if (!token) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSessionToken(token);
      void loadBootstrap(selectedEmployeeId, token);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast.visible) {
      return;
    }

    const timer = window.setTimeout(() => setToast((current) => ({ ...current, visible: false })), 2600);
    return () => window.clearTimeout(timer);
  }, [toast.visible]);

  async function loadBootstrap(selectedEmployeeId = appState.selectedEmployeeId, token = sessionToken) {
    setLoading(true);
    setLoadError("");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ dateKey: todayKey });
      if (selectedEmployeeId) {
        params.set("employeeId", selectedEmployeeId);
      }

      const response = await fetch(`/api/bootstrap?${params.toString()}`, {
        headers: token ? { "x-qwiz-session": token } : {},
      });
      if (response.status === 401) {
        window.localStorage.removeItem(SESSION_TOKEN_KEY);
        window.localStorage.removeItem(SELECTED_EMPLOYEE_KEY);
        setSessionToken("");
        throw new Error("Сессия истекла. Войдите заново по коду.");
      }

      if (!response.ok) {
        throw new Error("Не удалось загрузить данные приложения.");
      }

      const payload = (await response.json()) as BootstrapResponse;
      setAppState(payload.state);
      if (payload.authenticatedEmployeeId) {
        window.localStorage.setItem(SELECTED_EMPLOYEE_KEY, payload.authenticatedEmployeeId);
      }
      setDataSource(payload.source);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Не удалось загрузить данные приложения.");
      setAppState(createInitialState());
      setDataSource("local");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string) {
    setToast({ message, visible: true });
  }

  function resetQuizProgress() {
    setCurrentQuestionIndex(0);
    setCurrentAnswers([]);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: loginCode }),
      });

      if (!response.ok) {
        throw new Error("Код не найден или уже заменен.");
      }

      const payload = (await response.json()) as LoginResponse;
      window.localStorage.setItem(SESSION_TOKEN_KEY, payload.token);
      window.localStorage.setItem(SELECTED_EMPLOYEE_KEY, payload.employee.id);
      setSessionToken(payload.token);
      setLoginCode("");
      await loadBootstrap(payload.employee.id, payload.token);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Не удалось войти.");
    }
  }

  async function logout() {
    const token = sessionToken;
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    window.localStorage.removeItem(SELECTED_EMPLOYEE_KEY);
    setSessionToken("");
    setAppState(createInitialState());
    setLoading(false);
    resetQuizProgress();

    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-qwiz-session": token },
      }).catch(() => undefined);
    }
  }

  function chooseAnswer(answerIndex: number) {
    setCurrentAnswers((answers) => {
      const nextAnswers = answers.slice();
      nextAnswers[currentQuestionIndex] = answerIndex;
      return nextAnswers;
    });
  }

  function submitAnswer() {
    if (!quiz || currentAnswers[currentQuestionIndex] === undefined) {
      return;
    }

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1);
      return;
    }

    completeQuiz(quiz);
  }

  function completeQuiz(activeQuiz: Quiz) {
    if (!selectedEmployee) {
      return;
    }

    if (completion) {
      showToast("Квиз за сегодня уже закрыт.");
      return;
    }

    const result = calculateScore(activeQuiz, currentAnswers, selectedEmployee.streak);
    const nextCompletion: Completion = {
      quizId: activeQuiz.id,
      score: result.score,
      correct: result.correct,
      accuracy: result.accuracy,
      answers: currentAnswers.slice(),
      streakAfter: result.streakAfter,
      completedAt: new Date().toISOString(),
    };

    setAppState((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === selectedEmployee.id
          ? {
              ...employee,
              totalPoints: employee.totalPoints + result.score,
              weeklyPoints: employee.weeklyPoints + result.score,
              streak: result.streakAfter,
            }
          : employee,
      ),
      completions: {
        ...current.completions,
        [todayKey]: {
          ...(current.completions[todayKey] || {}),
          [selectedEmployee.id]: nextCompletion,
        },
      },
    }));

    resetQuizProgress();
    void syncAttempt(selectedEmployee.id, nextCompletion);
    showToast(`Начислено ${result.score} баллов: ${result.correct}/${activeQuiz.questions.length} правильных.`);
  }

  function handleWeeklyAward() {
    if (alreadyAwarded) {
      showToast("Выдача за эту неделю уже сформирована.");
      return;
    }

    const winners: WeeklyWinner[] = rankedEmployees.slice(0, 3).map((employee, index) => ({
      place: index + 1,
      employeeId: employee.id,
      name: employee.name,
      weeklyPoints: employee.weeklyPoints,
      prize: appState.prizePool[index]?.title || "Бонус",
    }));

    setAppState((current) => ({
      ...current,
      awardHistory: [
        ...current.awardHistory,
        {
          weekKey: weekStartKey,
          label: `Неделя с ${displayDate(weekStartKey, { day: "numeric", month: "long" })}`,
          winners,
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    void syncWeeklyAward(winners);
    showToast("Недельная выдача сформирована.");
  }

  async function syncAttempt(employeeId: string, attempt: Completion) {
    try {
      const response = await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { "x-qwiz-session": sessionToken } : {}),
        },
        body: JSON.stringify({
          employeeId,
          quizId: attempt.quizId,
          dateKey: todayKey,
          score: attempt.score,
          correct: attempt.correct,
          accuracy: attempt.accuracy,
          answers: attempt.answers,
          streakAfter: attempt.streakAfter,
        }),
      });
      const payload = await response.json();

      if (payload.duplicate) {
        showToast("Сегодняшняя попытка уже была сохранена.");
      }

      await loadBootstrap(employeeId, sessionToken);
    } catch (error) {
      console.warn("Attempt sync failed", error);
      showToast("Результат сохранен локально, синхронизация не прошла.");
    }
  }

  async function syncWeeklyAward(winners: WeeklyWinner[]) {
    try {
      await fetch("/api/weekly-awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekKey: weekStartKey, winners }),
      });
      await loadBootstrap(appState.selectedEmployeeId, sessionToken);
    } catch (error) {
      console.warn("Award sync failed", error);
      showToast("Выдача сохранена локально, синхронизация не прошла.");
    }
  }

  if (!sessionToken) {
    return (
      <main className="login-page">
        <section className="login-panel panel">
          <div className="brand login-brand">
            <div className="brand-mark" aria-hidden="true">
              Q
            </div>
            <div className="brand-copy">
              <span>Qwiz</span>
              <h1>Team League</h1>
            </div>
          </div>
          <div>
            <span className="section-kicker">Личный вход</span>
            <h2>Введите код сотрудника</h2>
          </div>
          <form className="login-form" onSubmit={login}>
            <input
              className="text-input login-code-input"
              inputMode="numeric"
              onChange={(event) => setLoginCode(event.target.value)}
              placeholder="6-значный код"
              value={loginCode}
            />
            <button className="primary-button" type="submit">
              Войти
            </button>
          </form>
          {loadError && <div className="alert-line">{loadError}</div>}
        </section>
      </main>
    );
  }

  if (!selectedEmployee) {
    return (
      <main className="empty-page">
        <div className="empty-state">Нет сотрудников для отображения.</div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            Q
          </div>
          <div className="brand-copy">
            <span>Qwiz</span>
            <h1>Team League</h1>
          </div>
        </div>

        <nav className="side-nav" aria-label="Разделы">
          {[
            ["daily-quiz", "День"],
            ["leaderboard", "Рейтинг"],
            ["weekly-prizes", "Призы"],
            ["activity", "Активность"],
          ].map(([id, label]) => (
            <button
              className="nav-button"
              key={id}
              type="button"
              onClick={() => document.querySelector(`#${id}`)?.scrollIntoView({ block: "start" })}
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="employee-panel" aria-labelledby="employee-title">
          <div className="section-kicker">Профиль</div>
          <h2 id="employee-title">Участник</h2>
          <div className="employee-card">
            <div className="employee-avatar" aria-hidden="true">
              {selectedEmployee.avatar}
            </div>
            <div>
              <strong>{selectedEmployee.name}</strong>
              <span>{selectedEmployee.role}</span>
            </div>
          </div>
        </section>

        <button className="ghost-button" type="button" onClick={() => void loadBootstrap(selectedEmployee.id)}>
          Обновить данные
        </button>
        <button className="ghost-button" type="button" onClick={() => void logout()}>
          Выйти
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="section-kicker">Внутренняя лига знаний</span>
            <h2>Ежедневные квизы и недельные бонусы</h2>
          </div>
          <div className="date-stack" aria-label="Текущая дата и неделя">
            <span>{displayDate(todayKey, { weekday: "long", day: "numeric", month: "long" })}</span>
            <strong>Неделя с {displayDate(weekStartKey, { day: "numeric", month: "long" })}</strong>
          </div>
        </header>

        {loadError && <div className="alert-line">{loadError}</div>}

        <section className="metrics-grid" aria-label="Показатели участника">
          <Metric label="Всего баллов" value={formatNumber(selectedEmployee.totalPoints)} />
          <Metric label="Баллы недели" value={formatNumber(selectedEmployee.weeklyPoints)} />
          <Metric label="Серия дней" value={String(selectedEmployee.streak)} />
          <Metric
            label="Команда сегодня"
            value={`${Math.round((todayCompletions.length / appState.employees.length) * 100)}%`}
          />
        </section>

        <div className="workspace-grid">
          <section id="daily-quiz" className="panel quiz-panel" aria-live="polite">
            {loading ? (
              <div className="empty-state">Загружаем квиз.</div>
            ) : !quiz ? (
              <div className="empty-state">На сегодня нет активного квиза.</div>
            ) : completion ? (
              <CompletedQuiz employeeName={selectedEmployee.name} completion={completion} quiz={quiz} />
            ) : (
              <ActiveQuiz
                answers={currentAnswers}
                currentQuestionIndex={currentQuestionIndex}
                onAnswer={chooseAnswer}
                onBack={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
                onSubmit={submitAnswer}
                quiz={quiz}
              />
            )}
          </section>

          <section id="leaderboard" className="panel leaderboard-panel" aria-labelledby="leaderboard-title">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Текущая неделя</span>
                <h2 id="leaderboard-title">Рейтинг</h2>
              </div>
              <span className="status-pill waiting">{dataSource === "supabase" ? "Supabase" : "Локально"}</span>
            </div>
            <div className="leaderboard-list">
              {rankedEmployees.map((employee, index) => {
                const width = Math.max(6, Math.round((employee.weeklyPoints / maxWeeklyPoints) * 100));
                return (
                  <button
                    className={`rank-row${employee.id === selectedEmployee.id ? " is-selected" : ""}`}
                    key={employee.id}
                    type="button"
                    onClick={() =>
                      employee.id === selectedEmployee.id
                        ? undefined
                        : showToast("Личный вход закреплен за вашим профилем.")
                    }
                  >
                    <span className="rank-place">{index + 1}</span>
                    <span className="rank-avatar">{employee.avatar}</span>
                    <span className="rank-person">
                      <strong>{employee.name}</strong>
                      <span>
                        {employee.role} · серия {employee.streak}
                      </span>
                    </span>
                    <span className="rank-score">
                      <strong>{formatNumber(employee.weeklyPoints)}</strong>
                      <span>баллов</span>
                    </span>
                    <span className="rank-meter" aria-hidden="true">
                      <span style={{ width: `${width}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section id="weekly-prizes" className="panel prize-panel" aria-labelledby="prize-title">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Бонусный фонд</span>
                <h2 id="prize-title">Призы недели</h2>
              </div>
              <button className="primary-button compact" type="button" disabled={alreadyAwarded} onClick={handleWeeklyAward}>
                Сформировать выдачу
              </button>
            </div>
            <div className="prize-list">
              {appState.prizePool.map((prize) => (
                <div className="prize-row" key={prize.place}>
                  <span className="prize-place">{prize.place}</span>
                  <span>
                    <strong>{prize.title}</strong>
                    <span>{prize.detail}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="history-block">
              <h3>История выдач</h3>
              <div className="history-list">
                {appState.awardHistory.length === 0 ? (
                  <div className="empty-state">Выдач пока нет.</div>
                ) : (
                  appState.awardHistory
                    .slice()
                    .reverse()
                    .map((award) => (
                      <div className="history-row" key={award.weekKey}>
                        <strong>{award.label}</strong>
                        <span>
                          {award.winners
                            .map((winner) => `${winner.place}. ${winner.name} (${formatNumber(winner.weeklyPoints)})`)
                            .join(" · ")}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </section>

          <section id="activity" className="panel activity-panel" aria-labelledby="activity-title">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Сегодня</span>
                <h2 id="activity-title">Активность команды</h2>
              </div>
            </div>
            <div className="activity-list">
              {appState.employees.map((employee) => {
                const employeeCompletion = appState.completions[todayKey]?.[employee.id];
                return (
                  <div className="activity-row" key={employee.id}>
                    <span className="activity-avatar">{employee.avatar}</span>
                    <span className="activity-person">
                      <strong>{employee.name}</strong>
                      <span>{employee.role}</span>
                    </span>
                    {employeeCompletion ? (
                      <span className="status-pill done">+{employeeCompletion.score}</span>
                    ) : (
                      <span className="status-pill waiting">Ожидает</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <div className={`toast${toast.visible ? " is-visible" : ""}`} role="status" aria-live="polite">
        {toast.message}
      </div>
    </div>
  );
}

function ActiveQuiz({
  answers,
  currentQuestionIndex,
  onAnswer,
  onBack,
  onSubmit,
  quiz,
}: {
  answers: number[];
  currentQuestionIndex: number;
  onAnswer: (answerIndex: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  quiz: Quiz;
}) {
  const question = quiz.questions[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestionIndex];
  const progress = Math.round((currentQuestionIndex / quiz.questions.length) * 100);
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  return (
    <>
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Ежедневный квиз</span>
          <h2>{quiz.title}</h2>
        </div>
      </div>
      <div className="quiz-meta">
        <span className="pill">{quiz.category}</span>
        <span className="pill">{quiz.questions.length} вопросов</span>
        <span className="pill">до {quiz.questions.length * 12 + 32} баллов</span>
      </div>
      <div className="progress-track" aria-label="Прогресс квиза">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="question-box">
        <span className="question-number">
          Вопрос {currentQuestionIndex + 1} из {quiz.questions.length}
        </span>
        <h3>{question.text}</h3>
        <div className="option-list" role="radiogroup" aria-label="Варианты ответа">
          {question.options.map((option, index) => (
            <button
              className={`option-button${selectedAnswer === index ? " is-selected" : ""}`}
              key={option}
              type="button"
              aria-pressed={selectedAnswer === index}
              onClick={() => onAnswer(index)}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="panel-actions">
        <button className="secondary-button" type="button" disabled={currentQuestionIndex === 0} onClick={onBack}>
          Назад
        </button>
        <button className="primary-button" type="button" disabled={selectedAnswer === undefined} onClick={onSubmit}>
          {isLastQuestion ? "Завершить" : "Дальше"}
        </button>
      </div>
    </>
  );
}

function CompletedQuiz({ employeeName, completion, quiz }: { employeeName: string; completion: Completion; quiz: Quiz }) {
  return (
    <>
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Ежедневный квиз</span>
          <h2>Сегодня закрыто</h2>
        </div>
      </div>
      <div className="result-card">
        <div className="result-score">
          <div>
            <div className="score-number">+{completion.score}</div>
            <div className="score-label">баллов за день</div>
          </div>
          <p className="result-copy">{employeeName} закрепляет серию и остается в недельном рейтинге.</p>
        </div>
        <div className="result-stats">
          <div className="result-stat">
            <span>Правильных</span>
            <strong>
              {completion.correct}/{quiz.questions.length}
            </strong>
          </div>
          <div className="result-stat">
            <span>Точность</span>
            <strong>{completion.accuracy}%</strong>
          </div>
          <div className="result-stat">
            <span>Серия</span>
            <strong>{completion.streakAfter}</strong>
          </div>
        </div>
        <div className="review-list">
          {quiz.questions.map((question, index) => {
            const selected = completion.answers[index];
            const isCorrect = selected === question.correct;
            return (
              <div className={`review-item ${isCorrect ? "is-correct" : "is-wrong"}`} key={question.text}>
                <strong>{question.text}</strong>
                <span className="review-answer">Ваш ответ: {question.options[selected] || "нет ответа"}</span>
                {!isCorrect && <span className="review-answer">Правильно: {question.options[question.correct]}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
