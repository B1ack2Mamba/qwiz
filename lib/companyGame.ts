export type ProfessionId = "pathfinder" | "miner" | "warden" | "artisan" | "enchanter" | "tactician";
export type ResourceId = "ore" | "essence" | "schematics" | "supplies";
export type GearSlot = "weapon" | "armor";

export type ResourceBag = Record<ResourceId, number>;

export type Profession = {
  id: ProfessionId;
  name: string;
  role: string;
  function: string;
  bonus: string;
  crest: string;
};

export type DailyMission = {
  id: string;
  title: string;
  type: string;
  description: string;
  power: number;
  rewards: Partial<ResourceBag>;
};

export type MobEncounter = {
  id: string;
  name: string;
  threat: number;
  reward: Partial<ResourceBag>;
  weakness: ProfessionId;
};

export type GameProfile = {
  employeeId: string;
  dayKey: string;
  professionId: ProfessionId;
  level: number;
  xp: number;
  energy: number;
  resources: ResourceBag;
  gear: Record<GearSlot, number>;
  completedMissions: string[];
  defeatedMobs: string[];
  battleContribution: number;
  log: string[];
  updatedAt: string;
};

export const resourceLabels: Record<ResourceId, string> = {
  ore: "Металл",
  essence: "Эфир",
  schematics: "Схемы",
  supplies: "Провиант",
};

export const professions: Profession[] = [
  {
    id: "pathfinder",
    name: "Следопыт",
    role: "Разведка",
    function: "Открывает безопасные маршруты и чаще находит редкие задания.",
    bonus: "+15 к заданиям лабиринта",
    crest: "SL",
  },
  {
    id: "miner",
    name: "Добытчик",
    role: "Ресурсы",
    function: "Приносит металл и провиант для команды.",
    bonus: "+1 металл за ежедневные задания",
    crest: "DB",
  },
  {
    id: "warden",
    name: "Охотник",
    role: "Бои",
    function: "Выходит на мобов и снижает угрозу месяца.",
    bonus: "+18 к рейдам против мобов",
    crest: "OH",
  },
  {
    id: "artisan",
    name: "Ремесленник",
    role: "Крафт",
    function: "Дешевле улучшает оружие и броню.",
    bonus: "-1 металл к улучшению",
    crest: "RM",
  },
  {
    id: "enchanter",
    name: "Усилитель",
    role: "Эфир",
    function: "Усиляет экипировку и повышает общий вклад в битву.",
    bonus: "+1 эфир при усилении",
    crest: "US",
  },
  {
    id: "tactician",
    name: "Тактик",
    role: "Команда",
    function: "Собирает вклад игроков в месячную битву.",
    bonus: "+20 к командной готовности",
    crest: "TK",
  },
];

export const dailyMissions: DailyMission[] = [
  {
    id: "knowledge",
    title: "Совет знаний",
    type: "Вопросы",
    description: "Ответить на короткий набор вопросов по процессам компании.",
    power: 24,
    rewards: { schematics: 2, supplies: 1 },
  },
  {
    id: "maze",
    title: "Лабиринт маршрутов",
    type: "Лабиринт",
    description: "Найти путь через карту задач без лишних шагов.",
    power: 28,
    rewards: { ore: 1, essence: 1 },
  },
  {
    id: "merge",
    title: "Ядро 2048",
    type: "Головоломка",
    description: "Собрать цепочку чисел и зарядить командный артефакт.",
    power: 30,
    rewards: { essence: 2 },
  },
  {
    id: "cipher",
    title: "Шифр отдела",
    type: "Логика",
    description: "Решить мини-задачу и открыть чертеж улучшения.",
    power: 26,
    rewards: { schematics: 1, ore: 1 },
  },
];

export const mobEncounters: MobEncounter[] = [
  {
    id: "drone",
    name: "Сбойный дрон",
    threat: 42,
    weakness: "warden",
    reward: { ore: 2, supplies: 1 },
  },
  {
    id: "shadow-process",
    name: "Теневой процесс",
    threat: 58,
    weakness: "enchanter",
    reward: { essence: 2, schematics: 1 },
  },
  {
    id: "archive-guard",
    name: "Архивный страж",
    threat: 74,
    weakness: "tactician",
    reward: { schematics: 2, ore: 2 },
  },
];

export function createGameProfile(employeeId: string, dayKey: string): GameProfile {
  return {
    employeeId,
    dayKey,
    professionId: professionFromEmployee(employeeId),
    level: 1,
    xp: 0,
    energy: 4,
    resources: {
      ore: 3,
      essence: 2,
      schematics: 2,
      supplies: 3,
    },
    gear: {
      weapon: 1,
      armor: 1,
    },
    completedMissions: [],
    defeatedMobs: [],
    battleContribution: 0,
    log: ["Герой принят в корпоративную лигу."],
    updatedAt: new Date().toISOString(),
  };
}

