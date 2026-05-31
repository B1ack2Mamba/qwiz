import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  Completion,
  WeeklyWinner,
  calculateScore,
  createInitialState,
  displayDate,
  formatNumber,
  getTodayKey,
  getTodayQuiz,
  getWeekStartKey,
} from "../lib/qwizData";

const STORAGE_KEY = "qwiz-team-league-state-v2";

type ToastState = {
  message: string;
  visible: boolean;
};

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState<number[]>([]);
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });

  const todayKey = useMemo(() => getTodayKey(), []);
  const weekStartKey = useMemo(() => getWeekStartKey(todayKey), [todayKey]);
  const quiz = useMemo(() => getTodayQuiz(todayKey), [todayKey]);
  const selectedEmployee =
    appState.employees.find((employee) => employee.id === appState.selectedEmployeeId) || appState.employees[0];
  const completion = appState.completions[todayKey]?.[selectedEmployee.id] || null;
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
    const storedState = window.localStorage.getItem(STORAGE_KEY);
    if (storedState) {
      try {
        setAppState({ ...createInitialState(), ...JSON.parse(storedState) });
      } catch (error) {
        console.warn("Cannot read stored Qwiz state", error);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }
  }, [appState, hydrated]);

  useEffect(() => {
    if (!toast.visible) {
      return;
    }

    const timer = window.setTimeout(() => setToast((current) => ({ ...current, visible: false })), 2600);
    return () => window.clearTimeout(timer);
  }, [toast.visible]);

  function showToast(message: string) {
    setToast({ message, visible: true });
  }

  function resetQuizProgress() {
    setCurrentQuestionIndex(0);
    setCurrentAnswers([]);
  }

  function selectEmployee(employeeId: string) {
    setAppState((current) => ({ ...current, selectedEmployeeId: employeeId }));
    resetQuizProgress();
  }

  function chooseAnswer(answerIndex: number) {
    setCurrentAnswers((answers) => {
      const nextAnswers = answers.slice();
      nextAnswers[currentQuestionIndex] = answerIndex;
      return nextAnswers;
    });
  }

  function submitAnswer() {
    if (currentAnswers[currentQuestionIndex] === undefined) {
      return;
    }

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1);
      return;
    }

    completeQuiz();
  }

  function completeQuiz() {
    if (completion) {
      showToast("Квиз за сегодня уже закрыт.");
      return;
    }

    const result = calculateScore(quiz, currentAnswers, selectedEmployee.streak);
    const nextCompletion: Completion = {
      quizId: quiz.id,
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
    syncAttempt(selectedEmployee.id, nextCompletion);
    showToast(`Начислено ${result.score} баллов: ${result.correct}/${quiz.questions.length} правильных.`);
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

    syncWeeklyAward(winners);
    showToast("Недельная выдача сформирована.");
  }

  function resetDemo() {
    const confirmed = window.confirm("Сбросить демо-данные Qwiz?");
    if (!confirmed) {
      return;
    }

    setAppState(createInitialState());
    resetQuizProgress();
    showToast("Демо-данные сброшены.");
  }

  async function syncAttempt(employeeId: string, attempt: Completion) {
    try {
      await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (error) {
      console.warn("Attempt sync failed", error);
    }
  }

  async function syncWeeklyAward(winners: WeeklyWinner[]) {
    try {
      await fetch("/api/weekly-awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekKey: weekStartKey, winners }),
      });
    } catch (error) {
      console.warn("Award sync failed", error);
    }
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
          <label className="select-label" htmlFor="employeeSelect">
            Сотрудник
          </label>
          <select
            id="employeeSelect"
            className="employee-select"
            value={selectedEmployee.id}
            onChange={(event) => selectEmployee(event.target.value)}
          >
            {appState.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
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

        <button className="ghost-button" type="button" onClick={resetDemo}>
          Сбросить демо
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
            {completion ? (
              <CompletedQuiz employeeName={selectedEmployee.name} completion={completion} />
            ) : (
              <ActiveQuiz
                answers={currentAnswers}
                currentQuestionIndex={currentQuestionIndex}
                onAnswer={chooseAnswer}
                onBack={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
                onSubmit={submitAnswer}
              />
            )}
          </section>

          <section id="leaderboard" className="panel leaderboard-panel" aria-labelledby="leaderboard-title">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Текущая неделя</span>
                <h2 id="leaderboard-title">Рейтинг</h2>
              </div>
            </div>
            <div className="leaderboard-list">
              {rankedEmployees.map((employee, index) => {
                const width = Math.max(6, Math.round((employee.weeklyPoints / maxWeeklyPoints) * 100));
                return (
                  <button
                    className={`rank-row${employee.id === selectedEmployee.id ? " is-selected" : ""}`}
                    key={employee.id}
                    type="button"
                    onClick={() => selectEmployee(employee.id)}
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

  function ActiveQuiz({
    answers,
    currentQuestionIndex,
    onAnswer,
    onBack,
    onSubmit,
  }: {
    answers: number[];
    currentQuestionIndex: number;
    onAnswer: (answerIndex: number) => void;
    onBack: () => void;
    onSubmit: () => void;
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

  function CompletedQuiz({ employeeName, completion }: { employeeName: string; completion: Completion }) {
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
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
