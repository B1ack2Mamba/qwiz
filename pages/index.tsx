import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ProfessionAvatar3D,
  WeaponPreview3D,
  enhancementWeaponNames,
  getWeaponStageLabel,
  professionWeaponEnhancement,
} from "../components/ProfessionAvatar3D";
import { CombatTrainingArena } from "../components/CombatTrainingArena";
import { CharacterSpritePreview, hasCharacterSprite } from "../components/CharacterSpritePreview";
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
  Dungeon,
  Enhancement,
  EnhancementId,
  CombatTrainingRewardRank,
  GameProfile,
  ProfessionId,
  TeamDirectiveId,
  canEnterDungeon,
  canForgeEnhancement,
  changeProfession,
  claimCombatTrainingReward,
  completeMission,
  contributeToBattle,
  createGameProfile,
  dailyMissions,
  dungeons,
  enterDungeon,
  enhancements,
  forgeEnhancement,
  getDungeonPower,
  getEnhancement,
  getEnhancementCost,
  getProfessionChangeCost,
  getProfessionChangeMode,
  getProfessionSeason,
  getTeamDirective,
  getPower,
  getProfession,
  professions,
  refreshDailyProfile,
  resourceLabels,
  setTeamDirective,
  teamDirectives,
} from "../lib/companyGame";

const SELECTED_EMPLOYEE_KEY = "qwiz-selected-employee-id";
const SESSION_TOKEN_KEY = "qwiz-session-token";
const GAME_STORAGE_PREFIX = "qwiz-company-game:";

type GameSectionId = "hero" | "missions" | "craft" | "battle";

