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
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const stateRef = useRef(combatState);
  const isPlayerMovingRef = useRef(false);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const touchMoveRef = useRef<Vector2>({ x: 0, y: 0 });
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const profession = getProfession(profile.professionId);
  const spriteSheet = getCharacterSpriteSheet(profile.professionId);
  const spriteWeaponLevel = profile.enhancements[professionWeaponEnhancement[profile.professionId]] || 0;

  const updatePlayerMoving = useCallback((nextIsMoving: boolean) => {
    if (isPlayerMovingRef.current === nextIsMoving) {
      return;
    }

    isPlayerMovingRef.current = nextIsMoving;
    setIsPlayerMoving(nextIsMoving);
  }, []);

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
    updatePlayerMoving(false);
    pressedKeysRef.current.clear();
    touchMoveRef.current = { x: 0, y: 0 };
  }, [heroPower, profile, updatePlayerMoving]);

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
    updatePlayerMoving(false);
    pressedKeysRef.current.clear();
    touchMoveRef.current = { x: 0, y: 0 };
  }, [heroPower, profile, updatePlayerMoving]);

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
      updatePlayerMoving(stateRef.current.status === "fighting" && (move.x !== 0 || move.y !== 0));

      setCombatState((current) => {
        const next = stepCombatTraining(current, move, deltaMs);
        stateRef.current = next;
        return next;
      });

      animationId = window.requestAnimationFrame(tick);
    };

    animationId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationId);
  }, [updatePlayerMoving]);

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
  const isPlayerProtected = combatState.timeMs < combatState.player.invulnerableUntil;
  const isCriticalHealth = combatState.status === "fighting" && combatState.player.hp / combatState.player.maxHp <= 0.35;
  const isLowStamina = combatState.status === "fighting" && combatState.player.stamina < combatState.player.dodgeCost;
  const rankSummary = getCombatTrainingRank(combatState);
  const rankGoal = getNextRankGoal(rankSummary.score);
  const reward = getCombatTrainingReward(profile, combatState.wave, combatState.defeatedCount, rankSummary.rank);
  const rewardClaimed = claimedWaves.has(combatState.wave);
  const rewardsLeft = Math.max(0, DAILY_COMBAT_TRAINING_REWARD_LIMIT - profile.combatTrainingRewardsClaimed);
  const canClaimReward = combatState.status === "victory" && !rewardClaimed && canClaimCombatTrainingReward(profile);
  const rewardLimitLabel = rewardClaimed
    ? "Награда этой волны уже получена."
    : rewardsLeft > 0
      ? `Осталось наград сегодня: ${rewardsLeft}/${DAILY_COMBAT_TRAINING_REWARD_LIMIT}`
      : "Дневной лимит наград исчерпан.";

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
        <Stat label="Награды" value={`${rewardsLeft}/${DAILY_COMBAT_TRAINING_REWARD_LIMIT}`} />
      </div>

      <div
        aria-label="Боевая арена"
        className={`${styles.arena} ${isCriticalHealth ? styles.isCriticalHealth : ""} ${isLowStamina ? styles.isLowStamina : ""}`}
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
        <div
          className={playerClass(combatState, Boolean(spriteSheet), isPlayerMoving, profile.professionId)}
          style={playerArenaStyle(combatState, profile.professionId, spriteWeaponLevel)}
        >
          {isPlayerMoving && combatState.status === "fighting" && <b className={styles.playerMoveTrail} aria-hidden="true" />}
          {combatState.combo > 0 && <b className={styles.playerComboAura} aria-hidden="true" />}
          {spriteSheet && <b className={styles.playerStageAura} aria-hidden="true" />}
          {isPlayerProtected && <b className={styles.playerGuardAura} aria-hidden="true" />}
          {hasPrecisionCounter && <b className={styles.playerPrecisionAura} aria-hidden="true" />}
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
              <span className={`${styles.hitImpactLabel} ${enemy.hp <= 0 ? styles.isDefeatLabel : ""}`}>
                {enemy.hp <= 0 ? "BREAK" : "HIT"}
              </span>
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
                  <span className={styles.rankGoal}>{rankGoal}</span>
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
                <span className={styles.rewardLimitHint}>{rewardLimitLabel}</span>
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
                  <span className={styles.rankGoal}>{rankGoal}</span>
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

