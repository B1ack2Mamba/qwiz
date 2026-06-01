import { GameProfile, ProfessionId } from "./companyGame";

export const ARENA_WIDTH = 1000;
export const ARENA_HEIGHT = 560;
const COMBO_WINDOW_MS = 2600;

export type Vector2 = {
  x: number;
  y: number;
};

export type CombatStatus = "fighting" | "victory" | "defeat";
export type CombatAbilityId = "route-dash" | "ore-breaker" | "blade-fan" | "guard-pulse" | "ether-chain" | "rally-command";
export type CombatRank = "S" | "A" | "B" | "C";
export type EnemyAttackKind = "slash" | "blast" | "rush" | "shock";

export type CombatRankBreakdown = {
  clearScore: number;
  hpScore: number;
  comboScore: number;
  precisionScore: number;
  damagePenalty: number;
  score: number;
};

export type CombatAbility = {
  id: CombatAbilityId;
  name: string;
  description: string;
  cooldownMs: number;
  power: number;
};

export type CombatPlayer = {
  position: Vector2;
  facing: Vector2;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackArc: number;
  attackCooldownMs: number;
  attackReadyAt: number;
  attackUntil: number;
  ability: CombatAbility;
  abilityReadyAt: number;
  abilityUntil: number;
  stamina: number;
  maxStamina: number;
  staminaRegenPerSecond: number;
  dodgeCost: number;
  dodgeDistance: number;
  dodgeCooldownMs: number;
  dodgeReadyAt: number;
  dodgeUntil: number;
  precisionUntil: number;
  invulnerableUntil: number;
};

export type CombatEnemy = {
  id: string;
  name: string;
  position: Vector2;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  contactDamage: number;
  attackKind: EnemyAttackKind;
  attackRange: number;
  attackRadius: number;
  attackDamage: number;
  attackCooldownMs: number;
  attackReadyAt: number;
  attackLandsAt: number;
  attackUntil: number;
  attackTarget: Vector2;
  attackApplied: boolean;
  hitUntil: number;
  stunUntil: number;
};

export type CombatState = {
  player: CombatPlayer;
  enemies: CombatEnemy[];
  wave: number;
  timeMs: number;
  combo: number;
  comboUntil: number;
  maxCombo: number;
  damageDealt: number;
  damageTaken: number;
  defeatedCount: number;
  precisionDodges: number;
  status: CombatStatus;
  lastEvent: string;
};

export function createCombatTrainingState(profile: GameProfile, heroPower: number, wave = 1): CombatState {
  const strike = profile.enhancements.strike || 0;
  const guard = profile.enhancements.guard || 0;
  const route = profile.enhancements.route || 0;
  const spark = profile.enhancements.spark || 0;
  const banner = profile.enhancements.banner || 0;
  const profession = getProfessionCombatBonus(profile.professionId);
  const safeWave = Math.max(1, Math.floor(wave));
  const maxStamina = 100 + route * 7 + profession.stamina;

  return {
    player: {
      position: { x: 250, y: ARENA_HEIGHT / 2 },
      facing: { x: 1, y: 0 },
      hp: 96 + profile.level * 10 + guard * 16 + profession.hp,
      maxHp: 96 + profile.level * 10 + guard * 16 + profession.hp,
      radius: 26,
      speed: 0.22 + route * 0.012 + profession.speed,
      attackDamage: 19 + Math.floor(heroPower / 22) + strike * 5 + banner * 2 + profession.damage,
      attackRange: 120 + spark * 7 + route * 5 + profession.range,
      attackArc: Math.PI * (0.58 + Math.min(0.16, spark * 0.025)),
      attackCooldownMs: Math.max(260, 470 - strike * 24 - spark * 12),
      attackReadyAt: 0,
      attackUntil: 0,
      ability: createCombatAbility(profile),
      abilityReadyAt: 0,
      abilityUntil: 0,
      stamina: maxStamina,
      maxStamina,
      staminaRegenPerSecond: 22 + route * 1.8 + profession.staminaRegen,
      dodgeCost: Math.max(24, 36 - route * 1.4),
      dodgeDistance: 112 + route * 8 + profession.dodge,
      dodgeCooldownMs: Math.max(340, 620 - route * 22),
      dodgeReadyAt: 0,
      dodgeUntil: 0,
      precisionUntil: 0,
      invulnerableUntil: 0,
    },
    enemies: createWaveEnemies(profile, heroPower, safeWave),
    wave: safeWave,
    timeMs: 0,
    combo: 0,
    comboUntil: 0,
    maxCombo: 0,
    damageDealt: 0,
    damageTaken: 0,
    defeatedCount: 0,
    precisionDodges: 0,
    status: "fighting",
    lastEvent: `Тренировочная волна ${safeWave} началась.`,
  };
}

