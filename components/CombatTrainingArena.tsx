import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getCharacterSpriteLabel, getCharacterSpritePosition, getCharacterSpriteSheet } from "./CharacterSpritePreview";
import { professionWeaponEnhancement } from "./ProfessionAvatar3D";
import {
  DAILY_COMBAT_TRAINING_REWARD_LIMIT,
  CombatTrainingRewardRank,
  GameProfile,
  canClaimCombatTrainingReward,
  getCombatTrainingReward,
  getProfession,
  resourceLabels,
} from "../lib/companyGame";
import type { CombatEnemy, CombatState, Vector2 } from "../lib/combatTraining";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  createCombatTrainingState,
  createNextCombatTrainingWave,
  faceCombatPoint,
  getCombatTrainingRank,
  performCombatAttack,
  performCombatAbility,
  performCombatDodge,
  stepCombatTraining,
} from "../lib/combatTraining";
import styles from "./CombatTrainingArena.module.css";

type CombatTrainingArenaProps = {
  heroPower: number;
  onClaimReward: (wave: number, defeatedCount: number, rank: CombatTrainingRewardRank) => void;
  profile: GameProfile;
};

const movementCodes = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"]);
const attackCodes = new Set(["Space", "Enter", "KeyJ", "KeyK"]);
const abilityCodes = new Set(["KeyE", "ShiftLeft", "ShiftRight"]);
const dodgeCodes = new Set(["KeyQ", "ControlLeft", "ControlRight"]);