function getNextRankGoal(score: number) {
  if (score >= 85) {
    return "S-ранг: максимум";
  }

  if (score >= 70) {
    return `До S: ${85 - score} очк.`;
  }

  if (score >= 50) {
    return `До A: ${70 - score} очк.`;
  }

  return `До B: ${50 - score} очк.`;
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

const abilityAuraTones: Record<string, { color: string; core: string; ring: string; soft: string }> = {
  "blade-fan": {
    color: "rgba(255, 196, 87, 0.62)",
    core: "rgba(255, 242, 212, 0.5)",
    ring: "rgba(255, 196, 87, 0.34)",
    soft: "rgba(255, 196, 87, 0.14)",
  },
  "ether-chain": {
    color: "rgba(142, 199, 238, 0.66)",
    core: "rgba(255, 255, 255, 0.48)",
    ring: "rgba(142, 199, 238, 0.34)",
    soft: "rgba(142, 199, 238, 0.14)",
  },
  "guard-pulse": {
    color: "rgba(217, 242, 233, 0.62)",
    core: "rgba(255, 255, 255, 0.46)",
    ring: "rgba(217, 242, 233, 0.32)",
    soft: "rgba(217, 242, 233, 0.14)",
  },
  "ore-breaker": {
    color: "rgba(255, 242, 212, 0.58)",
    core: "rgba(255, 255, 255, 0.4)",
    ring: "rgba(255, 242, 212, 0.28)",
    soft: "rgba(255, 242, 212, 0.12)",
  },
  "rally-command": {
    color: "rgba(244, 139, 151, 0.54)",
    core: "rgba(255, 242, 212, 0.44)",
    ring: "rgba(244, 139, 151, 0.3)",
    soft: "rgba(244, 139, 151, 0.13)",
  },
  "route-dash": {
    color: "rgba(217, 242, 233, 0.58)",
    core: "rgba(142, 199, 238, 0.42)",
    ring: "rgba(217, 242, 233, 0.3)",
    soft: "rgba(217, 242, 233, 0.12)",
  },
};

function abilityAuraStyle(abilityId: string): CSSProperties {
  const tone = abilityAuraTones[abilityId] || abilityAuraTones["guard-pulse"];

  return {
    "--combat-ability-color": tone.color,
    "--combat-ability-core": tone.core,
    "--combat-ability-ring": tone.ring,
    "--combat-ability-soft": tone.soft,
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
    ...abilityAuraStyle(state.player.ability.id),
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

const playerAnimationProfiles: Record<GameProfile["professionId"], { attackRotateScale: number }> = {
  artisan: { attackRotateScale: 0.42 },
  enchanter: { attackRotateScale: 0.34 },
  miner: { attackRotateScale: 0.38 },
  pathfinder: { attackRotateScale: 0.48 },
  tactician: { attackRotateScale: 0.62 },
  warden: { attackRotateScale: 0.72 },
};

const stageAuraTones = [
  {
    color: "rgba(217, 242, 233, 0)",
    highlight: "rgba(255, 255, 255, 0)",
    ring: "rgba(217, 242, 233, 0)",
  },
  {
    color: "rgba(217, 242, 233, 0.58)",
    highlight: "rgba(255, 255, 255, 0.34)",
    ring: "rgba(217, 242, 233, 0.2)",
  },
  {
    color: "rgba(142, 199, 238, 0.62)",
    highlight: "rgba(255, 255, 255, 0.42)",
    ring: "rgba(142, 199, 238, 0.24)",
  },
  {
    color: "rgba(255, 242, 212, 0.68)",
    highlight: "rgba(255, 255, 255, 0.5)",
    ring: "rgba(255, 242, 212, 0.28)",
  },
  {
    color: "rgba(255, 255, 255, 0.72)",
    highlight: "rgba(142, 199, 238, 0.58)",
    ring: "rgba(255, 242, 212, 0.34)",
  },
];

function playerStageAuraStyle(weaponLevel: number): CSSProperties {
  const tier = Math.max(0, Math.min(4, Math.floor(weaponLevel)));
  const tone = stageAuraTones[tier];

  return {
    "--player-stage-aura-color": tone.color,
    "--player-stage-aura-highlight": tone.highlight,
    "--player-stage-aura-opacity": tier === 0 ? 0 : Math.min(0.52, 0.18 + tier * 0.08),
    "--player-stage-aura-ring": tone.ring,
    "--player-stage-aura-size": `${48 + tier * 12}px`,
    "--player-stage-aura-speed": `${Math.max(980, 1640 - tier * 130)}ms`,
  } as CSSProperties;
}

function playerArenaStyle(state: CombatState, professionId: GameProfile["professionId"], weaponLevel: number): CSSProperties {
  const facing = state.player.facing;
  const faceSign = facing.x < -0.08 ? -1 : 1;
  const animationProfile = playerAnimationProfiles[professionId];
  const attackPullX = -facing.x * 10;
  const attackPullY = -facing.y * 8;
  const attackStrikeX = facing.x * 18;
  const attackStrikeY = facing.y * 12;
  const dodgeX = facing.x * 22;
  const dodgeY = facing.y * 16;
  const stepX = facing.x * 4;
  const stepY = facing.y * 3;
  const turnSign = faceSign < 0 ? -1 : 1;
  const combo = clampNumber(state.combo, 0, 6);

  return {
    ...positionStyle(state.player.position),
    ...playerStageAuraStyle(weaponLevel),
    ...abilityAuraStyle(state.player.ability.id),
    "--player-attack-pull-x": `${attackPullX}px`,
    "--player-attack-pull-y": `${attackPullY}px`,
    "--player-attack-strike-x": `${attackStrikeX}px`,
    "--player-attack-strike-y": `${attackStrikeY}px`,
    "--player-attack-strike-rotate": `${clampNumber((12 * turnSign + facing.y * 5) * animationProfile.attackRotateScale, -18, 18)}deg`,
    "--player-attack-windup-rotate": `${clampNumber((-9 * turnSign - facing.y * 4) * animationProfile.attackRotateScale, -16, 16)}deg`,
    "--player-dodge-x": `${dodgeX}px`,
    "--player-dodge-y": `${dodgeY}px`,
    "--player-face-sign": faceSign,
    "--player-combo-opacity": combo > 0 ? Math.min(0.64, 0.22 + combo * 0.07) : 0,
    "--player-combo-size": `${58 + combo * 8}px`,
    "--player-combo-speed": `${Math.max(620, 1080 - combo * 62)}ms`,
    "--player-idle-tilt": `${clampNumber(facing.y * 2.4, -3, 3)}deg`,
    "--player-move-trail-x": `${-facing.x * 10}px`,
    "--player-move-trail-y": `${-facing.y * 4}px`,
    "--player-move-tilt": `${clampNumber(facing.x * 2.5 + facing.y * 4, -6, 6)}deg`,
    "--player-step-back-x": `${-stepX}px`,
    "--player-step-back-y": `${-stepY}px`,
    "--player-step-x": `${stepX}px`,
    "--player-step-y": `${stepY}px`,
  } as CSSProperties;
}

function playerSpriteStyle(spriteSheet: string, weaponLevel: number): CSSProperties {
  return {
    "--player-sprite-image": `url("${spriteSheet}")`,
    "--player-sprite-position": getCharacterSpritePosition(weaponLevel),
  } as CSSProperties;
}

const playerProfessionClass: Record<GameProfile["professionId"], string> = {
  artisan: styles.professionArtisan,
  enchanter: styles.professionEnchanter,
  miner: styles.professionMiner,
  pathfinder: styles.professionPathfinder,
  tactician: styles.professionTactician,
  warden: styles.professionWarden,
};

function playerClass(state: CombatState, hasSprite: boolean, isMoving: boolean, professionId: GameProfile["professionId"]) {
  const isProtected = state.timeMs < state.player.invulnerableUntil;
  const isDodging = state.timeMs < state.player.dodgeUntil;
  const isPrecise = state.timeMs < state.player.precisionUntil;
  const isAttacking = state.timeMs < state.player.attackUntil;
  const isCasting = state.timeMs < state.player.abilityUntil;
  const hasCombo = state.combo > 0;
  const professionClass = hasSprite ? playerProfessionClass[professionId] || "" : "";
  return `${styles.player}${hasSprite ? ` ${styles.hasSprite}` : ""}${professionClass ? ` ${professionClass}` : ""}${isProtected ? ` ${styles.isProtected}` : ""}${
    isDodging ? ` ${styles.isDodging}` : ""
  }${isPrecise ? ` ${styles.isPrecise}` : ""}${isAttacking ? ` ${styles.isAttacking}` : ""}${isCasting ? ` ${styles.isCasting}` : ""}${
    hasCombo ? ` ${styles.hasCombo}` : ""
  }${isMoving ? ` ${styles.isMoving}` : ""}`;
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

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
