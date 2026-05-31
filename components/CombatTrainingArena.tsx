import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getCharacterSpriteLabel, getCharacterSpritePosition, getCharacterSpriteSheet } from "./CharacterSpritePreview";
import { professionWeaponEnhancement } from "./ProfessionAvatar3D";
import {
  DAILY_COMBAT_TRAINING_REWARD_LIMIT,
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
  performCombatAttack,
  performCombatAbility,
  performCombatDodge,
  stepCombatTraining,
} from "../lib/combatTraining";
import styles from "./CombatTrainingArena.module.css";

type CombatTrainingArenaProps = {
  heroPower: number;
  onClaimReward: (wave: number, defeatedCount: number) => void;
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

    onClaimReward(combatState.wave, combatState.defeatedCount);
    setClaimedWaves((current) => {
      const next = new Set(current);
      next.add(combatState.wave);
      return next;
    });
  }, [claimedWaves, combatState.defeatedCount, combatState.status, combatState.wave, onClaimReward, profile]);

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
  const reward = getCombatTrainingReward(profile, combatState.wave, combatState.defeatedCount);
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
        <div className={styles.attackArc} style={attackArcStyle(combatState)} />
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
              className={`${styles.enemyTelegraph}${isImpact ? ` ${styles.isTelegraphImpact}` : ""}`}
              key={`${enemy.id}-telegraph`}
              style={enemyTelegraphStyle(enemy)}
            />
          );
        })}
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

        {combatState.enemies.map((enemy) => (
          <div
            className={enemyClass(enemy.hp <= 0, enemy.hitUntil > combatState.timeMs, enemy.stunUntil > combatState.timeMs)}
            key={enemy.id}
            style={enemyStyle(enemy.position, enemy.radius)}
          >
            <span>{enemy.name}</span>
            <i style={healthStyle(enemy.hp, enemy.maxHp)} />
          </div>
        ))}
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
                <div className={styles.rewardItems}>
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
              <span>Герой выбит. Можно повторить тренировку с текущими параметрами.</span>
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

function facingStyle(facing: Vector2): CSSProperties {
  return {
    transform: `rotate(${Math.atan2(facing.y, facing.x)}rad)`,
  };
}

function attackArcStyle(state: CombatState): CSSProperties {
  const visible = state.timeMs <= state.player.attackUntil && state.status === "fighting";

  return {
    left: `${(state.player.position.x / ARENA_WIDTH) * 100}%`,
    top: `${(state.player.position.y / ARENA_HEIGHT) * 100}%`,
    width: `${(state.player.attackRange / ARENA_WIDTH) * 100}%`,
    height: `${((state.player.attackRange * 0.72) / ARENA_HEIGHT) * 100}%`,
    opacity: visible ? 1 : 0,
    transform: `translate(2%, -50%) rotate(${Math.atan2(state.player.facing.y, state.player.facing.x)}rad)`,
  };
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

function healthStyle(value: number, max: number): CSSProperties {
  return {
    width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
  };
}

function statusClass(status: CombatState["status"]) {
  return `${styles.statusPill} ${styles[status]}`;
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
  return `${styles.player}${hasSprite ? ` ${styles.hasSprite}` : ""}${isProtected ? ` ${styles.isProtected}` : ""}${
    isDodging ? ` ${styles.isDodging}` : ""
  }${isPrecise ? ` ${styles.isPrecise}` : ""}`;
}

function enemyClass(isDown: boolean, isHit: boolean, isStunned: boolean) {
  return `${styles.enemy}${isDown ? ` ${styles.isDown}` : ""}${isHit ? ` ${styles.isHit}` : ""}${isStunned ? ` ${styles.isStunned}` : ""}`;
}
