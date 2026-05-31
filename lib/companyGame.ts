export type ProfessionId = "pathfinder" | "miner" | "warden" | "artisan" | "enchanter" | "tactician";
export type ResourceId = "ore" | "essence" | "schematics" | "supplies";
export type EnhancementId = "strike" | "guard" | "route" | "spark" | "workbench" | "banner";
export type DungeonId = "archive-depths" | "drone-nest" | "ether-vault" | "command-core";

export type ResourceBag = Record<ResourceId, number>;
export type EnhancementBag = Record<EnhancementId, number>;

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

export type Enhancement = {
  id: EnhancementId;
  name: string;
  school: string;
  description: string;
  power: number;
  cost: Partial<ResourceBag>;
  crest: string;
};

export type Dungeon = {
  id: DungeonId;
  name: string;
  depth: string;
  description: string;
  requiredPower: number;
  requiredEnhancements: Partial<EnhancementBag>;
  rewards: Partial<ResourceBag>;
  specialist: ProfessionId;
  xp: number;
  teamContribution: number;
};

export type GameProfile = {
  employeeId: string;
  dayKey: string;
  professionId: ProfessionId;
  level: number;
  xp: number;
  energy: number;
  resources: ResourceBag;
  enhancements: EnhancementBag;
  completedMissions: string[];
  completedDungeons: DungeonId[];
  battleContribution: number;
  log: string[];
  updatedAt: string;
};

type LegacyGameProfile = Partial<GameProfile> & {
  gear?: Partial<Record<"weapon" | "armor", number>>;
  defeatedMobs?: string[];
};

const enhancementIds: EnhancementId[] = ["strike", "guard", "route", "spark", "workbench", "banner"];

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
    function: "Открывает безопасные маршруты и помогает проходить сложные подземелья.",
    bonus: "+15 к подземельям маршрута",
    crest: "SL",
  },
  {
    id: "miner",
    name: "Добытчик",
    role: "Ресурсы",
    function: "Приносит металл и провиант для усилений команды.",
    bonus: "+1 металл за ежедневные задания",
    crest: "DB",
  },
  {
    id: "warden",
    name: "Охотник",
    role: "Бои",
    function: "Закрывает боевые комнаты подземелий и снижает угрозу месяца.",
    bonus: "+15 к боевым подземельям",
    crest: "OH",
  },
  {
    id: "artisan",
    name: "Ремесленник",
    role: "Крафт",
    function: "Создает усиления дешевле и разгоняет прогресс команды.",
    bonus: "-1 металл к ковке усилений",
    crest: "RM",
  },
  {
    id: "enchanter",
    name: "Усилитель",
    role: "Эфир",
    function: "Заряжает усиления эфиром и повышает силу героя.",
    bonus: "+1 эфир при ковке усиления",
    crest: "US",
  },
  {
    id: "tactician",
    name: "Тактик",
    role: "Команда",
    function: "Собирает вклад игроков и готовит команду к месячной битве.",
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
    description: "Решить мини-задачу и открыть чертеж усиления.",
    power: 26,
    rewards: { schematics: 1, ore: 1 },
  },
];

export const enhancements: Enhancement[] = [
  {
    id: "strike",
    name: "Точный удар",
    school: "Атака",
    description: "Повышает силу в боевых комнатах и ускоряет зачистку целей.",
    power: 12,
    cost: { ore: 1, essence: 1 },
    crest: "AT",
  },
  {
    id: "guard",
    name: "Щит смены",
    school: "Защита",
    description: "Дает запас устойчивости для длинных забегов и командной битвы.",
    power: 11,
    cost: { ore: 1, supplies: 1 },
    crest: "DF",
  },
  {
    id: "route",
    name: "Карта обхода",
    school: "Маршрут",
    description: "Открывает короткие пути и снижает риск в лабиринтах.",
    power: 10,
    cost: { schematics: 1, supplies: 1 },
    crest: "RT",
  },
  {
    id: "spark",
    name: "Эфирная искра",
    school: "Энергия",
    description: "Заряжает редкие механики подземелий и усиливает награды.",
    power: 13,
    cost: { essence: 2 },
    crest: "SP",
  },
  {
    id: "workbench",
    name: "Полевой верстак",
    school: "Крафт",
    description: "Позволяет чинить находки прямо в подземелье и добывать больше схем.",
    power: 9,
    cost: { ore: 1, schematics: 1 },
    crest: "WK",
  },
  {
    id: "banner",
    name: "Знамя отряда",
    school: "Команда",
    description: "Усиливает командный вклад и полезно перед месячной битвой.",
    power: 14,
    cost: { essence: 1, supplies: 2 },
    crest: "BN",
  },
];