export function CombatTrainingArena({ heroPower, onClaimReward, profile }: CombatTrainingArenaProps) {
  const [combatState, setCombatState] = useState<CombatState>(() => createCombatTrainingState(profile, heroPower));
  const [claimedWaves, setClaimedWaves] = useState<Set<number>>(() => new Set());
  const stateRef = useRef(combatState);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const touchMoveRef = useRef<Vector2>({ x: 0, y: 0 });
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const profession = getProfession(profile.professionId);
  const spriteSheet = getCharacterSpriteSheet(profile.professionId);
  const spriteWeaponLevel = profile.enhancements[professionWeaponEnhancement[profile.professionId]] || 0;

  useEffect(() => {
    stateRef.current = combatState;
  }, [combatState]);

  const attack = useCallback(() => {
    setCombatState((current) => {
      const next = performCombatAttack(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const triggerAbility = useCallback(() => {
    setCombatState((current) => {
      const next = performCombatAbility(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const dodge = useCallback(() => {
    setCombatState((current) => {
      const next = performCombatDodge(current, readMoveVector(pressedKeysRef.current, touchMoveRef.current));
      stateRef.current = next;
      return next;
    });
  }, []);

  const resetTraining = useCallback(() => {
    const next = createCombatTrainingState(profile, heroPower);
    stateRef.current = next;
    setCombatState(next);
    pressedKeysRef.current.clear();
    touchMoveRef.current = { x: 0, y: 0 };
  }, [heroPower, profile]);

  const claimReward = useCallback(() => {
    if (combatState.status !== "victory" || claimedWaves.has(combatState.wave) || !canClaimCombatTrainingReward(profile)) {
      return;
    }

    onClaimReward(combatState.wave, combatState.defeatedCount, getCombatTrainingRank(combatState).rank);
    setClaimedWaves((current) => {
      const next = new Set(current);
      next.add(combatState.wave);
      return next;
    });
  }, [claimedWaves, combatState, onClaimReward, profile]);

  const startNextWave = useCallback(() => {
    setCombatState((current) => {
      const next = createNextCombatTrainingWave(current, profile, heroPower);
      stateRef.current = next;
      return next;
    });
    pressedKeysRef.current.clear();
    touchMoveRef.current = { x: 0, y: 0 };
  }, [heroPower, profile]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (movementCodes.has(event.code)) {
        event.preventDefault();
        pressedKeysRef.current.add(event.code);
      }

      if (attackCodes.has(event.code) && !event.repeat) {
        event.preventDefault();
        attack();
      }

      if (abilityCodes.has(event.code) && !event.repeat) {
        event.preventDefault();
        triggerAbility();
      }

      if (dodgeCodes.has(event.code) && !event.repeat) {
        event.preventDefault();
        dodge();
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (movementCodes.has(event.code)) {
        pressedKeysRef.current.delete(event.code);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [attack, dodge, triggerAbility]);

  useEffect(() => {
    let animationId = 0;
    let previousTime = performance.now();

    const tick = (time: number) => {
      const deltaMs = time - previousTime;
      previousTime = time;
      const move = readMoveVector(pressedKeysRef.current, touchMoveRef.current);

      setCombatState((current) => {
        const next = stepCombatTraining(current, move, deltaMs);
        stateRef.current = next;
        return next;
      });

      animationId = window.requestAnimationFrame(tick);
    };

    animationId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationId);
  }, []);

  const aimAndAttack = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button === 2) {
        event.preventDefault();
        dodge();
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const arena = arenaRef.current;
      if (!arena) {
        return;
      }

      const rect = arena.getBoundingClientRect();
      const point = {
        x: ((event.clientX - rect.left) / rect.width) * ARENA_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * ARENA_HEIGHT,
      };

      setCombatState((current) => {
        const aimed = faceCombatPoint(current, point);
        const next = performCombatAttack(aimed);
        stateRef.current = next;
        return next;
      });
    },
    [dodge],
  );

  const statusLabel =
    combatState.status === "victory" ? "Волна очищена" : combatState.status === "defeat" ? "Тренировка сорвана" : "Бой идет";
  const attackReady = combatState.timeMs >= combatState.player.attackReadyAt;
  const abilityReady = combatState.timeMs >= combatState.player.abilityReadyAt;
  const dodgeReady = combatState.timeMs >= combatState.player.dodgeReadyAt && combatState.player.stamina >= combatState.player.dodgeCost;
  const hasPrecisionCounter = combatState.timeMs < combatState.player.precisionUntil;
  const rankSummary = getCombatTrainingRank(combatState);
  const reward = getCombatTrainingReward(profile, combatState.wave, combatState.defeatedCount, rankSummary.rank);
  const rewardClaimed = claimedWaves.has(combatState.wave);
  const rewardsLeft = Math.max(0, DAILY_COMBAT_TRAINING_REWARD_LIMIT - profile.combatTrainingRewardsClaimed);
  const canClaimReward = combatState.status === "victory" && !rewardClaimed && canClaimCombatTrainingReward(profile);

  return (
    <section className={styles.shell} aria-labelledby="combat-training-title">
      <div className={styles.heading}>
        <div>
          <span className="section-kicker">Тренажер боя</span>
          <h3 id="combat-training-title">Движение, атака и урон</h3>
        </div>
        <span className={statusClass(combatState.status)}>{statusLabel}</span>
      </div>

      <div className={styles.statGrid} aria-label="Состояние тренировки">
        <Stat label="Волна" value={String(combatState.wave)} />
        <Stat label="HP" value={`${Math.ceil(combatState.player.hp)}/${combatState.player.maxHp}`} />
        <Stat label="Вынос" value={`${Math.floor(combatState.player.stamina)}/${combatState.player.maxStamina}`} />
        <Stat label="Урон" value={hasPrecisionCounter ? `${combatState.player.attackDamage}+` : String(combatState.player.attackDamage)} />
        <Stat label="Цели" value={`${combatState.defeatedCount}/${combatState.enemies.length}`} />
        <Stat label="Комбо" value={`x${combatState.combo}/${combatState.maxCombo}`} />
      </div>

      <div
        aria-label="Боевая арена"
        className={styles.arena}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={aimAndAttack}
        ref={arenaRef}
        role="application"
        tabIndex={0}
      >
        <div className={styles.gridOverlay} />
        <div className={styles.arenaHud} aria-hidden="true">
          <div className={styles.vitalsStack}>
            <span className={`${styles.vitalTrack} ${styles.healthTrack}`}>
              <i style={healthStyle(combatState.player.hp, combatState.player.maxHp)} />
            </span>
            <span className={`${styles.vitalTrack} ${styles.staminaTrack}`}>
              <i style={healthStyle(combatState.player.stamina, combatState.player.maxStamina)} />
            </span>
          </div>
          <div className={styles.arenaBadges}>
            <span>В{combatState.wave}</span>
            <strong className={rankBadgeClass(rankSummary.rank)}>{rankSummary.rank}</strong>
            <span className={combatState.combo > 0 ? styles.comboLive : styles.comboIdle}>x{combatState.combo}</span>
          </div>
        </div>
        <div className={styles.enemyLegend} aria-hidden="true">
          <span className={styles.legendSlash}>Ближний</span>
          <span className={styles.legendBlast}>Эфир</span>
          <span className={styles.legendRush}>Рывок</span>
          <span className={styles.legendShock}>Волна</span>
        </div>
        <div className={styles.defenseWall} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className={styles.spawnGate} aria-hidden="true">
          <i />
          <i />
        </div>
        <div className={`${styles.laneRail} ${styles.laneTop}`} aria-hidden="true" />
        <div className={`${styles.laneRail} ${styles.laneMid}`} aria-hidden="true" />
        <div className={`${styles.laneRail} ${styles.laneBottom}`} aria-hidden="true" />
        {combatState.enemies.map((enemy) =>
          enemy.hp > 0 ? <div className={enemyRangeClass(enemy)} key={`${enemy.id}-range`} style={enemyRangeStyle(enemy)} /> : null,
        )}
        <div className={styles.attackWindup} key={`windup-${attackFxKey(combatState)}`} style={attackWindupStyle(combatState)} />
        <div className={styles.attackArc} style={attackArcStyle(combatState)} />
        <div className={styles.attackSlash} key={`slash-${attackFxKey(combatState)}`} style={attackSlashStyle(combatState)} />
        <div className={styles.abilityPulse} style={abilityPulseStyle(combatState)} />
        {combatState.enemies.map((enemy) => {
          const isImpact = enemy.attackApplied && enemy.attackUntil > combatState.timeMs;
          const isWarning = enemy.attackLandsAt > combatState.timeMs;

          if (enemy.hp <= 0 || (!isWarning && !isImpact)) {
            return null;
          }

          return (
            <div
              aria-hidden="true"
              className={enemyTelegraphClass(enemy, isImpact)}
              key={`${enemy.id}-telegraph`}
              style={enemyTelegraphStyle(enemy)}
            />
          );
        })}
        {combatState.enemies.map((enemy) =>
          enemy.hp > 0 && enemy.attackLandsAt > combatState.timeMs ? (
            <div className={styles.intentLine} key={`${enemy.id}-intent`} style={intentLineStyle(enemy.position, enemy.attackTarget)} />
          ) : null,
        )}
        <div className={playerClass(combatState, Boolean(spriteSheet))} style={positionStyle(combatState.player.position)}>
          {spriteSheet ? (
            <span
              aria-label={getCharacterSpriteLabel(profile.professionId)}
              className={styles.playerSprite}
              role="img"
              style={playerSpriteStyle(spriteSheet, spriteWeaponLevel)}
            />
          ) : (
            <span style={facingStyle(combatState.player.facing)}>{profession.crest}</span>
          )}
          <i style={healthStyle(combatState.player.hp, combatState.player.maxHp)} />
        </div>

        {combatState.enemies.map((enemy) => {
          const isCharging = enemy.attackLandsAt > combatState.timeMs && !enemy.attackApplied;

          return (
            <div
              className={enemyClass(
                enemy,
                enemy.hp <= 0,
                enemy.hitUntil > combatState.timeMs,
                enemy.stunUntil > combatState.timeMs,
                isCharging,
              )}
              key={enemy.id}
              style={enemyStyle(enemy.position, enemy.radius)}
            >
              <b className={styles.enemyCore} aria-hidden="true">
                <em />
              </b>
              <span className={styles.enemyName}>{enemy.name}</span>
              <i style={healthStyle(enemy.hp, enemy.maxHp)} />
            </div>
          );
        })}
        {combatState.enemies.map((enemy) =>
          enemy.hitUntil > combatState.timeMs ? (
            <div
              aria-hidden="true"
              className={hitImpactClass(enemy)}
              key={`${enemy.id}-hit-${Math.floor(enemy.hitUntil)}`}
              style={hitImpactStyle(enemy, combatState.timeMs)}
            >
              <i />
              <i />
              <i />
            </div>
          ) : null,
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.dpad} aria-label="Движение">
          <button aria-label="Вверх" onPointerDown={holdMove({ x: 0, y: -1 })} onPointerLeave={stopMove} onPointerUp={stopMove} type="button">
            ↑
          </button>
          <button aria-label="Влево" onPointerDown={holdMove({ x: -1, y: 0 })} onPointerLeave={stopMove} onPointerUp={stopMove} type="button">
            ←
          </button>
          <button aria-label="Вниз" onPointerDown={holdMove({ x: 0, y: 1 })} onPointerLeave={stopMove} onPointerUp={stopMove} type="button">
            ↓
          </button>
          <button aria-label="Вправо" onPointerDown={holdMove({ x: 1, y: 0 })} onPointerLeave={stopMove} onPointerUp={stopMove} type="button">
            →
          </button>
        </div>
        <button className={styles.attackButton} disabled={!attackReady || combatState.status !== "fighting"} onClick={attack} type="button">
          Атака
        </button>
        <button className={styles.dodgeButton} disabled={!dodgeReady || combatState.status !== "fighting"} onClick={dodge} title="Q / Ctrl" type="button">
          Уклонение
        </button>
        <button
          className={styles.abilityButton}
          disabled={!abilityReady || combatState.status !== "fighting"}
          onClick={triggerAbility}
          title={combatState.player.ability.description}
          type="button"
        >
          {abilityReady ? combatState.player.ability.name : "Навык"}
        </button>
        <button className={styles.resetButton} onClick={resetTraining} type="button">
          Сброс
        </button>
      </div>

      {combatState.status !== "fighting" && (
        <div className={styles.resultPanel}>
          {combatState.status === "victory" ? (
            <>
              <div>
                <span className="section-kicker">Награда за волну</span>
                <div className={styles.rankSummary}>
                  <strong>{rankSummary.rank}</strong>
                  <span>{rankSummary.score} очк.</span>
                  <span>Лучшее x{combatState.maxCombo}</span>
                  <span>Точные {combatState.precisionDodges}</span>
                  <span>Урон {combatState.damageDealt}</span>
                  <span>Получено {combatState.damageTaken}</span>
                </div>
                <div className={styles.rewardItems}>
                  {reward.rankBonusPercent > 0 && <span>+{reward.rankBonusPercent}% ранг</span>}
                  <span>+{reward.xp} XP</span>
                  <span>+{reward.battleContribution} готовность</span>
                  {(Object.entries(reward.resources) as Array<[keyof typeof resourceLabels, number]>).map(([resource, amount]) => (
                    <span key={resource}>
                      +{amount} {resourceLabels[resource]}
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.resultActions}>
                <button className={styles.rewardButton} disabled={!canClaimReward} onClick={claimReward} type="button">
                  {rewardClaimed ? "Получено" : rewardsLeft > 0 ? "Забрать" : "Лимит"}
                </button>
                <button className={styles.nextWaveButton} onClick={startNextWave} type="button">
                  Следующая волна
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>Герой выбит. Можно повторить тренировку с текущими параметрами.</span>
                <div className={styles.rankSummary}>
                  <strong>{rankSummary.rank}</strong>
                  <span>{rankSummary.score} очк.</span>
                  <span>Лучшее x{combatState.maxCombo}</span>
                  <span>Точные {combatState.precisionDodges}</span>
                  <span>Урон {combatState.damageDealt}</span>
                  <span>Получено {combatState.damageTaken}</span>
                </div>
              </div>
              <button className={styles.nextWaveButton} onClick={resetTraining} type="button">
                Повторить
              </button>
            </>
          )}
        </div>
      )}

      <div className={styles.eventLine} role="status" aria-live="polite">
        {combatState.lastEvent}
      </div>
    </section>
  );

  function holdMove(vector: Vector2) {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      touchMoveRef.current = vector;
    };
  }

  function stopMove() {
    touchMoveRef.current = { x: 0, y: 0 };
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function readMoveVector(keys: Set<string>, touchMove: Vector2): Vector2 {
  let x = touchMove.x;
  let y = touchMove.y;

  if (keys.has("ArrowLeft") || keys.has("KeyA")) {
    x -= 1;
  }

  if (keys.has("ArrowRight") || keys.has("KeyD")) {
    x += 1;
  }

  if (keys.has("ArrowUp") || keys.has("KeyW")) {
    y -= 1;
  }

  if (keys.has("ArrowDown") || keys.has("KeyS")) {
    y += 1;
  }

  return { x, y };
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function positionStyle(position: Vector2): CSSProperties {
  return {
    left: `${(position.x / ARENA_WIDTH) * 100}%`,
    top: `${(position.y / ARENA_HEIGHT) * 100}%`,
  };
}

function enemyStyle(position: Vector2, radius: number): CSSProperties {
  return {
    ...positionStyle(position),
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
  };
}

function enemyTelegraphStyle(enemy: CombatEnemy): CSSProperties {
  return {
    ...positionStyle(enemy.attackTarget),
    width: `${enemy.attackRadius * 2}px`,
    height: `${enemy.attackRadius * 2}px`,
  };
}

function enemyRangeStyle(enemy: CombatEnemy): CSSProperties {
  return {
    ...positionStyle(enemy.position),
    width: `${enemy.attackRange * 2}px`,
    height: `${enemy.attackRange * 2}px`,
  };
}

function intentLineStyle(start: Vector2, end: Vector2): CSSProperties {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  return {
    ...positionStyle(start),
    width: `${length}px`,
    transform: `translate(0, -50%) rotate(${Math.atan2(dy, dx)}rad)`,
  };
}

function facingStyle(facing: Vector2): CSSProperties {
  return {
    transform: `rotate(${Math.atan2(facing.y, facing.x)}rad)`,
  };
}

function attackFxKey(state: CombatState) {
  if (state.timeMs > state.player.attackUntil) {
    return "idle";
  }

  return `${Math.round(getPlayerAttackStartMs(state))}-${Math.round(state.player.attackUntil)}`;
}

function attackWindupStyle(state: CombatState): CSSProperties {
  const visible = state.timeMs <= state.player.attackUntil && state.status === "fighting";
  const progress = getPlayerAttackProgress(state);
  const angle = Math.atan2(state.player.facing.y, state.player.facing.x);

  return {
    ...positionStyle(state.player.position),
    opacity: visible ? clamp01(1 - progress * 2.35) : 0,
    width: `${Math.max(44, state.player.attackRange * 0.38)}px`,
    transform: `translate(1%, -50%) rotate(${angle - 0.82 + progress * 0.48}rad) scaleX(${0.86 + progress * 0.18})`,
  };
}

function attackArcStyle(state: CombatState): CSSProperties {
  const visible = state.timeMs <= state.player.attackUntil && state.status === "fighting";
  const progress = getPlayerAttackProgress(state);
  const angle = Math.atan2(state.player.facing.y, state.player.facing.x);

  return {
    left: `${(state.player.position.x / ARENA_WIDTH) * 100}%`,
    top: `${(state.player.position.y / ARENA_HEIGHT) * 100}%`,
    width: `${(state.player.attackRange / ARENA_WIDTH) * 100}%`,
    height: `${((state.player.attackRange * 0.72) / ARENA_HEIGHT) * 100}%`,
    opacity: visible ? clamp01(1 - progress * 0.7) : 0,
    transform: `translate(2%, -50%) rotate(${angle - 0.16 + progress * 0.22}rad) scaleX(${0.92 + progress * 0.12})`,
  };
}

function attackSlashStyle(state: CombatState): CSSProperties {
  const visible = state.timeMs <= state.player.attackUntil && state.status === "fighting";
  const progress = getPlayerAttackProgress(state);
  const slashProgress = clamp01((progress - 0.18) / 0.82);
  const angle = Math.atan2(state.player.facing.y, state.player.facing.x);
  const opacity = visible ? Math.sin(slashProgress * Math.PI) : 0;

  return {
    ...positionStyle(state.player.position),
    "--slash-progress": slashProgress,
    width: `${(state.player.attackRange / ARENA_WIDTH) * 100}%`,
    height: `${((state.player.attackRange * 0.82) / ARENA_HEIGHT) * 100}%`,
    opacity,
    transform: `translate(7%, -50%) rotate(${angle - 0.26 + slashProgress * 0.42}rad) scale(${0.92 + slashProgress * 0.16})`,
  } as CSSProperties;
}

function abilityPulseStyle(state: CombatState): CSSProperties {
  const visible = state.timeMs <= state.player.abilityUntil && state.status === "fighting";
  const radiusByAbility: Record<string, number> = {
    "route-dash": 120,
    "ore-breaker": 190,
    "blade-fan": 330,
    "guard-pulse": 300,
    "ether-chain": 380,
    "rally-command": 340,
  };
  const size = radiusByAbility[state.player.ability.id] || 260;

  return {
    left: `${(state.player.position.x / ARENA_WIDTH) * 100}%`,
    top: `${(state.player.position.y / ARENA_HEIGHT) * 100}%`,
    width: `${(size / ARENA_WIDTH) * 100}%`,
    height: `${(size / ARENA_HEIGHT) * 100}%`,
    opacity: visible ? 1 : 0,
  };
}

function hitImpactStyle(enemy: CombatEnemy, timeMs: number): CSSProperties {
  const rawProgress = clamp01(1 - (enemy.hitUntil - timeMs) / 260);
  const progress = clamp01((rawProgress - 0.22) / 0.78);
  const size = enemy.radius * 3.4;

  return {
    ...positionStyle(enemy.position),
    "--hit-progress": progress,
    width: `${size}px`,
    height: `${size}px`,
    opacity: clamp01(1 - progress * 0.92),
    transform: `translate(-50%, -50%) scale(${0.72 + progress * 0.72})`,
  } as CSSProperties;
}

function healthStyle(value: number, max: number): CSSProperties {
  return {
    width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
  };
}

function statusClass(status: CombatState["status"]) {
  return `${styles.statusPill} ${styles[status]}`;
}

function rankBadgeClass(rank: string) {
  const rankClass: Record<string, string> = {
    A: styles.rankA,
    B: styles.rankB,
    C: styles.rankC,
    S: styles.rankS,
  };

  return `${styles.rankBadge} ${rankClass[rank] || styles.rankC}`;
}

function playerSpriteStyle(spriteSheet: string, weaponLevel: number): CSSProperties {
  return {
    "--player-sprite-image": `url("${spriteSheet}")`,
    "--player-sprite-position": getCharacterSpritePosition(weaponLevel),
  } as CSSProperties;
}

function playerClass(state: CombatState, hasSprite: boolean) {
  const isProtected = state.timeMs < state.player.invulnerableUntil;
  const isDodging = state.timeMs < state.player.dodgeUntil;
  const isPrecise = state.timeMs < state.player.precisionUntil;
  const isAttacking = state.timeMs < state.player.attackUntil;
  return `${styles.player}${hasSprite ? ` ${styles.hasSprite}` : ""}${isProtected ? ` ${styles.isProtected}` : ""}${
    isDodging ? ` ${styles.isDodging}` : ""
  }${isPrecise ? ` ${styles.isPrecise}` : ""}${isAttacking ? ` ${styles.isAttacking}` : ""}`;
}

function enemyClass(enemy: CombatEnemy, isDown: boolean, isHit: boolean, isStunned: boolean, isCharging: boolean) {
  const enemyTypeClass: Record<CombatEnemy["attackKind"], string> = {
    blast: styles.enemyBlast,
    rush: styles.enemyRush,
    shock: styles.enemyShock,
    slash: styles.enemySlash,
  };

  return `${styles.enemy} ${enemyTypeClass[enemy.attackKind]}${isDown ? ` ${styles.isDown}` : ""}${isHit ? ` ${styles.isHit}` : ""}${
    isStunned ? ` ${styles.isStunned}` : ""
  }${isCharging ? ` ${styles.isCharging}` : ""}`;
}

function enemyTelegraphClass(enemy: CombatEnemy, isImpact: boolean) {
  const telegraphTypeClass: Record<CombatEnemy["attackKind"], string> = {
    blast: styles.enemyTelegraphBlast,
    rush: styles.enemyTelegraphRush,
    shock: styles.enemyTelegraphShock,
    slash: styles.enemyTelegraphSlash,
  };

  return `${styles.enemyTelegraph} ${telegraphTypeClass[enemy.attackKind]}${isImpact ? ` ${styles.isTelegraphImpact}` : ""}`;
}

function enemyRangeClass(enemy: CombatEnemy) {
  const rangeClass: Record<CombatEnemy["attackKind"], string> = {
    blast: styles.rangeBlast,
    rush: styles.rangeRush,
    shock: styles.rangeShock,
    slash: styles.rangeSlash,
  };

  return `${styles.enemyRange} ${rangeClass[enemy.attackKind]}`;
}

function hitImpactClass(enemy: CombatEnemy) {
  const hitClass: Record<CombatEnemy["attackKind"], string> = {
    blast: styles.hitImpactBlast,
    rush: styles.hitImpactRush,
    shock: styles.hitImpactShock,
    slash: styles.hitImpactSlash,
  };

  return `${styles.hitImpact} ${hitClass[enemy.attackKind]}`;
}

function getPlayerAttackStartMs(state: CombatState) {
  return Math.max(0, state.player.attackReadyAt - state.player.attackCooldownMs);
}

function getPlayerAttackProgress(state: CombatState) {
  if (state.player.attackUntil <= state.timeMs) {
    return 1;
  }

  const attackStart = getPlayerAttackStartMs(state);
  const attackDuration = Math.max(1, state.player.attackUntil - attackStart);
  return clamp01((state.timeMs - attackStart) / attackDuration);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