export function getCombatTrainingRank(state: CombatState): { rank: CombatRank; score: number } {
  const { score } = getCombatTrainingRankBreakdown(state);

  if (score >= 85) {
    return { rank: "S", score };
  }

  if (score >= 70) {
    return { rank: "A", score };
  }

  if (score >= 50) {
    return { rank: "B", score };
  }

  return { rank: "C", score };
}

export function getCombatTrainingRankBreakdown(state: CombatState): CombatRankBreakdown {
  const clearScore = state.status === "victory" ? 35 : state.status === "defeat" ? 0 : 12;
  const hpScore = Math.round(clamp(state.player.hp / state.player.maxHp, 0, 1) * 25);
  const comboScore = Math.min(20, state.maxCombo * 4);
  const precisionScore = Math.min(15, state.precisionDodges * 5);
  const damagePenalty = Math.min(20, Math.floor((state.damageTaken / state.player.maxHp) * 30));
  const score = clamp(clearScore + hpScore + comboScore + precisionScore - damagePenalty, 0, 100);

  return {
    clearScore,
    hpScore,
    comboScore,
    precisionScore,
    damagePenalty,
    score,
  };
}

export function createNextCombatTrainingWave(state: CombatState, profile: GameProfile, heroPower: number): CombatState {
  const next = createCombatTrainingState(profile, heroPower, state.wave + 1);
  next.player.hp = Math.min(next.player.maxHp, Math.max(1, state.player.hp) + Math.ceil(next.player.maxHp * 0.24));
  next.lastEvent = `Волна ${next.wave}: цели стали сильнее.`;
  return next;
}

export function stepCombatTraining(state: CombatState, move: Vector2, deltaMs: number): CombatState {
  const frameMs = Math.max(0, Math.min(deltaMs, 48));
  const timeMs = state.timeMs + frameMs;
  const player: CombatPlayer = {
    ...state.player,
    position: { ...state.player.position },
    facing: { ...state.player.facing },
  };
  const enemies = state.enemies.map((enemy) => ({
    ...enemy,
    position: { ...enemy.position },
    attackTarget: { ...enemy.attackTarget },
  }));
  let status = state.status;
  let lastEvent = state.lastEvent;
  let combo = state.combo;
  let comboUntil = state.comboUntil;
  const maxCombo = state.maxCombo;
  let damageTaken = state.damageTaken;

  if (status === "fighting") {
    const direction = normalize(move);
    player.stamina = clamp(player.stamina + player.staminaRegenPerSecond * (frameMs / 1000), 0, player.maxStamina);

    if (combo > 0 && timeMs > comboUntil) {
      combo = 0;
      comboUntil = 0;
    }

    if (direction) {
      player.facing = direction;
      player.position = clampPosition(
        {
          x: player.position.x + direction.x * player.speed * frameMs,
          y: player.position.y + direction.y * player.speed * frameMs,
        },
        player.radius,
      );
    }

    for (const enemy of enemies) {
      if (enemy.hp <= 0 || player.hp <= 0) {
        continue;
      }

      if (timeMs < enemy.stunUntil) {
        enemy.attackLandsAt = 0;
        enemy.attackUntil = 0;
        enemy.attackApplied = false;
        continue;
      }

      if (enemy.attackLandsAt > 0 && timeMs >= enemy.attackLandsAt && !enemy.attackApplied) {
        enemy.attackApplied = true;
        enemy.attackUntil = timeMs + 150;

        if (
          getDistance(enemy.attackTarget, player.position) <= enemy.attackRadius + player.radius &&
          timeMs >= player.invulnerableUntil
        ) {
          const actualDamage = Math.min(player.hp, enemy.attackDamage);
          player.hp = Math.max(0, player.hp - actualDamage);
          player.invulnerableUntil = timeMs + 760;
          player.precisionUntil = 0;
          damageTaken += actualDamage;
          combo = 0;
          comboUntil = 0;
          lastEvent = `${enemy.name}: спецатака -${actualDamage} HP.`;
        }
      }

      if (enemy.attackUntil > 0 && timeMs > enemy.attackUntil) {
        enemy.attackLandsAt = 0;
        enemy.attackUntil = 0;
        enemy.attackApplied = false;
      }

      const isPreparingAttack = enemy.attackLandsAt > timeMs && !enemy.attackApplied;
      const chaseDirection = normalize({
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y,
      });
      const distanceToPlayer = getDistance(enemy.position, player.position);

      if (!isPreparingAttack && distanceToPlayer <= enemy.attackRange && timeMs >= enemy.attackReadyAt) {
        const windupMs = getEnemyWindupMs(enemy.attackKind);
        enemy.attackTarget = getEnemyAttackTarget(enemy, player, windupMs);
        enemy.attackLandsAt = timeMs + windupMs;
        enemy.attackUntil = enemy.attackLandsAt + 190;
        enemy.attackReadyAt = timeMs + enemy.attackCooldownMs;
        enemy.attackApplied = false;
        lastEvent = `${enemy.name} готовит ${getEnemyAttackLabel(enemy.attackKind)}.`;
        continue;
      }

      if (!isPreparingAttack && chaseDirection && distanceToPlayer > player.radius + enemy.radius + 7) {
        enemy.position = clampPosition(
          {
            x: enemy.position.x + chaseDirection.x * enemy.speed * frameMs,
            y: enemy.position.y + chaseDirection.y * enemy.speed * frameMs,
          },
          enemy.radius,
        );
      }

      const contactDistance = getDistance(enemy.position, player.position);

      if (
        contactDistance <= player.radius + enemy.radius + 5 &&
        timeMs >= player.invulnerableUntil
      ) {
        const actualDamage = Math.min(player.hp, enemy.contactDamage);
        player.hp = Math.max(0, player.hp - actualDamage);
        player.invulnerableUntil = timeMs + 720;
        player.precisionUntil = 0;
        damageTaken += actualDamage;
        combo = 0;
        comboUntil = 0;
        lastEvent = `${enemy.name} наносит урон: -${actualDamage}.`;
      }
    }

    if (player.hp <= 0) {
      status = "defeat";
      lastEvent = "Герой выбит из тренировки.";
    } else if (enemies.every((enemy) => enemy.hp <= 0)) {
      status = "victory";
      lastEvent = "Волна зачищена без потерь.";
    }
  }

  return {
    ...state,
    player,
    enemies,
    timeMs,
    combo,
    comboUntil,
    maxCombo,
    damageTaken,
    status,
    lastEvent,
  };
}