export const dungeons: Dungeon[] = [
  {
    id: "archive-depths",
    name: "Нижний архив",
    depth: "D1",
    description: "Короткий спуск через документы, ловушки маршрута и первые награды.",
    requiredPower: 48,
    requiredEnhancements: { route: 1 },
    rewards: { schematics: 2, ore: 1 },
    specialist: "pathfinder",
    xp: 34,
    teamContribution: 6,
  },
  {
    id: "drone-nest",
    name: "Гнездо дронов",
    depth: "D2",
    description: "Боевая зона с быстрыми целями, где важны удар и защита.",
    requiredPower: 72,
    requiredEnhancements: { strike: 1, guard: 1 },
    rewards: { ore: 2, supplies: 2 },
    specialist: "warden",
    xp: 48,
    teamContribution: 8,
  },
  {
    id: "ether-vault",
    name: "Эфирное хранилище",
    depth: "D3",
    description: "Зал нестабильной энергии, который требует заряженных усилений.",
    requiredPower: 102,
    requiredEnhancements: { spark: 2, workbench: 1 },
    rewards: { essence: 3, schematics: 2 },
    specialist: "enchanter",
    xp: 62,
    teamContribution: 11,
  },
  {
    id: "command-core",
    name: "Командное ядро",
    depth: "D4",
    description: "Финальный недельный спуск, где решает общий вклад и знамя отряда.",
    requiredPower: 136,
    requiredEnhancements: { banner: 2, guard: 2, strike: 2 },
    rewards: { essence: 2, schematics: 3, supplies: 3 },
    specialist: "tactician",
    xp: 78,
    teamContribution: 16,
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
    enhancements: createEnhancementBag(),
    completedMissions: [],
    completedDungeons: [],
    battleContribution: 0,
    log: ["Герой принят в корпоративную лигу."],
    updatedAt: new Date().toISOString(),
  };
}

export function refreshDailyProfile(profile: GameProfile, dayKey: string) {
  const normalized = normalizeGameProfile(profile, dayKey);

  if (normalized.dayKey === dayKey) {
    return normalized;
  }

  return touch({
    ...normalized,
    dayKey,
    energy: 4,
    completedMissions: [],
    completedDungeons: [],
    log: [`Новый игровой день открыт: ${dayKey}.`, ...normalized.log].slice(0, 8),
  });
}

export function getProfession(id: ProfessionId) {
  return professions.find((profession) => profession.id === id) || professions[0];
}

export function getEnhancement(id: EnhancementId) {
  return enhancements.find((enhancement) => enhancement.id === id) || enhancements[0];
}

export function getEnhancementPower(profile: GameProfile) {
  return enhancements.reduce((total, enhancement) => {
    return total + (profile.enhancements[enhancement.id] || 0) * enhancement.power;
  }, 0);
}

export function getPower(profile: GameProfile) {
  const professionPower = profile.professionId === "tactician" ? 20 : 0;
  return profile.level * 25 + getEnhancementPower(profile) + profile.battleContribution + professionPower;
}

export function getDungeonPower(profile: GameProfile, dungeon: Dungeon) {
  return getPower(profile) + (profile.professionId === dungeon.specialist ? 15 : 0);
}

export function getEnhancementCost(profile: GameProfile, enhancement: Enhancement) {
  const stacks = profile.enhancements[enhancement.id] || 0;
  const cost: Partial<ResourceBag> = { ...enhancement.cost };

  if (stacks > 0) {
    cost.schematics = (cost.schematics || 0) + 1;
  }

  if (stacks > 1) {
    cost.essence = (cost.essence || 0) + Math.floor(stacks / 2);
  }

  if (stacks > 2) {
    cost.supplies = (cost.supplies || 0) + 1;
  }

  if (profile.professionId === "artisan" && (cost.ore || 0) > 0) {
    cost.ore = Math.max(0, (cost.ore || 0) - 1);
  }

  return compactResources(cost);
}

export function canForgeEnhancement(profile: GameProfile, enhancement: Enhancement) {
  return hasResources(profile.resources, getEnhancementCost(profile, enhancement));
}

export function hasDungeonRequirements(profile: GameProfile, dungeon: Dungeon) {
  return (Object.entries(dungeon.requiredEnhancements) as Array<[EnhancementId, number]>).every(([id, amount]) => {
    return (profile.enhancements[id] || 0) >= amount;
  });
}

export function canEnterDungeon(profile: GameProfile, dungeon: Dungeon) {
  return (
    profile.energy > 0 &&
    !profile.completedDungeons.includes(dungeon.id) &&
    hasDungeonRequirements(profile, dungeon) &&
    getDungeonPower(profile, dungeon) >= dungeon.requiredPower
  );
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

  applyLevelUps(next);
  next.log.unshift(`Задание закрыто: ${mission.title}.`);
  return touch(next);
}

export function forgeEnhancement(profile: GameProfile, enhancement: Enhancement) {
  const cost = getEnhancementCost(profile, enhancement);
  if (!hasResources(profile.resources, cost)) {
    return profile;
  }

  const next = cloneProfile(profile);
  removeResources(next.resources, cost);
  next.enhancements[enhancement.id] += 1;
  next.xp += 12 + enhancement.power;
  next.battleContribution += enhancement.id === "banner" ? 4 : 2;

  if (next.professionId === "enchanter") {
    next.resources.essence += 1;
  }

  applyLevelUps(next);
  next.log.unshift(`Усиление создано: ${enhancement.name} x${next.enhancements[enhancement.id]}.`);
  return touch(next);
}

