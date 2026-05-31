import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppState, Employee, Prize, Quiz, createInitialState, formatNumber } from "../../lib/qwizData";
import type { RecentAttempt } from "../../lib/qwizSupabase";

type AdminSummary = {
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
};

type EmployeeForm = {
  id: string;
  name: string;
  role: string;
  avatar: string;
};

type PrizeForm = {
  place: number;
  title: string;
  detail: string;
};

type QuizForm = {
  id: string;
  title: string;
  category: string;
  questions: Array<{
    text: string;
    options: string[];
    correct: number;
  }>;
};

const emptyQuestion = {
  text: "",
  options: ["", "", "", ""],
  correct: 0,
};

export default function AdminPage() {
  const [summary, setSummary] = useState<AdminSummary>({
    state: createInitialState(),
    stats: {
      employees: 0,
      quizzes: 0,
      questions: 0,
      attemptsToday: 0,
      weeklyAwards: 0,
      totalPoints: 0,
    },
    recentAttempts: [],
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [adminPin, setAdminPin] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem("qwiz-admin-pin") || "",
  );
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>({ id: "", name: "", role: "", avatar: "" });
  const [prizeForm, setPrizeForm] = useState<PrizeForm>({ place: 1, title: "", detail: "" });
  const [quizForm, setQuizForm] = useState<QuizForm>({
    id: "",
    title: "",
    category: "",
    questions: [{ ...emptyQuestion }, { ...emptyQuestion }, { ...emptyQuestion }],
  });

  const rankedEmployees = useMemo(
    () =>
      summary.state.employees.slice().sort((a, b) => {
        if (b.weeklyPoints !== a.weeklyPoints) {
          return b.weeklyPoints - a.weeklyPoints;
        }
        return b.totalPoints - a.totalPoints;
      }),
    [summary.state.employees],
  );

  useEffect(() => {
    void loadSummary(adminPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSummary(pin = adminPin) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/bootstrap", {
        headers: pin ? { "x-admin-pin": pin } : {},
      });

      if (!response.ok) {
        throw new Error(response.status === 401 ? "Неверный PIN администратора." : "Не удалось загрузить админку.");
      }

      setSummary((await response.json()) as AdminSummary);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить админку.");
    } finally {
      setLoading(false);
    }
  }

  async function postAdmin(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminPin ? { "x-admin-pin": adminPin } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || payload.error || "Запрос не выполнен.");
    }
  }

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await postAdmin("/api/admin/employees", employeeForm);
      setEmployeeForm({ id: "", name: "", role: "", avatar: "" });
      setMessage("Сотрудник сохранен.");
      await loadSummary();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить сотрудника.");
    }
  }

  async function submitPrize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await postAdmin("/api/admin/prizes", prizeForm);
      setPrizeForm({ place: 1, title: "", detail: "" });
      setMessage("Приз сохранен.");
      await loadSummary();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить приз.");
    }
  }

  async function submitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await postAdmin("/api/admin/quizzes", quizForm);
      setQuizForm({
        id: "",
        title: "",
        category: "",
        questions: [{ ...emptyQuestion }, { ...emptyQuestion }, { ...emptyQuestion }],
      });
      setMessage("Квиз сохранен.");
      await loadSummary();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить квиз.");
    }
  }

  function savePin() {
    window.localStorage.setItem("qwiz-admin-pin", adminPin);
    void loadSummary(adminPin);
  }

  function editEmployee(employee: Employee) {
    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      avatar: employee.avatar,
    });
  }

  function editPrize(prize: Prize) {
    setPrizeForm(prize);
  }

  function editQuiz(quiz: Quiz) {
    setQuizForm({
      id: quiz.id,
      title: quiz.title,
      category: quiz.category,
      questions: quiz.questions.map((question) => ({
        text: question.text,
        options: question.options.slice(),
        correct: question.correct,
      })),
    });
  }

  function updateQuizQuestion(questionIndex: number, patch: Partial<QuizForm["questions"][number]>) {
    setQuizForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, ...patch } : question,
      ),
    }));
  }

  function updateQuizOption(questionIndex: number, optionIndex: number, value: string) {
    setQuizForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? value : option,
              ),
            }
          : question,
      ),
    }));
  }

  return (
    <main className="main-content admin-main">
      <header className="topbar">
        <div>
          <span className="section-kicker">Qwiz Admin</span>
          <h2>Управление квизами и рейтингом</h2>
        </div>
        <div className="admin-actions">
          <input
            aria-label="PIN администратора"
            className="text-input compact-input"
            onChange={(event) => setAdminPin(event.target.value)}
            placeholder="PIN"
            type="password"
            value={adminPin}
          />
          <button className="secondary-button compact" onClick={savePin} type="button">
            Войти
          </button>
          <button className="primary-button compact" onClick={() => void loadSummary()} type="button">
            Обновить
          </button>
        </div>
      </header>

      {message && <div className="alert-line">{message}</div>}

      <section className="metrics-grid" aria-label="Административные показатели">
        <Metric label="Сотрудники" value={String(summary.stats.employees)} />
        <Metric label="Активные квизы" value={String(summary.stats.quizzes)} />
        <Metric label="Вопросы" value={String(summary.stats.questions)} />
        <Metric label="Попытки сегодня" value={String(summary.stats.attemptsToday)} />
      </section>

      <div className="admin-grid">
        <section className="panel admin-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Команда</span>
              <h2>Сотрудники</h2>
            </div>
          </div>
          <form className="admin-form" onSubmit={submitEmployee}>
            <div className="form-row">
              <label>
                ID
                <input
                  className="text-input"
                  onChange={(event) => setEmployeeForm((current) => ({ ...current, id: event.target.value }))}
                  value={employeeForm.id}
                />
              </label>
              <label>
                Имя
                <input
                  className="text-input"
                  onChange={(event) => setEmployeeForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  value={employeeForm.name}
                />
              </label>
              <label>
                Роль
                <input
                  className="text-input"
                  onChange={(event) => setEmployeeForm((current) => ({ ...current, role: event.target.value }))}
                  required
                  value={employeeForm.role}
                />
              </label>
              <label>
                Аватар
                <input
                  className="text-input"
                  onChange={(event) => setEmployeeForm((current) => ({ ...current, avatar: event.target.value }))}
                  value={employeeForm.avatar}
                />
              </label>
            </div>
            <button className="primary-button compact" type="submit">
              Сохранить сотрудника
            </button>
          </form>

          <div className="admin-list">
            {rankedEmployees.map((employee, index) => (
              <button className="admin-row" key={employee.id} onClick={() => editEmployee(employee)} type="button">
                <span className="rank-place">{index + 1}</span>
                <span className="rank-avatar">{employee.avatar}</span>
                <span>
                  <strong>{employee.name}</strong>
                  <span>{employee.role}</span>
                </span>
                <span className="rank-score">
                  <strong>{formatNumber(employee.weeklyPoints)}</strong>
                  <span>неделя</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel admin-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Бонусы</span>
              <h2>Призы</h2>
            </div>
          </div>
          <form className="admin-form" onSubmit={submitPrize}>
            <div className="form-row">
              <label>
                Место
                <input
                  className="text-input"
                  min={1}
                  onChange={(event) => setPrizeForm((current) => ({ ...current, place: Number(event.target.value) }))}
                  required
                  type="number"
                  value={prizeForm.place}
                />
              </label>
              <label>
                Приз
                <input
                  className="text-input"
                  onChange={(event) => setPrizeForm((current) => ({ ...current, title: event.target.value }))}
                  required
                  value={prizeForm.title}
                />
              </label>
              <label>
                Детали
                <input
                  className="text-input"
                  onChange={(event) => setPrizeForm((current) => ({ ...current, detail: event.target.value }))}
                  required
                  value={prizeForm.detail}
                />
              </label>
            </div>
            <button className="primary-button compact" type="submit">
              Сохранить приз
            </button>
          </form>

          <div className="admin-list">
            {summary.state.prizePool.map((prize) => (
              <button className="admin-row prize-admin-row" key={prize.place} onClick={() => editPrize(prize)} type="button">
                <span className="prize-place">{prize.place}</span>
                <span>
                  <strong>{prize.title}</strong>
                  <span>{prize.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel admin-panel wide-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Контент</span>
              <h2>Квизы</h2>
            </div>
            <button
              className="secondary-button compact"
              onClick={() =>
                setQuizForm((current) => ({
                  ...current,
                  questions: [...current.questions, { ...emptyQuestion, options: emptyQuestion.options.slice() }],
                }))
              }
              type="button"
            >
              Добавить вопрос
            </button>
          </div>

          <form className="admin-form" onSubmit={submitQuiz}>
            <div className="form-row">
              <label>
                ID
                <input
                  className="text-input"
                  onChange={(event) => setQuizForm((current) => ({ ...current, id: event.target.value }))}
                  value={quizForm.id}
                />
              </label>
              <label>
                Название
                <input
                  className="text-input"
                  onChange={(event) => setQuizForm((current) => ({ ...current, title: event.target.value }))}
                  required
                  value={quizForm.title}
                />
              </label>
              <label>
                Категория
                <input
                  className="text-input"
                  onChange={(event) => setQuizForm((current) => ({ ...current, category: event.target.value }))}
                  required
                  value={quizForm.category}
                />
              </label>
            </div>

            <div className="question-admin-list">
              {quizForm.questions.map((question, questionIndex) => (
                <div className="question-admin-item" key={questionIndex}>
                  <label>
                    Вопрос {questionIndex + 1}
                    <input
                      className="text-input"
                      onChange={(event) => updateQuizQuestion(questionIndex, { text: event.target.value })}
                      required
                      value={question.text}
                    />
                  </label>
                  <div className="option-admin-grid">
                    {question.options.map((option, optionIndex) => (
                      <label key={optionIndex}>
                        {String.fromCharCode(65 + optionIndex)}
                        <input
                          className="text-input"
                          onChange={(event) => updateQuizOption(questionIndex, optionIndex, event.target.value)}
                          required
                          value={option}
                        />
                      </label>
                    ))}
                    <label>
                      Верный
                      <select
                        className="text-input"
                        onChange={(event) => updateQuizQuestion(questionIndex, { correct: Number(event.target.value) })}
                        value={question.correct}
                      >
                        {question.options.map((_, optionIndex) => (
                          <option key={optionIndex} value={optionIndex}>
                            {String.fromCharCode(65 + optionIndex)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button className="primary-button compact" type="submit">
              Сохранить квиз
            </button>
          </form>

          <div className="quiz-admin-list">
            {summary.state.quizzes.map((quiz) => (
              <button className="quiz-admin-row" key={quiz.id} onClick={() => editQuiz(quiz)} type="button">
                <span>
                  <strong>{quiz.title}</strong>
                  <span>
                    {quiz.category} · {quiz.questions.length} вопросов
                  </span>
                </span>
                <span className="status-pill waiting">{quiz.id}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel admin-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Журнал</span>
              <h2>Последние попытки</h2>
            </div>
          </div>
          <div className="history-list">
            {loading ? (
              <div className="empty-state">Загрузка.</div>
            ) : summary.recentAttempts.length === 0 ? (
              <div className="empty-state">Попыток пока нет.</div>
            ) : (
              summary.recentAttempts.map((attempt) => (
                <div className="history-row" key={`${attempt.employeeId}-${attempt.createdAt}`}>
                  <strong>{attempt.employeeName}</strong>
                  <span>
                    {attempt.quizTitle} · +{attempt.score} · {attempt.accuracy}%
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
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