export function refreshDailyProfile(profile: GameProfile, dayKey: string) {
  if (profile.dayKey === dayKey) {
    return profile;
  }

  return touch({
    ...profile,
    dayKey,
    energy: 4,
    completedMissions: [],
    defeatedMobs: [],
    log: [`Новый игровой день открыт: ${dayKey}.`, ...profile.log].slice(0, 8),
  });
}

export function getProfession(id: ProfessionId) {
  return professions.find((profession) => profession.id === id) || professions[0];
}

export function getPower(profile: GameProfile) {
  const gearPower = profile.gear.weapon * 22 + profile.gear.armor * 18;
  const professionPower = profile.professionId === "tactician" ? 20 : 0;
  return profile.level * 25 + gearPower + profile.battleContribution + professionPower;
}

export function completeMission(profile: GameProfile, mission: DailyMission) {
  if (profile.completedMissions.includes(mission.id) || profile.energy <= 0) {
    return profile;
  }

  const next = cloneProfile(profile);
  next.energy -= 1;
  next.xp += mission.power;
  next.completedMissions.push(mission.id);
  addRewards(next.resources, mission.rewards);

  if (next.professionId === "miner") {
    next.resources.ore += 1;
  }

  if (next.xp >= next.level * 90) {
    next.xp -= next.level * 90;
    next.level += 1;
    next.energy += 1;
    next.log.unshift(`Получен ${next.level} уровень.`);
  }

  next.log.unshift(`Задание закрыто: ${mission.title}.`);
  return touch(next);
}

export function fightMob(profile: GameProfile, mob: MobEncounter) {
  if (profile.defeatedMobs.includes(mob.id) || profile.energy <= 0) {
    return profile;
  }

  const next = cloneProfile(profile);
  const power = getPower(next) + (next.professionId === mob.weakness ? 18 : 0);
  next.energy -= 1;

  if (power >= mob.threat) {
    next.defeatedMobs.push(mob.id);
    next.xp += mob.threat;
    next.battleContribution += 8;
    addRewards(next.resources, mob.reward);
    next.log.unshift(`Победа над целью: ${mob.name}.`);
  } else {
    next.xp += 12;
    next.log.unshift(`${mob.name}: нужна подготовка сильнее.`);
  }

  return touch(next);
}

export function upgradeGear(profile: GameProfile, slot: GearSlot) {
  const currentLevel = profile.gear[slot];
  if (currentLevel >= 3) {
    return profile;
  }

  const oreCost = Math.max(1, currentLevel + 1 - (profile.professionId === "artisan" ? 1 : 0));
  const essenceCost = currentLevel;
  const schematicCost = currentLevel;

  if (
    profile.resources.ore < oreCost ||
    profile.resources.essence < essenceCost ||
    profile.resources.schematics < schematicCost
  ) {
    return profile;
  }

  const next = cloneProfile(profile);
  next.resources.ore -= oreCost;
  next.resources.essence -= essenceCost;
  next.resources.schematics -= schematicCost;
  next.gear[slot] = currentLevel + 1;
  next.battleContribution += slot === "weapon" ? 6 : 5;

  if (next.professionId === "enchanter") {
    next.resources.essence += 1;
  }

  next.log.unshift(`${slot === "weapon" ? "Оружие" : "Броня"} улучшено до уровня ${next.gear[slot]}.`);
  return touch(next);
}

export function contributeToBattle(profile: GameProfile) {
  if (profile.resources.supplies < 1 || profile.resources.essence < 1) {
    return profile;
  }

  const next = cloneProfile(profile);
  next.resources.supplies -= 1;
  next.resources.essence -= 1;
  next.battleContribution += next.professionId === "tactician" ? 14 : 9;
  next.log.unshift("Вклад внесен в месячную битву.");
  return touch(next);
}

export function changeProfession(profile: GameProfile, professionId: ProfessionId) {
  if (profile.professionId === professionId) {
    return profile;
  }

  const next = cloneProfile(profile);
  next.professionId = professionId;
  next.log.unshift(`Профессия изменена: ${getProfession(professionId).name}.`);
  return touch(next);
}

function addRewards(resources: ResourceBag, rewards: Partial<ResourceBag>) {
  for (const [resource, amount] of Object.entries(rewards) as Array<[ResourceId, number]>) {
    resources[resource] += amount;
  }
}

function cloneProfile(profile: GameProfile): GameProfile {
  return {
    ...profile,
    resources: { ...profile.resources },
    gear: { ...profile.gear },
    completedMissions: profile.completedMissions.slice(),
    defeatedMobs: profile.defeatedMobs.slice(),
    log: profile.log.slice(0, 8),
  };
}

function touch(profile: GameProfile) {
  return {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
}

function professionFromEmployee(employeeId: string): ProfessionId {
  const checksum = employeeId.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return professions[checksum % professions.length].id;
}