export function faceCombatPoint(state: CombatState, point: Vector2): CombatState {
  const facing = normalize({
    x: point.x - state.player.position.x,
    y: point.y - state.player.position.y,
  });

  if (!facing) {
    return state;
  }

  return {
    ...state,
    player: {
      ...state.player,
      facing,
    },
  };
}

export function performCombatAttack(state: CombatState): CombatState {
  if (state.status !== "fighting") {
    return state;
  }

  if (state.timeMs < state.player.attackReadyAt) {
    return {
      ...state,
      lastEvent: "Атака восстанавливается.",
    };
  }

  const hasPrecisionStrike = state.timeMs < state.player.precisionUntil;
  const player = {
    ...state.player,
    attackReadyAt: state.timeMs + state.player.attackCooldownMs,
    attackUntil: state.timeMs + (hasPrecisionStrike ? 220 : 170),
    precisionUntil: hasPrecisionStrike ? 0 : state.player.precisionUntil,
  };
  const baseDamage = player.attackDamage + Math.min(state.combo, 5) * 2;
  const damage = hasPrecisionStrike ? Math.round(baseDamage * 1.35) : baseDamage;
  let hitCount = 0;
  let interruptCount = 0;
  let damageDealt = state.damageDealt;
  let defeatedCount = state.defeatedCount;
  const defeatedNames: string[] = [];

  const enemies = state.enemies.map((enemy) => {
    if (enemy.hp <= 0 || !isEnemyInAttackArc(player, enemy)) {
      return enemy;
    }

    const nextHp = Math.max(0, enemy.hp - damage);
    damageDealt += enemy.hp - nextHp;
    const wasPreparingAttack = enemy.attackLandsAt > state.timeMs && !enemy.attackApplied;
    const interruptMs = (wasPreparingAttack ? 520 : 130) + (hasPrecisionStrike ? 180 : 0);
    const knockbackDistance = 20 + Math.min(state.combo, 5) * 4 + (hasPrecisionStrike ? 18 : 0);
    hitCount += 1;

    if (enemy.hp > 0 && nextHp <= 0) {
      defeatedCount += 1;
      defeatedNames.push(enemy.name);
    }

    if (wasPreparingAttack) {
      interruptCount += 1;
    }

    return {
      ...enemy,
      attackLandsAt: wasPreparingAttack ? 0 : enemy.attackLandsAt,
      attackUntil: wasPreparingAttack ? 0 : enemy.attackUntil,
      attackApplied: wasPreparingAttack ? false : enemy.attackApplied,
      attackReadyAt: wasPreparingAttack ? Math.max(enemy.attackReadyAt, state.timeMs + 560) : enemy.attackReadyAt,
      hp: nextHp,
      position: pushAway(enemy.position, player.position, knockbackDistance, enemy.radius),
      hitUntil: state.timeMs + 220,
      stunUntil: Math.max(enemy.stunUntil, state.timeMs + interruptMs),
    };
  });

  const status = player.hp <= 0 ? "defeat" : enemies.every((enemy) => enemy.hp <= 0) ? "victory" : "fighting";
  const comboGain = hasPrecisionStrike ? 2 : 1;
  const combo = hitCount > 0 ? Math.min(state.combo + comboGain, 6) : 0;
  const comboUntil = hitCount > 0 ? state.timeMs + COMBO_WINDOW_MS : 0;
  const maxCombo = Math.max(state.maxCombo, combo);
  let lastEvent = hitCount > 0 ? `Попаданий: ${hitCount}. Урон: -${damage}.` : "Атака прошла мимо.";

  if (hasPrecisionStrike && hitCount > 0) {
    lastEvent = `Точная контратака: ${hitCount}. Урон: -${damage}.`;
  }

  if (interruptCount > 0) {
    lastEvent = `Прервано атак: ${interruptCount}. Урон: -${damage}.`;
  }

  if (hasPrecisionStrike && interruptCount > 0) {
    lastEvent = `Контратака сорвала атак: ${interruptCount}. Урон: -${damage}.`;
  }

  if (defeatedNames.length > 0) {
    lastEvent = `Цель повержена: ${defeatedNames.join(", ")}.`;
  }

  if (status === "victory") {
    lastEvent = "Волна зачищена. Тренировка успешна.";
  }

  return {
    ...state,
    player,
    enemies,
    combo,
    comboUntil,
    maxCombo,
    damageDealt,
    defeatedCount,
    status,
    lastEvent,
  };
}

