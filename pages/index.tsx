import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AppState,
  createInitialState,
  displayDate,
  formatNumber,
  getTodayKey,
  getWeekStartKey,
} from "../lib/qwizData";
import {
  DailyMission,
  GameProfile,
  GearSlot,
  MobEncounter,
  ProfessionId,
  changeProfession,
  completeMission,
  contributeToBattle,
  createGameProfile,
  dailyMissions,
  fightMob,
  getPower,
  getProfession,
  mobEncounters,
  professions,
  refreshDailyProfile,
  resourceLabels,
  upgradeGear,
} from "../lib/companyGame";

const SELECTED_EMPLOYEE_KEY = "qwiz-selected-employee-id";
const SESSION_TOKEN_KEY = "qwiz-session-token";
const GAME_STORAGE_PREFIX = "qwiz-company-game:";

type GameSectionId = "hero" | "missions" | "craft" | "battle";

const gameSections: Array<{ id: GameSectionId; label: string }> = [
  { id: "hero", label: "Герой" },
  { id: "missions", label: "Задания" },
  { id: "craft", label: "Крафт" },
  { id: "battle", label: "Битва" },
];

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
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [activeSection, setActiveSection] = useState<GameSectionId>("hero");
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });

  const todayKey = useMemo(() => getTodayKey(), []);
  const weekStartKey = useMemo(() => getWeekStartKey(todayKey), [todayKey]);
  const selectedEmployee =
    appState.employees.find((employee) => employee.id === appState.selectedEmployeeId) || appState.employees[0];
  const rankedEmployees = appState.employees.slice().sort((a, b) => {
    if (b.weeklyPoints !== a.weeklyPoints) {
      return b.weeklyPoints - a.weeklyPoints;
    }
    return b.totalPoints - a.totalPoints;
  });

  const profession = profile ? getProfession(profile.professionId) : professions[0];
  const heroPower = profile ? getPower(profile) : 0;
  const monthlyReadiness = profile
    ? Math.min(100, Math.round(((profile.battleContribution + rankedEmployees.length * 8) / 140) * 100))
    : 0;
  const totalResources = profile
    ? Object.values(profile.resources).reduce((total, amount) => total + amount, 0)
    : 0;

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
    if (!selectedEmployee || !sessionToken) {
      return;
    }

    const timer = window.setTimeout(() => {
      const storageKey = `${GAME_STORAGE_PREFIX}${selectedEmployee.id}`;
      try {
        const savedProfile = window.localStorage.getItem(storageKey);
        const parsed = savedProfile ? (JSON.parse(savedProfile) as GameProfile) : null;
        setProfile(
          parsed?.employeeId === selectedEmployee.id
            ? refreshDailyProfile(parsed, todayKey)
            : createGameProfile(selectedEmployee.id, todayKey),
        );
      } catch {
        setProfile(createGameProfile(selectedEmployee.id, todayKey));
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedEmployee, sessionToken, todayKey]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    window.localStorage.setItem(`${GAME_STORAGE_PREFIX}${profile.employeeId}`, JSON.stringify(profile));
  }, [profile]);

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

  function openSection(sectionId: GameSectionId) {
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setProfile(null);
    setLoading(false);

    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-qwiz-session": token },
      }).catch(() => undefined);
    }
  }

  function updateProfile(nextProfile: GameProfile, message: string) {
    setProfile(nextProfile);
    showToast(message);
  }

  function runMission(mission: DailyMission) {
    if (!profile) {
      return;
    }

    const nextProfile = completeMission(profile, mission);
    updateProfile(nextProfile, nextProfile === profile ? "Задание недоступно." : `Задание закрыто: ${mission.title}.`);
  }

  function runEncounter(mob: MobEncounter) {
    if (!profile) {
      return;
    }

    const beforeDefeated = profile.defeatedMobs.length;
    const nextProfile = fightMob(profile, mob);
    updateProfile(
      nextProfile,
      nextProfile.defeatedMobs.length > beforeDefeated ? `Победа: ${mob.name}.` : "Нужно больше силы.",
    );
  }

  function runUpgrade(slot: GearSlot) {
    if (!profile) {
      return;
    }

    const nextProfile = upgradeGear(profile, slot);
    updateProfile(nextProfile, nextProfile === profile ? "Не хватает ресурсов." : "Экипировка улучшена.");
  }

  function runBattleContribution() {
    if (!profile) {
      return;
    }

    const nextProfile = contributeToBattle(profile);
    updateProfile(nextProfile, nextProfile === profile ? "Нужны провиант и эфир." : "Вклад в битву внесен.");
  }

  function runProfessionChange(professionId: ProfessionId) {
    if (!profile) {
      return;
    }

    updateProfile(changeProfession(profile, professionId), "Профессия обновлена.");
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
              <span>GuildOps</span>
              <h1>Corporate League</h1>
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

  if (!selectedEmployee || !profile) {
    return (
      <main className="empty-page">
        <div className="empty-state">{loading ? "Загружаем героя." : "Нет сотрудника для отображения."}</div>
      </main>
    );
  }

  return (
    <div className="app-shell game-shell">
      <aside className="sidebar game-sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            G
          </div>
          <div className="brand-copy">
            <span>GuildOps</span>
            <h1>Corporate League</h1>
          </div>
        </div>

        <nav className="side-nav" aria-label="Разделы">
          {gameSections.map(({ id, label }) => (
            <button
              className={`nav-button${activeSection === id ? " is-active" : ""}`}
              key={id}
              type="button"
              onClick={() => openSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="employee-panel" aria-labelledby="employee-title">
          <div className="section-kicker">Герой</div>
          <h2 id="employee-title">{selectedEmployee.name}</h2>
          <div className="employee-card">
            <div className="employee-avatar" aria-hidden="true">
              {profession.crest}
            </div>
            <div>
              <strong>{profession.name}</strong>
              <span>{profession.role}</span>
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

      <main className="main-content game-main">
        <header className="topbar game-topbar">
          <div>
            <span className="section-kicker">Корпоративная action-RPG</span>
            <h2>Профессии, рейды, крафт и месячная битва</h2>
          </div>
          <div className="date-stack" aria-label="Текущая дата и неделя">
            <span>{displayDate(todayKey, { weekday: "long", day: "numeric", month: "long" })}</span>
            <strong>Сезон недели с {displayDate(weekStartKey, { day: "numeric", month: "long" })}</strong>
          </div>
        </header>

        {loadError && <div className="alert-line">{loadError}</div>}

        <section className="metrics-grid game-metrics" aria-label="Показатели героя">
          <Metric label="Сила героя" value={formatNumber(heroPower)} />
          <Metric label="Уровень" value={String(profile.level)} />
          <Metric label="Энергия" value={`${profile.energy}/4`} />
          <Metric label="Готовность" value={`${monthlyReadiness}%`} />
        </section>

        <div className="game-layout">
          <section className={`panel game-panel mobile-section${activeSection === "hero" ? " is-active" : ""}`}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Профессии</span>
                <h2>Выбор роли</h2>
              </div>
              <span className="status-pill waiting">{dataSource === "supabase" ? "Команда онлайн" : "Локально"}</span>
            </div>
            <div className="profession-grid">
              {professions.map((item) => (
                <button
                  className={`profession-card${profile.professionId === item.id ? " is-selected" : ""}`}
                  key={item.id}
                  onClick={() => runProfessionChange(item.id)}
                  type="button"
                >
                  <span className="profession-crest">{item.crest}</span>
                  <span>
                    <strong>{item.name}</strong>
                    <span>{item.function}</span>
                  </span>
                  <small>{item.bonus}</small>
                </button>
              ))}
            </div>
            <div className="resource-grid">
              {(Object.keys(resourceLabels) as Array<keyof typeof resourceLabels>).map((resource) => (
                <div className="resource-card" key={resource}>
                  <span>{resourceLabels[resource]}</span>
                  <strong>{profile.resources[resource]}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={`panel game-panel mobile-section${activeSection === "missions" ? " is-active" : ""}`}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Ежедневные задания</span>
                <h2>Усиление через активность</h2>
              </div>
              <span className="status-pill waiting">Ресурсов: {totalResources}</span>
            </div>
            <div className="mission-grid">
              {dailyMissions.map((mission) => {
                const completed = profile.completedMissions.includes(mission.id);
                return (
                  <article className={`mission-card${completed ? " is-complete" : ""}`} key={mission.id}>
                    <div>
                      <span className="section-kicker">{mission.type}</span>
                      <h3>{mission.title}</h3>
                      <p>{mission.description}</p>
                    </div>
                    <RewardLine rewards={mission.rewards} />
                    <button
                      className="primary-button compact"
                      disabled={completed || profile.energy <= 0}
                      onClick={() => runMission(mission)}
                      type="button"
                    >
                      {completed ? "Выполнено" : "Пройти"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={`panel game-panel mobile-section${activeSection === "craft" ? " is-active" : ""}`}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Крафт</span>
                <h2>Оружие и броня</h2>
              </div>
              <span className="status-pill done">3 уровня</span>
            </div>
            <div className="gear-grid">
              <GearCard
                level={profile.gear.weapon}
                onUpgrade={() => runUpgrade("weapon")}
                title="Оружие"
                subtitle="Влияет на рейды и силу героя"
              />
              <GearCard
                level={profile.gear.armor}
                onUpgrade={() => runUpgrade("armor")}
                title="Броня"
                subtitle="Повышает устойчивость в месячной битве"
              />
            </div>
            <div className="mob-list">
              {mobEncounters.map((mob) => {
                const defeated = profile.defeatedMobs.includes(mob.id);
                return (
                  <div className={`mob-row${defeated ? " is-defeated" : ""}`} key={mob.id}>
                    <span className="mob-threat">{mob.threat}</span>
                    <span>
                      <strong>{mob.name}</strong>
                      <span>Слабость: {getProfession(mob.weakness).name}</span>
                    </span>
                    <button
                      className="secondary-button compact"
                      disabled={defeated || profile.energy <= 0}
                      onClick={() => runEncounter(mob)}
                      type="button"
                    >
                      {defeated ? "Победа" : "Рейд"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`panel game-panel battle-panel mobile-section${activeSection === "battle" ? " is-active" : ""}`}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Событие месяца</span>
                <h2>Битва команд</h2>
              </div>
              <span className="status-pill waiting">{monthlyReadiness}% готовности</span>
            </div>
            <div className="battle-map" aria-hidden="true">
              <svg viewBox="0 0 420 180" role="img">
                <path d="M32 126 C118 36 210 166 312 58 C350 22 380 34 398 48" />
                <circle cx="62" cy="104" r="24" />
                <circle cx="204" cy="110" r="30" />
                <circle cx="340" cy="62" r="26" />
              </svg>
              <div className="battle-readiness" style={{ width: `${monthlyReadiness}%` }} />
            </div>
            <div className="battle-actions">
              <button className="primary-button" onClick={runBattleContribution} type="button">
                Внести вклад
              </button>
              <span>Требуется: 1 провиант и 1 эфир</span>
            </div>
            <div className="team-list">
              {rankedEmployees.slice(0, 6).map((employee, index) => (
                <div className="team-row" key={employee.id}>
                  <span className="rank-place">{index + 1}</span>
                  <span>
                    <strong>{employee.name}</strong>
                    <span>{employee.role}</span>
                  </span>
                  <span className="rank-score">{formatNumber(employee.weeklyPoints)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel game-log-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Журнал</span>
              <h2>Последние действия</h2>
            </div>
          </div>
          <div className="history-list">
            {profile.log.map((item, index) => (
              <div className="history-row" key={`${item}-${index}`}>
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className="mobile-tabbar" aria-label="Разделы игры">
        {gameSections.map((section) => (
          <button
            className={`mobile-tab${activeSection === section.id ? " is-active" : ""}`}
            key={section.id}
            onClick={() => openSection(section.id)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className={`toast${toast.visible ? " is-visible" : ""}`} role="status" aria-live="polite">
        {toast.message}
      </div>
    </div>
  );
}

function RewardLine({ rewards }: { rewards: Partial<Record<keyof typeof resourceLabels, number>> }) {
  return (
    <div className="reward-line">
      {(Object.entries(rewards) as Array<[keyof typeof resourceLabels, number]>).map(([resource, amount]) => (
        <span key={resource}>
          +{amount} {resourceLabels[resource]}
        </span>
      ))}
    </div>
  );
}

function GearCard({
  level,
  onUpgrade,
  subtitle,
  title,
}: {
  level: number;
  onUpgrade: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <article className="gear-card">
      <div>
        <span className="section-kicker">{subtitle}</span>
        <h3>{title}</h3>
      </div>
      <div className="gear-levels" aria-label={`${title}, уровень ${level}`}>
        {[1, 2, 3].map((tier) => (
          <span className={tier <= level ? "is-active" : ""} key={tier}>
            {tier}
          </span>
        ))}
      </div>
      <button className="secondary-button compact" disabled={level >= 3} onClick={onUpgrade} type="button">
        {level >= 3 ? "Максимум" : "Улучшить"}
      </button>
    </article>
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