export function enterDungeon(profile: GameProfile, dungeon: Dungeon) {
  if (!canEnterDungeon(profile, dungeon)) {
    return profile;
  }

  const next = cloneProfile(profile);
  next.energy -= 1;
  next.completedDungeons.push(dungeon.id);
  next.xp += dungeon.xp;
  next.battleContribution += dungeon.teamContribution;
  addRewards(next.resources, dungeon.rewards);

  applyLevelUps(next);
  next.log.unshift(`Подземелье пройдено: ${dungeon.name}.`);
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

function createEnhancementBag(initial: Partial<EnhancementBag> = {}): EnhancementBag {
  return enhancementIds.reduce((bag, id) => {
    bag[id] = Math.max(0, Math.floor(Number(initial[id] || 0)));
    return bag;
  }, {} as EnhancementBag);
}

function normalizeGameProfile(profile: GameProfile, dayKey: string): GameProfile {
  const legacy = profile as LegacyGameProfile;
  const legacyWeapon = Math.max(0, Number(legacy.gear?.weapon || 0));
  const legacyArmor = Math.max(0, Number(legacy.gear?.armor || 0));
  const migratedEnhancements = createEnhancementBag({
    ...legacy.enhancements,
    strike: Math.max(Number(legacy.enhancements?.strike || 0), legacyWeapon),
    guard: Math.max(Number(legacy.enhancements?.guard || 0), legacyArmor),
  });

  return {
    employeeId: legacy.employeeId || "local",
    dayKey: legacy.dayKey || dayKey,
    professionId: isProfessionId(legacy.professionId) ? legacy.professionId : professionFromEmployee(legacy.employeeId || "local"),
    level: Math.max(1, Math.floor(Number(legacy.level || 1))),
    xp: Math.max(0, Math.floor(Number(legacy.xp || 0))),
    energy: Math.max(0, Math.floor(Number(legacy.energy ?? 4))),
    resources: normalizeResources(legacy.resources),
    enhancements: migratedEnhancements,
    completedMissions: Array.isArray(legacy.completedMissions) ? legacy.completedMissions.slice() : [],
    completedDungeons: normalizeDungeonIds(legacy.completedDungeons || legacy.defeatedMobs),
    battleContribution: Math.max(0, Math.floor(Number(legacy.battleContribution || 0))),
    log: Array.isArray(legacy.log) && legacy.log.length > 0 ? legacy.log.slice(0, 8) : ["Герой принят в корпоративную лигу."],
    updatedAt: legacy.updatedAt || new Date().toISOString(),
  };
}

function normalizeResources(resources: Partial<ResourceBag> | undefined): ResourceBag {
  return {
    ore: Math.max(0, Math.floor(Number(resources?.ore || 0))),
    essence: Math.max(0, Math.floor(Number(resources?.essence || 0))),
    schematics: Math.max(0, Math.floor(Number(resources?.schematics || 0))),
    supplies: Math.max(0, Math.floor(Number(resources?.supplies || 0))),
  };
}

function normalizeDungeonIds(ids: string[] | undefined): DungeonId[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const validIds = new Set(dungeons.map((dungeon) => dungeon.id));
  return ids.filter((id): id is DungeonId => validIds.has(id as DungeonId));
}

function isProfessionId(id: unknown): id is ProfessionId {
  return typeof id === "string" && professions.some((profession) => profession.id === id);
}

function addRewards(resources: ResourceBag, rewards: Partial<ResourceBag>) {
  for (const [resource, amount] of Object.entries(rewards) as Array<[ResourceId, number]>) {
    resources[resource] += amount;
  }
}

function removeResources(resources: ResourceBag, cost: Partial<ResourceBag>) {
  for (const [resource, amount] of Object.entries(cost) as Array<[ResourceId, number]>) {
    resources[resource] -= amount;
  }
}

function hasResources(resources: ResourceBag, cost: Partial<ResourceBag>) {
  return (Object.entries(cost) as Array<[ResourceId, number]>).every(([resource, amount]) => resources[resource] >= amount);
}

function compactResources(resources: Partial<ResourceBag>) {
  return (Object.entries(resources) as Array<[ResourceId, number]>).reduce((next, [resource, amount]) => {
    if (amount > 0) {
      next[resource] = amount;
    }

    return next;
  }, {} as Partial<ResourceBag>);
}

function applyLevelUps(profile: GameProfile) {
  while (profile.xp >= profile.level * 90) {
    profile.xp -= profile.level * 90;
    profile.level += 1;
    profile.energy += 1;
    profile.log.unshift(`Получен ${profile.level} уровень.`);
  }
}

function cloneProfile(profile: GameProfile): GameProfile {
  return {
    ...profile,
    resources: { ...profile.resources },
    enhancements: { ...profile.enhancements },
    completedMissions: profile.completedMissions.slice(),
    completedDungeons: profile.completedDungeons.slice(),
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