export function performCombatDodge(state: CombatState, move: Vector2 = { x: 0, y: 0 }): CombatState {
  if (state.status !== "fighting") {
    return state;
  }

  if (state.timeMs < state.player.dodgeReadyAt) {
    return {
      ...state,
      lastEvent: "Уклонение восстанавливается.",
    };
  }

  if (state.player.stamina < state.player.dodgeCost) {
    return {
      ...state,
      lastEvent: "Не хватает выносливости для уклонения.",
    };
  }

  const direction = normalize(move) || normalize(state.player.facing) || { x: 1, y: 0 };
  const nextPosition = clampPosition(
    {
      x: state.player.position.x + direction.x * state.player.dodgeDistance,
      y: state.player.position.y + direction.y * state.player.dodgeDistance,
    },
    state.player.radius,
  );
  const isPrecisionDodge = doesDodgeEvadeTelegraph(state, nextPosition);
  const staminaAfterCost = Math.max(0, state.player.stamina - state.player.dodgeCost);
  const staminaRefund = isPrecisionDodge ? Math.ceil(state.player.dodgeCost * 0.72) + 8 : 0;
  const player: CombatPlayer = {
    ...state.player,
    attackReadyAt: isPrecisionDodge ? Math.min(state.player.attackReadyAt, state.timeMs) : state.player.attackReadyAt,
    facing: direction,
    stamina: clamp(staminaAfterCost + staminaRefund, 0, state.player.maxStamina),
    dodgeReadyAt: state.timeMs + state.player.dodgeCooldownMs,
    dodgeUntil: state.timeMs + (isPrecisionDodge ? 340 : 260),
    invulnerableUntil: Math.max(state.player.invulnerableUntil, state.timeMs + (isPrecisionDodge ? 460 : 360)),
    precisionUntil: isPrecisionDodge ? state.timeMs + 1550 : state.player.precisionUntil,
    position: nextPosition,
  };
  const combo = Math.min(state.combo + (isPrecisionDodge ? 2 : 1), 6);
  const comboUntil = state.timeMs + COMBO_WINDOW_MS;
  const maxCombo = Math.max(state.maxCombo, combo);

  return {
    ...state,
    player,
    combo,
    comboUntil,
    maxCombo,
    precisionDodges: state.precisionDodges + (isPrecisionDodge ? 1 : 0),
    lastEvent: isPrecisionDodge ? "Точное уклонение: окно контратаки открыто." : "Уклонение: герой вышел из опасной зоны.",
  };
}