const gameSections: Array<{ id: GameSectionId; label: string }> = [
  { id: "hero", label: "Герой" },
  { id: "missions", label: "Задания" },
  { id: "craft", label: "Усиления" },
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
  const activeDirective = profile ? getTeamDirective(profile.teamDirectiveId) : teamDirectives[0];
  const professionSeason = profile ? getProfessionSeason(profile.dayKey) : null;
  const freeProfessionChangeAvailable =
    profile && professionSeason ? profile.professionChangeSeasonKey !== professionSeason.key : false;
  const heroPower = profile ? getPower(profile) : 0;
  const monthlyReadiness = profile
    ? Math.min(100, Math.round(((profile.battleContribution + rankedEmployees.length * 8) / 140) * 100))
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
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Не удалось загрузить данные приложения.");
      setAppState(createInitialState());
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

  function runEnhancement(enhancement: Enhancement) {
    if (!profile) {
      return;
    }

    const previousStacks = profile.enhancements[enhancement.id];
    const nextProfile = forgeEnhancement(profile, enhancement);
    updateProfile(
      nextProfile,
      nextProfile.enhancements[enhancement.id] > previousStacks
        ? `Усиление создано: ${enhancement.name}.`
        : "Не хватает ресурсов.",
    );
  }

  function runDungeon(dungeon: Dungeon) {
    if (!profile) {
      return;
    }

    const previousRuns = profile.completedDungeons.length;
    const nextProfile = enterDungeon(profile, dungeon);
    updateProfile(
      nextProfile,
      nextProfile.completedDungeons.length > previousRuns
        ? `Подземелье пройдено: ${dungeon.name}.`
        : "Нужны усиления или больше силы.",
    );
  }

  function runBattleContribution() {
    if (!profile) {
      return;
    }

    const nextProfile = contributeToBattle(profile);
    updateProfile(nextProfile, nextProfile === profile ? "Нужны провиант и эфир." : "Вклад в битву внесен.");
  }

  function runTeamDirective(directiveId: TeamDirectiveId) {
    if (!profile) {
      return;
    }

    const directive = getTeamDirective(directiveId);
    const nextProfile = setTeamDirective(profile, directive.id);
    updateProfile(nextProfile, nextProfile === profile ? `Приказ уже активен: ${directive.name}.` : `Приказ отряду: ${directive.name}.`);
  }

  function runCombatTrainingReward(wave: number, defeatedCount: number, rank: CombatTrainingRewardRank) {
    if (!profile) {
      return;
    }

    const previousClaims = profile.combatTrainingRewardsClaimed;
    const nextProfile = claimCombatTrainingReward(profile, wave, defeatedCount, rank);
    updateProfile(
      nextProfile,
      nextProfile.combatTrainingRewardsClaimed > previousClaims
        ? `Награда за тренировочную волну ${wave} получена. Ранг: ${rank}.`
        : "Лимит наград за тренировки на сегодня исчерпан.",
    );
  }

  function runProfessionChange(professionId: ProfessionId) {
    if (!profile) {
      return;
    }

    const mode = getProfessionChangeMode(profile, professionId);
    const nextProfile = changeProfession(profile, professionId);

    if (mode === "selected") {
      updateProfile(nextProfile, "Эта профессия уже выбрана.");
      return;
    }

    if (mode === "blocked") {
      updateProfile(nextProfile, `Смена уже использована. Нужно: ${formatResourceList(getProfessionChangeCost())}.`);
      return;
    }

    updateProfile(
      nextProfile,
      mode === "free" ? "Бесплатная смена профессии использована." : "Профессия изменена за ресурсы.",
    );
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

  const activeWeaponEnhancement = professionWeaponEnhancement[profile.professionId];
  const activeWeaponLevel = profile.enhancements[activeWeaponEnhancement] || 0;
  const activeWeapon = getEnhancement(activeWeaponEnhancement);
  const nextWeaponStage =
    activeWeaponLevel >= 4 ? "Максимум" : getCompactWeaponStageLabel(activeWeaponLevel + 1);

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
            <h2>Профессии, усиления, подземелья и месячная битва</h2>
          </div>
          <div className="date-stack" aria-label="Текущая дата и неделя">
            <span>{displayDate(todayKey, { weekday: "long", day: "numeric", month: "long" })}</span>
            <strong>
              Ролевой сезон{" "}
              {professionSeason
                ? `${displayDate(professionSeason.startKey, { day: "numeric", month: "long" })} - ${displayDate(
                    professionSeason.endKey,
                    { day: "numeric", month: "long" },
                  )}`
                : `с ${displayDate(weekStartKey, { day: "numeric", month: "long" })}`}
            </strong>
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
              <span className={`status-pill ${freeProfessionChangeAvailable ? "done" : "waiting"}`}>
                {freeProfessionChangeAvailable ? "1 смена доступна" : "Смена за ресурсы"}
              </span>
            </div>
            <section className="hero-loadout" aria-label="Текущий герой">
              <div className="hero-loadout-scene">
                {hasCharacterSprite(profile.professionId) ? (
                  <CharacterSpritePreview
                    professionId={profile.professionId}
                    selected
                    weaponLevel={activeWeaponLevel}
                  />
                ) : (
                  <ProfessionAvatar3D professionId={profile.professionId} selected weaponLevel={activeWeaponLevel} />
                )}
                <span className="hero-loadout-crest" aria-hidden="true">
                  {profession.crest}
                </span>
              </div>
              <div className="hero-loadout-copy">
                <div>
                  <span className="section-kicker">Активный комплект</span>
                  <h3>{profession.name}</h3>
                  <p>{profession.function}</p>
                </div>
                <div className="hero-weapon-row">
                  <WeaponPreview3D enhancementId={activeWeaponEnhancement} level={activeWeaponLevel} />
                  <div>
                    <span className="section-kicker">{activeWeapon.school}</span>
                    <strong>{enhancementWeaponNames[activeWeaponEnhancement]}</strong>
                    <span>{getWeaponStageLabel(activeWeaponLevel)}</span>
                  </div>
                </div>
                <WeaponStageTrack level={activeWeaponLevel} />
                <div className="hero-loadout-stats">
                  <span>
                    Сила <strong>{formatNumber(heroPower)}</strong>
                  </span>
                  <span>
                    След. вид <strong>{nextWeaponStage}</strong>
                  </span>
                  <span>
                    Вклад <strong>{profile.battleContribution}</strong>
                  </span>
                </div>
              </div>
            </section>
            {professionSeason && (
              <div className="profession-rule">
                <span>
                  <strong>{professionSeason.lengthDays} дней</strong>
                  <span>
                    {displayDate(professionSeason.startKey, { day: "numeric", month: "long" })} -{" "}
                    {displayDate(professionSeason.endKey, { day: "numeric", month: "long" })}
                  </span>
                </span>
                <span>
                  <strong>{freeProfessionChangeAvailable ? "Бесплатная смена" : "Платная смена"}</strong>
                  <RewardLine prefix="-" rewards={getProfessionChangeCost()} />
                </span>
              </div>
            )}
            <div className="profession-grid">
              {professions.map((item) => {
                const mode = getProfessionChangeMode(profile, item.id);
                const weaponLevel = profile.enhancements[professionWeaponEnhancement[item.id]] || 0;
                return (
                  <button
                    className={`profession-card${profile.professionId === item.id ? " is-selected" : ""}`}
                    key={item.id}
                    onClick={() => runProfessionChange(item.id)}
                    type="button"
                  >
                    {hasCharacterSprite(item.id) ? (
                      <CharacterSpritePreview
                        professionId={item.id}
                        selected={profile.professionId === item.id}
                        weaponLevel={weaponLevel}
                      />
                    ) : (
                      <ProfessionAvatar3D
                        professionId={item.id}
                        selected={profile.professionId === item.id}
                        weaponLevel={weaponLevel}
                      />
                    )}
                    <span>
                      <strong>{item.name}</strong>
                      <span>{item.function}</span>
                    </span>
                    <small>{item.bonus}</small>
                    <small className="profession-weapon-note">
                      {enhancementWeaponNames[professionWeaponEnhancement[item.id]]}: {getWeaponStageLabel(weaponLevel)}
                    </small>
                    <small className={`profession-change-note is-${mode}`}>{getProfessionChangeLabel(mode)}</small>
                  </button>
                );
              })}
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
              <span className="status-pill waiting">{activeDirective.focus}</span>
            </div>
            <div className="directive-grid" aria-label="Приказ отряду">
              {teamDirectives.map((directive) => (
                <button
                  className={`directive-card${profile.teamDirectiveId === directive.id ? " is-selected" : ""}`}
                  key={directive.id}
                  onClick={() => runTeamDirective(directive.id)}
                  type="button"
                >
                  <span className="section-kicker">{directive.focus}</span>
                  <strong>{directive.name}</strong>
                  <span>{directive.description}</span>
                  <small>{directive.bonus}</small>
                </button>
              ))}
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
                <span className="section-kicker">Усиления</span>
                <h2>Ковка перед спуском</h2>
              </div>
              <span className="status-pill done">
                Подземелий: {profile.completedDungeons.length}/{dungeons.length}
              </span>
            </div>
            <div className="enhancement-grid">
              {enhancements.map((enhancement) => (
                <EnhancementCard
                  enhancement={enhancement}
                  key={enhancement.id}
                  onForge={() => runEnhancement(enhancement)}
                  profile={profile}
                />
              ))}
            </div>
            <div className="dungeon-list">
              {dungeons.map((dungeon) => (
                <DungeonRow dungeon={dungeon} key={dungeon.id} onEnter={() => runDungeon(dungeon)} profile={profile} />
              ))}
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
            <CombatTrainingArena
              heroPower={heroPower}
              key={`${profile.employeeId}:${profile.professionId}:${profile.level}:${heroPower}:${Object.values(profile.enhancements).join(".")}`}
              onClaimReward={runCombatTrainingReward}
              profile={profile}
            />
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

function RewardLine({
  prefix = "+",
  rewards,
}: {
  prefix?: "+" | "-";
  rewards: Partial<Record<keyof typeof resourceLabels, number>>;
}) {
  const entries = (Object.entries(rewards) as Array<[keyof typeof resourceLabels, number]>).filter(
    ([, amount]) => amount > 0,
  );

  return (
    <div className={`reward-line${prefix === "-" ? " is-cost" : ""}`}>
      {entries.map(([resource, amount]) => (
        <span key={resource}>
          {prefix}
          {amount} {resourceLabels[resource]}
        </span>
      ))}
    </div>
  );
}

function WeaponStageTrack({ level }: { level: number }) {
  const cappedLevel = Math.max(0, Math.min(4, Math.floor(level)));
  const stages = [0, 1, 2, 3, 4];

  return (
    <div className="weapon-stage-track" aria-label="Прогресс внешнего вида оружия">
      {stages.map((stage) => (
        <span
          className={`weapon-stage-dot${stage <= cappedLevel ? " is-unlocked" : ""}${stage === cappedLevel ? " is-current" : ""}`}
          key={stage}
          title={getWeaponStageLabel(stage)}
        >
          {stage}
        </span>
      ))}
    </div>
  );
}

function getCompactWeaponStageLabel(level: number) {
  const compactLabels = ["База", "Заряд", "Редкий", "Эпик", "Пробуждение"];
  const tier = Math.max(0, Math.min(4, Math.floor(level)));
  return compactLabels[tier];
}

function getProfessionChangeLabel(mode: ReturnType<typeof getProfessionChangeMode>) {
  if (mode === "selected") {
    return "Выбрано";
  }

  if (mode === "free") {
    return "Бесплатная смена";
  }

  if (mode === "paid") {
    return `Стоимость: ${formatResourceList(getProfessionChangeCost())}`;
  }

  return "Не хватает ресурсов";
}

function formatResourceList(resources: Partial<Record<keyof typeof resourceLabels, number>>) {
  return (Object.entries(resources) as Array<[keyof typeof resourceLabels, number]>)
    .filter(([, amount]) => amount > 0)
    .map(([resource, amount]) => `${amount} ${resourceLabels[resource]}`)
    .join(", ");
}

function EnhancementCard({
  enhancement,
  onForge,
  profile,
}: {
  enhancement: Enhancement;
  onForge: () => void;
  profile: GameProfile;
}) {
  const stacks = profile.enhancements[enhancement.id] || 0;
  const cost = getEnhancementCost(profile, enhancement);
  const canForge = canForgeEnhancement(profile, enhancement);

  return (
    <article className="enhancement-card">
      <div className="enhancement-preview-row">
        <WeaponPreview3D enhancementId={enhancement.id} level={stacks} />
        <div>
          <span className="section-kicker">Вид оружия</span>
          <strong>{enhancementWeaponNames[enhancement.id]}</strong>
          <span>{getWeaponStageLabel(stacks)}</span>
        </div>
      </div>
      <div className="enhancement-head">
        <span className="enhancement-orb" aria-hidden="true">
          {enhancement.crest}
        </span>
        <div>
          <span className="section-kicker">{enhancement.school}</span>
          <h3>{enhancement.name}</h3>
          <p>{enhancement.description}</p>
        </div>
      </div>
      <div className="enhancement-stats">
        <span>
          Стеков <strong>{stacks}</strong>
        </span>
        <span>
          Сила <strong>+{stacks * enhancement.power}</strong>
        </span>
      </div>
      <div>
        <span className="section-kicker">Цена</span>
        <RewardLine prefix="-" rewards={cost} />
      </div>
      <button className="secondary-button compact" disabled={!canForge} onClick={onForge} type="button">
        {canForge ? "Усилить" : "Ресурсы"}
      </button>
    </article>
  );
}

function DungeonRow({
  dungeon,
  onEnter,
  profile,
}: {
  dungeon: Dungeon;
  onEnter: () => void;
  profile: GameProfile;
}) {
  const completed = profile.completedDungeons.includes(dungeon.id);
  const currentPower = getDungeonPower(profile, dungeon);
  const powerMet = currentPower >= dungeon.requiredPower;
  const canEnter = canEnterDungeon(profile, dungeon);
  const actionLabel = completed ? "Зачищено" : profile.energy <= 0 ? "Нет энергии" : canEnter ? "Пройти" : "Закрыто";

  return (
    <div className={`dungeon-row${completed ? " is-cleared" : ""}`}>
      <span className="dungeon-depth">{dungeon.depth}</span>
      <div className="dungeon-copy">
        <span className="section-kicker">Специалист: {getProfession(dungeon.specialist).name}</span>
        <strong>{dungeon.name}</strong>
        <span>{dungeon.description}</span>
        <RequirementLine profile={profile} requirements={dungeon.requiredEnhancements} />
      </div>
      <div className="dungeon-status">
        <span className={powerMet ? "is-met" : ""}>
          {currentPower}/{dungeon.requiredPower}
        </span>
        <RewardLine rewards={dungeon.rewards} />
      </div>
      <button className="secondary-button compact" disabled={!canEnter} onClick={onEnter} type="button">
        {actionLabel}
      </button>
    </div>
  );
}

function RequirementLine({
  profile,
  requirements,
}: {
  profile: GameProfile;
  requirements: Partial<Record<EnhancementId, number>>;
}) {
  const entries = (Object.entries(requirements) as Array<[EnhancementId, number]>).filter(([, amount]) => amount > 0);

  return (
    <div className="requirement-line">
      {entries.map(([id, amount]) => {
        const current = profile.enhancements[id] || 0;
        const isMet = current >= amount;

        return (
          <span className={isMet ? "is-met" : ""} key={id}>
            {getEnhancement(id).name} {current}/{amount}
          </span>
        );
      })}
    </div>
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