export function performCombatAbility(state: CombatState): CombatState {
  if (state.status !== "fighting") {
    return state;
  }

  if (state.timeMs < state.player.abilityReadyAt) {
    return {
      ...state,
      lastEvent: `${state.player.ability.name} восстанавливается.`,
    };
  }

  const player: CombatPlayer = {
    ...state.player,
    position: { ...state.player.position },
    facing: { ...state.player.facing },
    abilityReadyAt: state.timeMs + state.player.ability.cooldownMs,
    abilityUntil: state.timeMs + 280,
  };
  let enemies = state.enemies.map((enemy) => ({
    ...enemy,
    position: { ...enemy.position },
    attackTarget: { ...enemy.attackTarget },
  }));
  let defeatedCount = state.defeatedCount;
  let combo = state.combo;
  let damageDealt = state.damageDealt;
  let lastEvent = "";

  if (player.ability.id === "route-dash") {
    const start = { ...player.position };
    const distance = 155 + player.ability.power * 22;
    player.position = clampPosition(
      {
        x: player.position.x + player.facing.x * distance,
        y: player.position.y + player.facing.y * distance,
      },
      player.radius,
    );
    player.invulnerableUntil = state.timeMs + 420;

    const result = damageEnemies(
      enemies,
      (enemy) => getDistanceToSegment(enemy.position, start, player.position) <= enemy.radius + 32,
      Math.round(player.attackDamage * 0.9) + player.ability.power * 4,
      state.timeMs,
      420,
    );
    enemies = result.enemies;
    damageDealt += result.damageDealt;
    defeatedCount += result.defeatedNames.length;
    combo = result.hitCount > 0 ? Math.min(combo + 1, 6) : combo;
    lastEvent = result.hitCount > 0 ? `Маршрутный рывок задел целей: ${result.hitCount}.` : "Маршрутный рывок вывел героя из-под удара.";
  } else if (player.ability.id === "ore-breaker") {
    const target = getNearestEnemy(enemies, player.position, 190 + player.ability.power * 10);
    if (target) {
      const result = damageEnemies(
        enemies,
        (enemy) => enemy.id === target.id,
        Math.round(player.attackDamage * 2.2) + player.ability.power * 8,
        state.timeMs,
        850,
      );
      enemies = result.enemies;
      damageDealt += result.damageDealt;
      defeatedCount += result.defeatedNames.length;
      combo = Math.min(combo + 2, 6);
      lastEvent = `Разлом руды оглушает цель: ${target.name}.`;
    } else {
      lastEvent = "Разлом руды не нашел цель рядом.";
    }
  } else if (player.ability.id === "blade-fan") {
    const result = damageEnemies(
      enemies,
      (enemy) => getDistance(enemy.position, player.position) <= 165 + player.ability.power * 10 + enemy.radius,
      Math.round(player.attackDamage * 1.35) + player.ability.power * 5,
      state.timeMs,
      260,
    );
    enemies = result.enemies;
    damageDealt += result.damageDealt;
    defeatedCount += result.defeatedNames.length;
    combo = result.hitCount > 0 ? Math.min(combo + 2, 6) : 0;
    lastEvent = result.hitCount > 0 ? `Клинковый веер попал по целям: ${result.hitCount}.` : "Клинковый веер не достал цели.";
  } else if (player.ability.id === "guard-pulse") {
    const heal = 22 + player.ability.power * 12;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    player.invulnerableUntil = state.timeMs + 1100 + player.ability.power * 120;

    const result = damageEnemies(
      enemies,
      (enemy) => getDistance(enemy.position, player.position) <= 145 + player.ability.power * 8 + enemy.radius,
      Math.round(player.attackDamage * 0.65) + player.ability.power * 3,
      state.timeMs,
      620,
    );
    enemies = result.enemies;
    damageDealt += result.damageDealt;
    defeatedCount += result.defeatedNames.length;
    lastEvent = `Щитовой импульс восстановил ${heal} HP.`;
  } else if (player.ability.id === "ether-chain") {
    const chainTargets = getNearestEnemies(enemies, player.position, 3 + Math.min(2, Math.floor(player.ability.power / 2)), 370 + player.ability.power * 18);
    const targetIds = new Set(chainTargets.map((enemy) => enemy.id));
    const result = damageEnemies(
      enemies,
      (enemy) => targetIds.has(enemy.id),
      Math.round(player.attackDamage * 1.05) + player.ability.power * 7,
      state.timeMs,
      520,
    );
    enemies = result.enemies;
    damageDealt += result.damageDealt;
    defeatedCount += result.defeatedNames.length;
    combo = result.hitCount > 0 ? Math.min(combo + 1, 6) : combo;
    lastEvent = result.hitCount > 0 ? `Эфирная цепь прошла по целям: ${result.hitCount}.` : "Эфирная цепь не нашла цели.";
  } else {
    const commandTargets = getNearestEnemies(enemies, player.position, 3 + Math.min(2, player.ability.power), 320 + player.ability.power * 16);
    const targetIds = new Set(commandTargets.map((enemy) => enemy.id));
    const result = damageEnemies(
      enemies,
      (enemy) => targetIds.has(enemy.id),
      player.attackDamage + player.ability.power * 6,
      state.timeMs,
      460,
    );
    enemies = result.enemies;
    damageDealt += result.damageDealt;
    defeatedCount += result.defeatedNames.length;
    player.attackReadyAt = Math.min(player.attackReadyAt, state.timeMs + 80);
    combo = result.hitCount > 0 ? Math.min(combo + 3, 6) : Math.min(combo + 1, 6);
    lastEvent = result.hitCount > 0 ? `Приказ отряда сбил целей: ${result.hitCount}.` : "Приказ отряда ускорил следующую атаку.";
  }

  const status = player.hp <= 0 ? "defeat" : enemies.every((enemy) => enemy.hp <= 0) ? "victory" : "fighting";

  if (status === "victory") {
    lastEvent = "Волна зачищена. Тренировка успешна.";
  }
  const comboUntil = combo > 0 ? state.timeMs + COMBO_WINDOW_MS : 0;
  const maxCombo = Math.max(state.maxCombo, combo);

  return {
    ...state,
    player,
    enemies,
    combo,
    comboUntil,
    maxCombo,
    damageDealt,
    defeatedCount,
    status,
    lastEvent,
  };
}

function createEnemy(
  id: string,
  name: string,
  x: number,
  y: number,
  hp: number,
  radius: number,
  speed: number,
  contactDamage: number,
  attackKind: EnemyAttackKind,
): CombatEnemy {
  const attack = getEnemyAttackStats(attackKind, contactDamage);

  return {
    id,
    name,
    position: { x, y },
    hp,
    maxHp: hp,
    radius,
    speed,
    contactDamage,
    attackKind,
    attackRange: attack.range,
    attackRadius: attack.radius,
    attackDamage: attack.damage,
    attackCooldownMs: attack.cooldownMs,
    attackReadyAt: 700,
    attackLandsAt: 0,
    attackUntil: 0,
    attackTarget: { x, y },
    attackApplied: false,
    hitUntil: 0,
    stunUntil: 0,
  };
}

function createCombatAbility(profile: GameProfile): CombatAbility {
  const abilities: Record<ProfessionId, CombatAbility> = {
    pathfinder: {
      id: "route-dash",
      name: "Маршрутный рывок",
      description: "Рывок вперед с короткой неуязвимостью и уроном по линии.",
      cooldownMs: Math.max(1500, 3100 - (profile.enhancements.route || 0) * 120),
      power: profile.enhancements.route || 0,
    },
    miner: {
      id: "ore-breaker",
      name: "Разлом руды",
      description: "Тяжелый удар по ближайшей цели с долгим оглушением.",
      cooldownMs: Math.max(1800, 3700 - (profile.enhancements.workbench || 0) * 110),
      power: profile.enhancements.workbench || 0,
    },
    warden: {
      id: "blade-fan",
      name: "Клинковый веер",
      description: "Широкая круговая атака по близким целям.",
      cooldownMs: Math.max(1700, 3300 - (profile.enhancements.strike || 0) * 120),
      power: profile.enhancements.strike || 0,
    },
    artisan: {
      id: "guard-pulse",
      name: "Импульс поддержки",
      description: "Лечение, короткая защита и оглушение близких целей.",
      cooldownMs: Math.max(2100, 4300 - (profile.enhancements.guard || 0) * 130),
      power: profile.enhancements.guard || 0,
    },
    enchanter: {
      id: "ether-chain",
      name: "Эфирная цепь",
      description: "Дальняя цепная атака по нескольким целям.",
      cooldownMs: Math.max(1900, 3900 - (profile.enhancements.spark || 0) * 130),
      power: profile.enhancements.spark || 0,
    },
    tactician: {
      id: "rally-command",
      name: "Приказ отряда",
      description: "Оглушает несколько целей и ускоряет следующую атаку.",
      cooldownMs: Math.max(2100, 4200 - (profile.enhancements.banner || 0) * 140),
      power: profile.enhancements.banner || 0,
    },
  };

  return abilities[profile.professionId];
}

function damageEnemies(
  enemies: CombatEnemy[],
  predicate: (enemy: CombatEnemy) => boolean,
  damage: number,
  timeMs: number,
  stunMs: number,
) {
  let hitCount = 0;
  let damageDealt = 0;
  const defeatedNames: string[] = [];
  const nextEnemies = enemies.map((enemy) => {
    if (enemy.hp <= 0 || !predicate(enemy)) {
      return enemy;
    }

    const nextHp = Math.max(0, enemy.hp - damage);
    damageDealt += enemy.hp - nextHp;
    hitCount += 1;

    if (nextHp <= 0) {
      defeatedNames.push(enemy.name);
    }

    return {
      ...enemy,
      hp: nextHp,
      hitUntil: timeMs + 260,
      stunUntil: Math.max(enemy.stunUntil, timeMs + stunMs),
    };
  });

  return {
    damageDealt,
    enemies: nextEnemies,
    defeatedNames,
    hitCount,
  };
}

function getNearestEnemy(enemies: CombatEnemy[], origin: Vector2, maxDistance: number) {
  return getNearestEnemies(enemies, origin, 1, maxDistance)[0] || null;
}

function getNearestEnemies(enemies: CombatEnemy[], origin: Vector2, limit: number, maxDistance: number) {
  return enemies
    .filter((enemy) => enemy.hp > 0)
    .map((enemy) => ({
      enemy,
      distance: getDistance(enemy.position, origin),
    }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ enemy }) => enemy);
}

function getDistanceToSegment(point: Vector2, start: Vector2, end: Vector2) {
  const segment = {
    x: end.x - start.x,
    y: end.y - start.y,
  };
  const lengthSquared = segment.x * segment.x + segment.y * segment.y;

  if (lengthSquared <= 0.001) {
    return getDistance(point, start);
  }

  const projection = clamp(((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) / lengthSquared, 0, 1);
  return getDistance(point, {
    x: start.x + segment.x * projection,
    y: start.y + segment.y * projection,
  });
}

function getEnemyAttackStats(kind: EnemyAttackKind, contactDamage: number) {
  const stats: Record<EnemyAttackKind, { range: number; radius: number; damage: number; cooldownMs: number }> = {
    slash: { range: 92, radius: 42, damage: contactDamage + 6, cooldownMs: 1550 },
    blast: { range: 280, radius: 58, damage: contactDamage + 8, cooldownMs: 2200 },
    rush: { range: 170, radius: 38, damage: contactDamage + 5, cooldownMs: 1750 },
    shock: { range: 240, radius: 72, damage: contactDamage + 10, cooldownMs: 2600 },
  };

  return stats[kind];
}

function getEnemyWindupMs(kind: EnemyAttackKind) {
  const windupMs: Record<EnemyAttackKind, number> = {
    slash: 620,
    blast: 920,
    rush: 700,
    shock: 1120,
  };

  return windupMs[kind];
}

function getEnemyAttackLabel(kind: EnemyAttackKind) {
  const labels: Record<EnemyAttackKind, string> = {
    slash: "ближний разряд",
    blast: "эфирный взрыв",
    rush: "рывок",
    shock: "ударную волну",
  };

  return labels[kind];
}

function getEnemyAttackTarget(enemy: CombatEnemy, player: CombatPlayer, windupMs: number): Vector2 {
  const playerFacing = normalize(player.facing) || { x: 1, y: 0 };
  const approachDirection =
    normalize({
      x: player.position.x - enemy.position.x,
      y: player.position.y - enemy.position.y,
    }) || playerFacing;
  const leadRatio: Record<EnemyAttackKind, number> = {
    slash: 0.22,
    blast: 0.46,
    rush: 0.62,
    shock: 0.32,
  };
  const maxLead: Record<EnemyAttackKind, number> = {
    slash: 30,
    blast: 108,
    rush: 112,
    shock: 82,
  };
  const direction = enemy.attackKind === "rush" ? approachDirection : playerFacing;
  const lead = Math.min(maxLead[enemy.attackKind], player.speed * windupMs * leadRatio[enemy.attackKind]);

  return clampPosition(
    {
      x: player.position.x + direction.x * lead,
      y: player.position.y + direction.y * lead,
    },
    enemy.attackRadius,
  );
}

function createWaveEnemies(profile: GameProfile, heroPower: number, wave: number): CombatEnemy[] {
  const enemyBonus = Math.min(64, Math.floor(profile.level * 3 + heroPower / 28 + (wave - 1) * 15));
  const speedBonus = (wave - 1) * 0.006;
  const damageBonus = Math.floor((wave - 1) * 1.5);
  const enemies = [
    createEnemy("drone-scout", "Сторожевой дрон", 670, 130, 54 + enemyBonus, 22, 0.072 + speedBonus, 8 + damageBonus, "slash"),
    createEnemy("drone-guard", "Бронированный дрон", 795, 285, 74 + enemyBonus, 26, 0.056 + speedBonus, 11 + damageBonus, "slash"),
    createEnemy("drone-spark", "Эфирный разрядник", 650, 430, 62 + enemyBonus, 23, 0.068 + speedBonus, 9 + damageBonus, "blast"),
    createEnemy("drone-core", "Ядро тревоги", 875, 425, 88 + enemyBonus, 30, 0.045 + speedBonus, 13 + damageBonus, "shock"),
  ];

  if (wave >= 2) {
    enemies.push(
      createEnemy("drone-flanker", "Фланговый перехватчик", 865, 100, 46 + enemyBonus, 20, 0.088 + speedBonus, 7 + damageBonus, "rush"),
    );
  }

  if (wave >= 4) {
    enemies.push(createEnemy("drone-bulwark", "Щитовой узел", 900, 515, 96 + enemyBonus, 31, 0.04 + speedBonus, 14 + damageBonus, "shock"));
  }

  return enemies;
}

function getProfessionCombatBonus(professionId: ProfessionId) {
  const bonuses: Record<
    ProfessionId,
    { damage: number; dodge: number; hp: number; range: number; speed: number; stamina: number; staminaRegen: number }
  > = {
    pathfinder: { damage: 1, dodge: 18, hp: 0, range: 10, speed: 0.018, stamina: 12, staminaRegen: 3 },
    miner: { damage: 3, dodge: -6, hp: 10, range: 0, speed: -0.004, stamina: 8, staminaRegen: 0 },
    warden: { damage: 6, dodge: 4, hp: 8, range: 0, speed: 0.006, stamina: 5, staminaRegen: 1 },
    artisan: { damage: 1, dodge: 2, hp: 20, range: 4, speed: 0, stamina: 12, staminaRegen: 2 },
    enchanter: { damage: 3, dodge: 0, hp: 0, range: 18, speed: 0, stamina: 6, staminaRegen: 2 },
    tactician: { damage: 4, dodge: 6, hp: 6, range: 8, speed: 0.004, stamina: 7, staminaRegen: 2 },
  };

  return bonuses[professionId];
}

function isEnemyInAttackArc(player: CombatPlayer, enemy: CombatEnemy) {
  const offset = {
    x: enemy.position.x - player.position.x,
    y: enemy.position.y - player.position.y,
  };
  const distance = getVectorLength(offset);

  if (distance > player.attackRange + enemy.radius) {
    return false;
  }

  if (distance <= player.radius + enemy.radius + 20) {
    return true;
  }

  const targetDirection = {
    x: offset.x / distance,
    y: offset.y / distance,
  };
  const dot = targetDirection.x * player.facing.x + targetDirection.y * player.facing.y;
  return dot >= Math.cos(player.attackArc / 2);
}

function pushAway(position: Vector2, origin: Vector2, distance: number, radius: number): Vector2 {
  const direction =
    normalize({
      x: position.x - origin.x,
      y: position.y - origin.y,
    }) || { x: 1, y: 0 };

  return clampPosition(
    {
      x: position.x + direction.x * distance,
      y: position.y + direction.y * distance,
    },
    radius,
  );
}

function doesDodgeEvadeTelegraph(state: CombatState, nextPosition: Vector2) {
  return state.enemies.some((enemy) => {
    if (enemy.hp <= 0 || enemy.attackApplied || enemy.attackLandsAt <= state.timeMs) {
      return false;
    }

    const timeToImpact = enemy.attackLandsAt - state.timeMs;
    const dangerRadius = enemy.attackRadius + state.player.radius;
    const startsInDanger = getDistance(enemy.attackTarget, state.player.position) <= dangerRadius + 12;
    const endsOutsideDanger = getDistance(enemy.attackTarget, nextPosition) > dangerRadius;

    return timeToImpact <= 560 && startsInDanger && endsOutsideDanger;
  });
}

function clampPosition(position: Vector2, radius: number): Vector2 {
  return {
    x: clamp(position.x, radius, ARENA_WIDTH - radius),
    y: clamp(position.y, radius, ARENA_HEIGHT - radius),
  };
}

function normalize(vector: Vector2): Vector2 | null {
  const length = getVectorLength(vector);

  if (length <= 0.001) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function getDistance(a: Vector2, b: Vector2) {
  return getVectorLength({
    x: a.x - b.x,
    y: a.y - b.y,
  });
}

function getVectorLength(vector: Vector2) {
  return Math.hypot(vector.x, vector.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
