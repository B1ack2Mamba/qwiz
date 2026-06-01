import { formatUtcDateKey, parseDateKey } from "./qwizData";

export type ProfessionId = "pathfinder" | "miner" | "warden" | "artisan" | "enchanter" | "tactician";
export type ResourceId = "ore" | "essence" | "schematics" | "supplies" | "coins";
export type EnhancementId = "strike" | "guard" | "route" | "spark" | "workbench" | "banner";
export type EquipmentId = "dwarven-pickaxe" | "route-amulet" | "shift-plate" | "ether-lens" | "command-signet";
export type EquipmentSlot = "tool" | "weapon" | "armor" | "relic";
export type EquipmentStatId = "strength" | "agility" | "intelligence" | "craft" | "economy" | "readiness";
export type DungeonId = "archive-depths" | "drone-nest" | "ether-vault" | "command-core";
export type PathfinderMiniGameId = "maze" | "puzzle" | "lock";
export type PathfinderExpeditionId = "archive-maze-cache" | "drone-lock-cache" | "ether-riddle-cache" | "command-vault-cache";
export type ProfessionChangeMode = "selected" | "free" | "paid" | "blocked";
export type CombatTrainingRewardRank = "S" | "A" | "B" | "C";
export type TeamDirectiveId = "hunt" | "command" | "training" | "craft" | "research" | "alchemy" | "market";

export type ResourceBag = Record<ResourceId, number>;
export type EnhancementBag = Record<EnhancementId, number>;
export type EquipmentBag = Record<EquipmentId, number>;
export type EquipmentStatBag = Partial<Record<EquipmentStatId, number>>;
export type TrainingReward = {
  xp: number;
  resources: Partial<ResourceBag>;
  battleContribution: number;
  rankBonusPercent: number;
};

export type MissionOutcome = {
  xp: number;
  resources: Partial<ResourceBag>;
  battleContribution: number;
};

export type EnhancementOutcome = {
  xp: number;
  resources: Partial<ResourceBag>;
  battleContribution: number;
  powerGain: number;
};

export type EquipmentOutcome = {
  xp: number;
  resources: Partial<ResourceBag>;
  battleContribution: number;
  powerGain: number;
  stats: EquipmentStatBag;
};

export type DungeonOutcome = {
  xp: number;
  resources: Partial<ResourceBag>;
  battleContribution: number;
};

export type PathfinderExpeditionOutcome = DungeonOutcome & {
  blueprints: EquipmentId[];
};

export type CompanyObjectiveId = "mission" | "craft" | "dungeon" | "battle" | "rest";

export type CompanyObjective = {
  id: CompanyObjectiveId;
  title: string;
  detail: string;
  action: string;
};

export type BattleReadinessTierId = "patrol" | "hold" | "counter" | "breakthrough";

export type BattleReadinessTier = {
  id: BattleReadinessTierId;
  name: string;
  stance: string;
  threshold: number;
  description: string;
  reward: string;
};

export type BattleReadinessPlan = {
  readiness: number;
  tier: BattleReadinessTier;
  nextTier?: BattleReadinessTier;
  pointsToNext: number;
};

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

export type Equipment = {
  id: EquipmentId;
  name: string;
  slot: EquipmentSlot;
  tier: number;
  description: string;
  blueprintDungeonId: DungeonId;
  cost: Partial<ResourceBag>;
  stats: EquipmentStatBag;
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

export type PathfinderMiniGame = {
  id: PathfinderMiniGameId;
  name: string;
  action: string;
  description: string;
};

export type PathfinderExpedition = {
  id: PathfinderExpeditionId;
  dungeonId: DungeonId;
  name: string;
  depth: string;
  miniGameId: PathfinderMiniGameId;
  description: string;
  requiredPower: number;
  requiredEnhancements: Partial<EnhancementBag>;
  rewards: Partial<ResourceBag>;
  blueprintIds: EquipmentId[];
  xp: number;
  teamContribution: number;
};

export type TeamDirective = {
  id: TeamDirectiveId;
  name: string;
  focus: string;
  description: string;
  bonus: string;
};

export type TeamStrategyTrack = {
  id: TeamDirectiveId;
  name: string;
  dailyFarm: string;
  increases: string[];
  decreases: string[];
  tacticianBonus: string;
};

export type GameProfile = {
  employeeId: string;
  dayKey: string;
  professionId: ProfessionId;
  professionChangeSeasonKey: string;
  teamDirectiveId: TeamDirectiveId;
  level: number;
  xp: number;
  energy: number;
  resources: ResourceBag;
  enhancements: EnhancementBag;
  equipment: EquipmentBag;
  discoveredBlueprints: EquipmentId[];
  completedMissions: string[];
  completedDungeons: DungeonId[];
  completedPathfinderExpeditions: PathfinderExpeditionId[];
  battleContribution: number;
  combatTrainingRewardsClaimed: number;
  log: string[];
  updatedAt: string;
};

type LegacyGameProfile = Partial<GameProfile> & {
  gear?: Partial<Record<"weapon" | "armor", number>>;
  defeatedMobs?: string[];
};

const enhancementIds: EnhancementId[] = ["strike", "guard", "route", "spark", "workbench", "banner"];
const equipmentIds: EquipmentId[] = ["dwarven-pickaxe", "route-amulet", "shift-plate", "ether-lens", "command-signet"];
const pathfinderExpeditionIds: PathfinderExpeditionId[] = [
  "archive-maze-cache",
  "drone-lock-cache",
  "ether-riddle-cache",
  "command-vault-cache",
];
const DEFAULT_TEAM_DIRECTIVE_ID: TeamDirectiveId = "command";
const PROFESSION_SEASON_EPOCH_KEY = "2026-01-05";
const BATTLE_READINESS_TARGET = 140;
const studyMissionIds = new Set(["knowledge", "maze", "merge", "cipher", "crossword"]);

export const PROFESSION_SEASON_LENGTH_DAYS = 14;
export const DAILY_COMBAT_TRAINING_REWARD_LIMIT = 3;
export const battleReadinessTiers: BattleReadinessTier[] = [
  {
    id: "patrol",
    name: "Дозор",
    stance: "Сдержать первые волны",
    threshold: 0,
    description: "Отряд держит внешние маршруты и собирает данные о нападении.",
    reward: "Базовая защита",
  },
  {
    id: "hold",
    name: "Оборона",
    stance: "Укрепить рубеж",
    threshold: 35,
    description: "Команда закрывает слабые точки и готовит общий резерв.",
    reward: "+провиант после битвы",
  },
  {
    id: "counter",
    name: "Контратака",
    stance: "Разбить плотную волну",
    threshold: 65,
    description: "Группа уже может перехватывать элитных врагов до входа в лагерь.",
    reward: "+эфир и схемы",
  },
  {
    id: "breakthrough",
    name: "Прорыв",
    stance: "Забрать инициативу",
    threshold: 90,
    description: "Отряд готов не только защищаться, но и выбить источник атаки.",
    reward: "Редкие материалы",
  },
];
export const professionChangeCost: Partial<ResourceBag> = {
  ore: 2,
  essence: 2,
  schematics: 2,
};

export const resourceLabels: Record<ResourceId, string> = {
  ore: "Металл",
  essence: "Эфир",
  schematics: "Схемы",
  supplies: "Провиант",
  coins: "Монеты",
};

export const equipmentStatLabels: Record<EquipmentStatId, string> = {
  strength: "Сила",
  agility: "Ловкость",
  intelligence: "Интеллект",
  craft: "Ремесло",
  economy: "Экономика",
  readiness: "Готовность",
};

export const pathfinderMiniGames: Record<PathfinderMiniGameId, PathfinderMiniGame> = {
  maze: {
    id: "maze",
    name: "Лабиринт маршрута",
    action: "Проложить путь",
    description: "Следопыт выбирает короткий маршрут по сетке комнат, избегая ловушек и лишних шагов.",
  },
  puzzle: {
    id: "puzzle",
    name: "Головоломка печати",
    action: "Решить печать",
    description: "Нужно собрать правильную последовательность символов, чтобы открыть скрытый проход или тайник.",
  },
  lock: {
    id: "lock",
    name: "Замок сундука",
    action: "Вскрыть сундук",
    description: "Мини-игра на точность: подобрать механизм замка и забрать монеты, вещи или чертежи.",
  },
};

export const teamDirectives: TeamDirective[] = [
  {
    id: "hunt",
    name: "Охота",
    focus: "Фарм мобов",
    description: "Отряд давит боевые зоны и быстрее превращает зачистки в вклад.",
    bonus: "+2 вклад за тренировки, +ресурс за плотные волны",
  },
  {
    id: "command",
    name: "Командование",
    focus: "Стратегия группы",
    description: "Тактик держит общий план, поднимая силу героя и месячную готовность.",
    bonus: "+12 сила героя, +3 к вкладу в битву",
  },
  {
    id: "training",
    name: "Уровни",
    focus: "Прокачка базы",
    description: "Группа вкладывает день в опыт: быстрее растет уровень, но меньше ускоряется экономика.",
    bonus: "+XP за задания и тренировки, меньше прямой вклад в битву",
  },
  {
    id: "craft",
    name: "Крафт",
    focus: "Ресурсы и снаряжение",
    description: "Силы уходят на добычу, чертежи и работу гнома, открывая больше возможностей для сборки снаряжения.",
    bonus: "+металл и дешевле часть ковки, меньше боевой темп",
  },
  {
    id: "research",
    name: "Исследование",
    focus: "Головоломки и квизы",
    description: "Команда разбирает схемы, маршруты и логические задания ради чертежей.",
    bonus: "+схемы и XP за ежедневные активности",
  },
  {
    id: "alchemy",
    name: "Алхимия",
    focus: "Психика, знания, навыки",
    description: "Маг изучает материалы, герметизм и поведение людей, превращая квизы, сканворды и головоломки в рост умений.",
    bonus: "+эфир и XP за учебные задания, дешевле магический навык, меньше прямой вклад в битву",
  },
  {
    id: "market",
    name: "Рынок",
    focus: "Монеты, ресурсы, сделки",
    description: "Отряд работает через снабжение: больше монет и провианта, дешевле часть расходов.",
    bonus: "+монеты и провиант за задания, -1 провиант в цене усилений и вклада",
  },
];

export const teamStrategyTracks: Record<TeamDirectiveId, TeamStrategyTrack> = {
  hunt: {
    id: "hunt",
    name: "Охотничий натиск",
    dailyFarm: "боевые тренировки, зачистки, вклад в месячную битву",
    increases: ["вклад за бой", "провиант и эфир с волн", "темп боевой готовности"],
    decreases: ["экономику монет", "дешевизну крафта"],
    tacticianBonus: "Тактик точнее распределяет цели и дает еще +1 к боевому вкладу.",
  },
  command: {
    id: "command",
    name: "Командный баланс",
    dailyFarm: "готовность, безопасное распределение сил, общий темп",
    increases: ["силу героя", "вклад в битву", "стабильность команды"],
    decreases: ["узкую специализацию", "взрывной рост ресурсов"],
    tacticianBonus: "Тактик получает максимальную отдачу от командной готовности.",
  },
  training: {
    id: "training",
    name: "Школа уровней",
    dailyFarm: "квизы, тренировки, базовый опыт и энергия",
    increases: ["XP", "скорость получения уровней", "базовую силу"],
    decreases: ["ресурсный фарм", "прямой боевой вклад"],
    tacticianBonus: "Тактик превращает план обучения в дополнительный XP для группы.",
  },
  craft: {
    id: "craft",
    name: "Гномья мастерская",
    dailyFarm: "металл, схемы, монеты и сборка снаряжения",
    increases: ["добычу", "дешевизну ковки", "снаряжение команды"],
    decreases: ["быстрый вклад в битву", "чистую прокачку уровней"],
    tacticianBonus: "Тактик заранее распределяет заказы и снижает потери материалов.",
  },
  research: {
    id: "research",
    name: "Чертежная разведка",
    dailyFarm: "головоломки, маршруты, схемы и подготовка подземелий",
    increases: ["схемы", "доступ к чертежам", "интеллектуальные задания"],
    decreases: ["монеты", "боевой темп"],
    tacticianBonus: "Тактик выбирает, какие задачи дадут больше схем для следующего шага.",
  },
  alchemy: {
    id: "alchemy",
    name: "Алхимическая школа",
    dailyFarm: "психика, герметизм, сканворды, квизы и развитие навыков",
    increases: ["эфир", "XP за учебу", "силу магических навыков"],
    decreases: ["дешевый вклад в битву", "быстрый рынок"],
    tacticianBonus: "Тактик связывает знания с ролями команды и ускоряет рост навыков.",
  },
  market: {
    id: "market",
    name: "Рыночный запас",
    dailyFarm: "монеты, провиант, сделки и накопление",
    increases: ["монеты", "провиант", "скидки на снаряжение"],
    decreases: ["боевой вклад", "скорость прокачки навыков"],
    tacticianBonus: "Тактик лучше распределяет бюджет и уменьшает лишние расходы.",
  },
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
    name: "Гном-мастер",
    role: "Добыча и крафт",
    function: "Добывает металл и монеты, а по магическим чертежам открывает команде новое снаряжение.",
    bonus: "+1 металл и +2 монеты за задания, дешевле ковка",
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
    name: "Бронник",
    role: "Оборона",
    function: "Держит щиты, защитные стойки и устойчивость группы, пока гном закрывает добычу и крафт.",
    bonus: "+устойчивость и щиты в боевых задачах",
    crest: "RM",
  },
  {
    id: "enchanter",
    name: "Маг-алхимик",
    role: "Алхимия",
    function: "Изучает материалы, психику людей и символические системы, усиливая навыки через квизы и головоломки.",
    bonus: "+1 эфир при ковке усиления, сильнее при стратегии Алхимия",
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
  {
    id: "crossword",
    title: "Сканворд архетипов",
    type: "Сканворд",
    description: "Разобрать понятия о мотивации, привычках и психике людей, чтобы открыть алхимический паттерн навыка.",
    power: 32,
    rewards: { schematics: 2, essence: 1 },
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
    name: "Гномий верстак",
    school: "Крафт",
    description: "Позволяет гному собирать снаряжение по магическим чертежам и чинить находки прямо в подземелье.",
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

export const equipment: Equipment[] = [
  {
    id: "dwarven-pickaxe",
    name: "Кобальтовая кирка",
    slot: "tool",
    tier: 1,
    description: "Гномий инструмент для стабильной добычи металла, монет и редких материалов.",
    blueprintDungeonId: "archive-depths",
    cost: { ore: 2, schematics: 1, coins: 4 },
    stats: { strength: 1, craft: 1, economy: 2 },
  },
  {
    id: "route-amulet",
    name: "Амулет короткого пути",
    slot: "relic",
    tier: 1,
    description: "Чертеж следопыта: ускоряет маршруты, разведку и аккуратный фарм подземелий.",
    blueprintDungeonId: "archive-depths",
    cost: { essence: 1, schematics: 2, coins: 5 },
    stats: { agility: 2, intelligence: 1, economy: 1 },
  },
  {
    id: "shift-plate",
    name: "Пластина смены",
    slot: "armor",
    tier: 2,
    description: "Броня для долгих забегов: больше живучести и надежнее вклад в месячную битву.",
    blueprintDungeonId: "drone-nest",
    cost: { ore: 3, supplies: 1, coins: 6 },
    stats: { strength: 3, readiness: 1 },
  },
  {
    id: "ether-lens",
    name: "Эфирная линза",
    slot: "relic",
    tier: 3,
    description: "Алхимическое снаряжение для магов: усиливает интеллект, изучение и редкие навыки.",
    blueprintDungeonId: "ether-vault",
    cost: { essence: 3, schematics: 2, coins: 8 },
    stats: { intelligence: 3, craft: 1 },
  },
  {
    id: "command-signet",
    name: "Печать отряда",
    slot: "weapon",
    tier: 4,
    description: "Снаряжение поздней игры: сбалансированные характеристики и сильная готовность команды.",
    blueprintDungeonId: "command-core",
    cost: { essence: 2, schematics: 2, supplies: 2, coins: 10 },
    stats: { strength: 1, agility: 1, intelligence: 1, readiness: 3 },
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

export const pathfinderExpeditions: PathfinderExpedition[] = [
  {
    id: "archive-maze-cache",
    dungeonId: "archive-depths",
    name: "Тайник нижнего архива",
    depth: "R1",
    miniGameId: "maze",
    description: "Следопыт бежит по короткому лабиринту архива и ищет первые магические чертежи для гнома.",
    requiredPower: 42,
    requiredEnhancements: { route: 1 },
    rewards: { schematics: 1, coins: 3 },
    blueprintIds: ["dwarven-pickaxe", "route-amulet"],
    xp: 30,
    teamContribution: 3,
  },
  {
    id: "drone-lock-cache",
    dungeonId: "drone-nest",
    name: "Сундук дронов",
    depth: "R2",
    miniGameId: "lock",
    description: "После боевой комнаты следопыт вскрывает механический сундук и вытаскивает материалы брони.",
    requiredPower: 68,
    requiredEnhancements: { route: 1, strike: 1 },
    rewards: { ore: 1, coins: 4 },
    blueprintIds: ["shift-plate"],
    xp: 42,
    teamContribution: 4,
  },
  {
    id: "ether-riddle-cache",
    dungeonId: "ether-vault",
    name: "Печать эфирного хранилища",
    depth: "R3",
    miniGameId: "puzzle",
    description: "Внутри хранилища следопыт собирает символическую головоломку и находит алхимический чертеж.",
    requiredPower: 94,
    requiredEnhancements: { route: 2, spark: 1 },
    rewards: { essence: 2, schematics: 2, coins: 2 },
    blueprintIds: ["ether-lens"],
    xp: 54,
    teamContribution: 5,
  },
  {
    id: "command-vault-cache",
    dungeonId: "command-core",
    name: "Сейф командного ядра",
    depth: "R4",
    miniGameId: "lock",
    description: "Финальный замок недели: следопыт открывает сейф с редким снаряжением для командной битвы.",
    requiredPower: 124,
    requiredEnhancements: { route: 2, banner: 1 },
    rewards: { schematics: 2, supplies: 2, coins: 5 },
    blueprintIds: ["command-signet"],
    xp: 66,
    teamContribution: 7,
  },
];

export function createGameProfile(employeeId: string, dayKey: string): GameProfile {
  return {
    employeeId,
    dayKey,
    professionId: professionFromEmployee(employeeId),
    professionChangeSeasonKey: "",
    teamDirectiveId: DEFAULT_TEAM_DIRECTIVE_ID,
    level: 1,
    xp: 0,
    energy: 4,
    resources: {
      ore: 3,
      essence: 2,
      schematics: 2,
      supplies: 3,
      coins: 6,
    },
    enhancements: createEnhancementBag(),
    equipment: createEquipmentBag(),
    discoveredBlueprints: [],
    completedMissions: [],
    completedDungeons: [],
    completedPathfinderExpeditions: [],
    battleContribution: 0,
    combatTrainingRewardsClaimed: 0,
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
    completedPathfinderExpeditions: [],
    combatTrainingRewardsClaimed: 0,
    log: [`Новый игровой день открыт: ${dayKey}.`, ...normalized.log].slice(0, 8),
  });
}

export function getProfession(id: ProfessionId) {
  return professions.find((profession) => profession.id === id) || professions[0];
}

export function getTeamDirective(id: TeamDirectiveId | undefined) {
  return teamDirectives.find((directive) => directive.id === id) || teamDirectives.find((directive) => directive.id === DEFAULT_TEAM_DIRECTIVE_ID)!;
}

export function getTeamStrategyTrack(profile: GameProfile) {
  return teamStrategyTracks[getTeamDirective(profile.teamDirectiveId).id];
}

export function getProfessionSeason(dayKey: string) {
  const seasonIndex = getProfessionSeasonIndex(dayKey);
  const startDate = parseDateKey(PROFESSION_SEASON_EPOCH_KEY);
  startDate.setUTCDate(startDate.getUTCDate() + seasonIndex * PROFESSION_SEASON_LENGTH_DAYS);

  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + PROFESSION_SEASON_LENGTH_DAYS - 1);

  const startKey = formatUtcDateKey(startDate);
  return {
    key: startKey,
    startKey,
    endKey: formatUtcDateKey(endDate),
    lengthDays: PROFESSION_SEASON_LENGTH_DAYS,
  };
}

export function getProfessionChangeCost() {
  return { ...professionChangeCost };
}

export function getProfessionChangeMode(profile: GameProfile, professionId: ProfessionId): ProfessionChangeMode {
  if (profile.professionId === professionId) {
    return "selected";
  }

  const currentSeason = getProfessionSeason(profile.dayKey);
  if (profile.professionChangeSeasonKey !== currentSeason.key) {
    return "free";
  }

  return hasResources(profile.resources, professionChangeCost) ? "paid" : "blocked";
}

export function getEnhancement(id: EnhancementId) {
  return enhancements.find((enhancement) => enhancement.id === id) || enhancements[0];
}

export function getEquipment(id: EquipmentId) {
  return equipment.find((item) => item.id === id) || equipment[0];
}

export function getPathfinderMiniGame(id: PathfinderMiniGameId) {
  return pathfinderMiniGames[id] || pathfinderMiniGames.maze;
}

export function getPathfinderExpedition(id: PathfinderExpeditionId) {
  return pathfinderExpeditions.find((expedition) => expedition.id === id) || pathfinderExpeditions[0];
}

export function getEnhancementPower(profile: GameProfile) {
  const basePower = enhancements.reduce((total, enhancement) => {
    return total + (profile.enhancements[enhancement.id] || 0) * enhancement.power;
  }, 0);
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  const alchemySkillPower = directiveId === "alchemy" ? (profile.enhancements.spark || 0) * 4 : 0;

  return basePower + alchemySkillPower;
}

export function getPower(profile: GameProfile) {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  const professionPower = profile.professionId === "tactician" ? 20 : profile.professionId === "enchanter" && directiveId === "alchemy" ? 10 : 0;
  const directivePower = directiveId === "command" ? 12 : 0;
  return profile.level * 25 + getEnhancementPower(profile) + getEquipmentPower(profile) + profile.battleContribution + professionPower + directivePower;
}

export function getDungeonPower(profile: GameProfile, dungeon: Dungeon) {
  return getPower(profile) + (profile.professionId === dungeon.specialist ? 15 : 0);
}

export function getPathfinderExpeditionPower(profile: GameProfile, expedition: PathfinderExpedition) {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  const equipmentStats = getEquipmentStats(profile);
  const routeMastery = (profile.enhancements.route || 0) * 5;
  const agilityBonus = (equipmentStats.agility || 0) * 4;
  const miniGameStatBonus =
    expedition.miniGameId === "puzzle"
      ? (equipmentStats.intelligence || 0) * 3
      : expedition.miniGameId === "lock"
        ? (equipmentStats.economy || 0) * 3
        : 0;
  const specialistPower = profile.professionId === "pathfinder" ? 22 : 0;
  const directivePower = directiveId === "research" ? 8 : directiveId === "hunt" ? 4 : 0;

  return getPower(profile) + routeMastery + agilityBonus + miniGameStatBonus + specialistPower + directivePower;
}

export function getMonthlyBattleReadiness(profile: GameProfile, teamSize: number) {
  const safeTeamSize = Math.max(0, Math.floor(teamSize));
  const equipmentReadiness = (getEquipmentStats(profile).readiness || 0) * 3;
  return Math.min(100, Math.round(((profile.battleContribution + equipmentReadiness + safeTeamSize * 8) / BATTLE_READINESS_TARGET) * 100));
}

export function getBattleReadinessPlan(profile: GameProfile, teamSize: number): BattleReadinessPlan {
  const readiness = getMonthlyBattleReadiness(profile, teamSize);
  const tier =
    battleReadinessTiers
      .slice()
      .reverse()
      .find((candidate) => readiness >= candidate.threshold) || battleReadinessTiers[0];
  const nextTier = battleReadinessTiers.find((candidate) => candidate.threshold > readiness);

  return {
    readiness,
    tier,
    nextTier,
    pointsToNext: nextTier ? nextTier.threshold - readiness : 0,
  };
}

export function getCompanyObjective(profile: GameProfile, teamSize: number): CompanyObjective {
  const readyExpedition = pathfinderExpeditions.find((expedition) => canRunPathfinderExpedition(profile, expedition));
  if (readyExpedition) {
    const outcome = getPathfinderExpeditionOutcome(profile, readyExpedition);
    const blueprintText =
      outcome.blueprints.length > 0 ? ` и ${outcome.blueprints.length} чертеж` : "";
    return {
      id: "dungeon",
      title: `Разведать: ${readyExpedition.name}`,
      detail: `Следопыт готов к мини-игре: +${outcome.xp} XP, монеты/ресурсы${blueprintText}.`,
      action: "Подземелья",
    };
  }

  const readyDungeon = dungeons.find((dungeon) => canEnterDungeon(profile, dungeon));
  if (readyDungeon) {
    const outcome = getDungeonOutcome(readyDungeon);
    return {
      id: "dungeon",
      title: `Пройти: ${readyDungeon.name}`,
      detail: `Доступен спуск ${readyDungeon.depth}: +${outcome.xp} XP и +${outcome.battleContribution} готовность.`,
      action: "Подземелья",
    };
  }

  const openMission = dailyMissions.find((mission) => !profile.completedMissions.includes(mission.id));
  if (profile.energy > 0 && openMission) {
    const outcome = getMissionOutcome(profile, openMission);
    return {
      id: "mission",
      title: `Закрыть: ${openMission.title}`,
      detail: `Есть энергия для активности: +${outcome.xp} XP и ресурсы для следующего шага.`,
      action: "Задания",
    };
  }

  const equipmentTarget = equipment.find((item) => canCraftEquipment(profile, item));
  if (equipmentTarget) {
    const outcome = getEquipmentOutcome(equipmentTarget);
    return {
      id: "craft",
      title: `Собрать: ${equipmentTarget.name}`,
      detail: `Гном может открыть снаряжение: +${outcome.powerGain} силы и новые характеристики отряда.`,
      action: "Крафт",
    };
  }

  const forgeTarget = enhancements.find((enhancement) => canForgeEnhancement(profile, enhancement));
  if (forgeTarget) {
    const outcome = getEnhancementOutcome(profile, forgeTarget);
    return {
      id: "craft",
      title: `Сковать: ${forgeTarget.name}`,
      detail: `Доступно усиление: +${outcome.powerGain} сила и +${outcome.battleContribution} готовность.`,
      action: "Крафт",
    };
  }

  const battlePlan = getBattleReadinessPlan(profile, teamSize);
  if (battlePlan.nextTier && canContributeToBattle(profile)) {
    return {
      id: "battle",
      title: `Поднять план: ${battlePlan.nextTier.name}`,
      detail: `До следующего плана ${battlePlan.pointsToNext}%. Вклад ускорит месячную оборону.`,
      action: "Битва",
    };
  }

  return {
    id: "rest",
    title: "Смена закреплена",
    detail: "Основные быстрые действия закрыты. Копите ресурсы или дождитесь новой энергии.",
    action: "Планирование",
  };
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

  if (profile.professionId === "miner" && (cost.ore || 0) > 0) {
    cost.ore = Math.max(0, (cost.ore || 0) - 1);
  }

  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  if (directiveId === "market" && (cost.supplies || 0) > 0) {
    cost.supplies = Math.max(0, (cost.supplies || 0) - 1);
  }

  if (directiveId === "craft") {
    if ((cost.ore || 0) > 0) {
      cost.ore = Math.max(0, (cost.ore || 0) - 1);
    }

    if (profile.professionId === "miner" && (cost.schematics || 0) > 0) {
      cost.schematics = Math.max(0, (cost.schematics || 0) - 1);
    }
  }

  if (directiveId === "alchemy" && enhancement.id === "spark" && (cost.essence || 0) > 0) {
    cost.essence = Math.max(0, (cost.essence || 0) - 1);
  }

  return compactResources(cost);
}

export function canForgeEnhancement(profile: GameProfile, enhancement: Enhancement) {
  return hasResources(profile.resources, getEnhancementCost(profile, enhancement));
}

export function getEnhancementShortfall(profile: GameProfile, enhancement: Enhancement): Partial<ResourceBag> {
  const cost = getEnhancementCost(profile, enhancement);

  return compactResources({
    ore: Math.max(0, (cost.ore || 0) - profile.resources.ore),
    essence: Math.max(0, (cost.essence || 0) - profile.resources.essence),
    schematics: Math.max(0, (cost.schematics || 0) - profile.resources.schematics),
    supplies: Math.max(0, (cost.supplies || 0) - profile.resources.supplies),
  });
}

export function getEnhancementOutcome(profile: GameProfile, enhancement: Enhancement): EnhancementOutcome {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  const alchemySkill = directiveId === "alchemy" && enhancement.id === "spark";

  return {
    xp: 12 + enhancement.power + (alchemySkill ? 8 : 0),
    resources: compactResources({
      essence: profile.professionId === "enchanter" ? 1 : 0,
      schematics: alchemySkill ? 1 : 0,
    }),
    battleContribution: enhancement.id === "banner" ? 4 : alchemySkill ? 1 : 2,
    powerGain: enhancement.power + (alchemySkill ? 4 : 0),
  };
}

export function getEquipmentStats(profile: GameProfile): EquipmentStatBag {
  return equipment.reduce((stats, item) => {
    if ((profile.equipment[item.id] || 0) <= 0) {
      return stats;
    }

    for (const [stat, amount] of Object.entries(item.stats) as Array<[EquipmentStatId, number]>) {
      stats[stat] = (stats[stat] || 0) + amount;
    }

    return stats;
  }, {} as EquipmentStatBag);
}

export function getEquipmentPower(profile: GameProfile) {
  return getEquipmentStatPower(getEquipmentStats(profile));
}

export function hasEquipmentBlueprint(profile: GameProfile, item: Equipment) {
  return profile.completedDungeons.includes(item.blueprintDungeonId) || profile.discoveredBlueprints.includes(item.id);
}

export function getEquipmentCost(profile: GameProfile, item: Equipment) {
  const cost: Partial<ResourceBag> = { ...item.cost };
  const workbenchLevel = profile.enhancements.workbench || 0;
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;

  if (profile.professionId === "miner") {
    cost.coins = Math.max(0, (cost.coins || 0) - 1 - Math.floor(workbenchLevel / 2));
    if (workbenchLevel > 0 && (cost.ore || 0) > 0) {
      cost.ore = Math.max(0, (cost.ore || 0) - 1);
    }
  }

  if (directiveId === "craft" && profile.professionId === "miner") {
    if ((cost.ore || 0) > 0) {
      cost.ore = Math.max(0, (cost.ore || 0) - 1);
    }

    if ((cost.coins || 0) > 0) {
      cost.coins = Math.max(0, (cost.coins || 0) - 1);
    }
  }

  if (directiveId === "market" && (cost.coins || 0) > 0) {
    cost.coins = Math.max(0, (cost.coins || 0) - 1);
  }

  return compactResources(cost);
}

export function getEquipmentShortfall(profile: GameProfile, item: Equipment): Partial<ResourceBag> {
  const cost = getEquipmentCost(profile, item);

  return compactResources({
    ore: Math.max(0, (cost.ore || 0) - profile.resources.ore),
    essence: Math.max(0, (cost.essence || 0) - profile.resources.essence),
    schematics: Math.max(0, (cost.schematics || 0) - profile.resources.schematics),
    supplies: Math.max(0, (cost.supplies || 0) - profile.resources.supplies),
    coins: Math.max(0, (cost.coins || 0) - profile.resources.coins),
  });
}

export function getEquipmentOutcome(item: Equipment): EquipmentOutcome {
  const powerGain = getEquipmentStatPower(item.stats);
  return {
    xp: 18 + item.tier * 12 + powerGain,
    resources: {},
    battleContribution: item.stats.readiness ? item.stats.readiness * 2 : 0,
    powerGain,
    stats: item.stats,
  };
}

export function canCraftEquipment(profile: GameProfile, item: Equipment) {
  return (
    profile.professionId === "miner" &&
    (profile.equipment[item.id] || 0) <= 0 &&
    hasEquipmentBlueprint(profile, item) &&
    hasResources(profile.resources, getEquipmentCost(profile, item))
  );
}

export function craftEquipment(profile: GameProfile, item: Equipment) {
  if (!canCraftEquipment(profile, item)) {
    return profile;
  }

  const cost = getEquipmentCost(profile, item);
  const outcome = getEquipmentOutcome(item);
  const next = cloneProfile(profile);
  removeResources(next.resources, cost);
  next.equipment[item.id] = 1;
  next.xp += outcome.xp;
  next.battleContribution += outcome.battleContribution;
  addRewards(next.resources, outcome.resources);

  applyLevelUps(next);
  next.log.unshift(`Гном собрал снаряжение: ${item.name}.`);
  return touch(next);
}

export function hasPathfinderExpeditionRequirements(profile: GameProfile, expedition: PathfinderExpedition) {
  return (Object.entries(expedition.requiredEnhancements) as Array<[EnhancementId, number]>).every(([id, amount]) => {
    return (profile.enhancements[id] || 0) >= amount;
  });
}

export function canRunPathfinderExpedition(profile: GameProfile, expedition: PathfinderExpedition) {
  return (
    profile.professionId === "pathfinder" &&
    profile.energy > 0 &&
    !profile.completedPathfinderExpeditions.includes(expedition.id) &&
    hasPathfinderExpeditionRequirements(profile, expedition) &&
    getPathfinderExpeditionPower(profile, expedition) >= expedition.requiredPower
  );
}

export function getPathfinderExpeditionLockHint(profile: GameProfile, expedition: PathfinderExpedition) {
  if (profile.completedPathfinderExpeditions.includes(expedition.id)) {
    return "Сегодня уже разведано";
  }

  if (profile.professionId !== "pathfinder") {
    return "Нужен Следопыт";
  }

  if (profile.energy <= 0) {
    return "Нужна энергия для вылазки";
  }

  const missingRequirements = (Object.entries(expedition.requiredEnhancements) as Array<[EnhancementId, number]>).filter(
    ([id, amount]) => (profile.enhancements[id] || 0) < amount,
  );
  if (missingRequirements.length > 0) {
    const [id, amount] = missingRequirements[0];
    return `Нужно усиление: ${getEnhancement(id).name} ${profile.enhancements[id] || 0}/${amount}`;
  }

  const missingPower = expedition.requiredPower - getPathfinderExpeditionPower(profile, expedition);
  if (missingPower > 0) {
    return `Нужно еще +${missingPower} разведки`;
  }

  return `Готово: ${getPathfinderMiniGame(expedition.miniGameId).action}`;
}

export function getPathfinderExpeditionOutcome(
  profile: GameProfile,
  expedition: PathfinderExpedition,
): PathfinderExpeditionOutcome {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  const newBlueprints = expedition.blueprintIds.filter((blueprintId) => !profile.discoveredBlueprints.includes(blueprintId));
  const baseRewards = expedition.rewards;
  const pathfinderBonus = profile.professionId === "pathfinder" ? 1 : 0;

  return {
    xp: expedition.xp + (profile.professionId === "pathfinder" ? 8 : 0) + (directiveId === "research" ? 6 : 0),
    resources: compactResources({
      ore: (baseRewards.ore || 0) + (directiveId === "craft" ? 1 : 0),
      essence: baseRewards.essence || 0,
      schematics: (baseRewards.schematics || 0) + (directiveId === "research" ? 1 : 0),
      supplies: baseRewards.supplies || 0,
      coins: (baseRewards.coins || 0) + pathfinderBonus + (directiveId === "market" ? 2 : 0),
    }),
    battleContribution: expedition.teamContribution + pathfinderBonus + (directiveId === "hunt" ? 1 : 0),
    blueprints: newBlueprints,
  };
}

export function completePathfinderExpedition(profile: GameProfile, expedition: PathfinderExpedition) {
  if (!canRunPathfinderExpedition(profile, expedition)) {
    return profile;
  }

  const outcome = getPathfinderExpeditionOutcome(profile, expedition);
  const next = cloneProfile(profile);
  next.energy -= 1;
  next.completedPathfinderExpeditions.push(expedition.id);
  next.xp += outcome.xp;
  next.battleContribution += outcome.battleContribution;
  addRewards(next.resources, outcome.resources);

  for (const blueprintId of outcome.blueprints) {
    next.discoveredBlueprints.push(blueprintId);
  }

  applyLevelUps(next);
  const blueprintNames = outcome.blueprints.map((blueprintId) => getEquipment(blueprintId).name).join(", ");
  next.log.unshift(
    blueprintNames
      ? `Следопыт открыл тайник: ${expedition.name}. Чертежи: ${blueprintNames}.`
      : `Следопыт закрыл вылазку: ${expedition.name}.`,
  );
  return touch(next);
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

export function getDungeonLockHint(profile: GameProfile, dungeon: Dungeon) {
  if (profile.completedDungeons.includes(dungeon.id)) {
    return "Уже зачищено";
  }

  if (profile.energy <= 0) {
    return "Нужна энергия для спуска";
  }

  const missingRequirements = (Object.entries(dungeon.requiredEnhancements) as Array<[EnhancementId, number]>).filter(
    ([id, amount]) => (profile.enhancements[id] || 0) < amount,
  );
  if (missingRequirements.length > 0) {
    const [id, amount] = missingRequirements[0];
    return `Нужно усиление: ${getEnhancement(id).name} ${profile.enhancements[id] || 0}/${amount}`;
  }

  const missingPower = dungeon.requiredPower - getDungeonPower(profile, dungeon);
  if (missingPower > 0) {
    return `Нужно еще +${missingPower} силы`;
  }

  return "Готово к спуску";
}

export function getDungeonOutcome(dungeon: Dungeon): DungeonOutcome {
  return {
    xp: dungeon.xp,
    resources: dungeon.rewards,
    battleContribution: dungeon.teamContribution,
  };
}

export function getMissionOutcome(profile: GameProfile, mission: DailyMission): MissionOutcome {
  const directiveRewards = getDirectiveMissionRewards(profile, mission);
  const resources = compactResources({
    ore: (mission.rewards.ore || 0) + (directiveRewards.ore || 0) + (profile.professionId === "miner" ? 1 : 0),
    essence: (mission.rewards.essence || 0) + (directiveRewards.essence || 0),
    schematics: (mission.rewards.schematics || 0) + (directiveRewards.schematics || 0),
    supplies: (mission.rewards.supplies || 0) + (directiveRewards.supplies || 0),
    coins: (mission.rewards.coins || 0) + (directiveRewards.coins || 0) + (profile.professionId === "miner" ? 2 : 0),
  });

  return {
    xp: mission.power + getDirectiveMissionXp(profile, mission),
    resources,
    battleContribution: getDirectiveMissionContribution(profile),
  };
}

export function completeMission(profile: GameProfile, mission: DailyMission) {
  if (profile.completedMissions.includes(mission.id) || profile.energy <= 0) {
    return profile;
  }

  const outcome = getMissionOutcome(profile, mission);
  const next = cloneProfile(profile);
  next.energy -= 1;
  next.xp += outcome.xp;
  next.completedMissions.push(mission.id);
  addRewards(next.resources, outcome.resources);
  next.battleContribution += outcome.battleContribution;

  applyLevelUps(next);
  next.log.unshift(`Задание закрыто: ${mission.title}.`);
  return touch(next);
}

export function forgeEnhancement(profile: GameProfile, enhancement: Enhancement) {
  const cost = getEnhancementCost(profile, enhancement);
  const outcome = getEnhancementOutcome(profile, enhancement);
  if (!hasResources(profile.resources, cost)) {
    return profile;
  }

  const next = cloneProfile(profile);
  removeResources(next.resources, cost);
  next.enhancements[enhancement.id] += 1;
  next.xp += outcome.xp;
  next.battleContribution += outcome.battleContribution;
  addRewards(next.resources, outcome.resources);

  applyLevelUps(next);
  next.log.unshift(`Усиление создано: ${enhancement.name} x${next.enhancements[enhancement.id]}.`);
  return touch(next);
}

export function enterDungeon(profile: GameProfile, dungeon: Dungeon) {
  if (!canEnterDungeon(profile, dungeon)) {
    return profile;
  }

  const outcome = getDungeonOutcome(dungeon);
  const next = cloneProfile(profile);
  next.energy -= 1;
  next.completedDungeons.push(dungeon.id);
  next.xp += outcome.xp;
  next.battleContribution += outcome.battleContribution;
  addRewards(next.resources, outcome.resources);

  applyLevelUps(next);
  next.log.unshift(`Подземелье пройдено: ${dungeon.name}.`);
  return touch(next);
}

export function getBattleContributionCost(profile: GameProfile): Partial<ResourceBag> {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;

  return compactResources({
    supplies: directiveId === "market" ? 0 : directiveId === "training" ? 2 : 1,
    essence: directiveId === "alchemy" ? 2 : 1,
  });
}

export function getBattleContributionGain(profile: GameProfile) {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  const directiveGain: Record<TeamDirectiveId, number> = {
    alchemy: -1,
    command: 3,
    craft: -1,
    hunt: 1,
    market: -2,
    research: 0,
    training: -2,
  };

  return Math.max(4, (profile.professionId === "tactician" ? 14 : 9) + directiveGain[directiveId]);
}

export function canContributeToBattle(profile: GameProfile) {
  return hasResources(profile.resources, getBattleContributionCost(profile));
}

export function contributeToBattle(profile: GameProfile) {
  const cost = getBattleContributionCost(profile);

  if (!hasResources(profile.resources, cost)) {
    return profile;
  }

  const next = cloneProfile(profile);
  removeResources(next.resources, cost);
  next.battleContribution += getBattleContributionGain(next);
  next.log.unshift("Вклад внесен в месячную битву.");
  return touch(next);
}

export function getCombatTrainingReward(profile: GameProfile, wave: number, defeatedCount: number, rank: CombatTrainingRewardRank = "C"): TrainingReward {
  const safeWave = Math.max(1, Math.floor(wave));
  const safeDefeatedCount = Math.max(1, Math.floor(defeatedCount));
  const rankBonusPercent = getCombatTrainingRankBonus(rank);
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  const tacticianPush = profile.professionId === "tactician" ? 1 : 0;
  const battleContribution = scaleRankReward(
    (profile.professionId === "tactician" ? 5 : 3) +
      safeWave +
      (directiveId === "hunt" ? 2 + tacticianPush : directiveId === "command" ? 1 + tacticianPush : 0),
    rankBonusPercent,
  );
  const trainingXp = directiveId === "training" ? 10 + (profile.professionId === "tactician" ? 4 : 0) : 0;
  const resources = compactResources({
    supplies: 1 + (rank === "S" || rank === "A" ? 1 : 0) + (directiveId === "hunt" && safeDefeatedCount >= 3 ? 1 : 0),
    essence: (safeWave >= 2 ? 1 : 0) + (rank === "S" ? 1 : 0),
    ore: (safeDefeatedCount >= 4 ? 1 : 0) + (rank === "S" && safeWave >= 3 ? 1 : 0) + (directiveId === "craft" ? 1 : 0),
    coins: directiveId === "market" ? 2 + (rank === "S" || rank === "A" ? 1 : 0) : 0,
  });

  return {
    xp: scaleRankReward(18 + safeWave * 8 + safeDefeatedCount * 4 + trainingXp, rankBonusPercent),
    resources,
    battleContribution,
    rankBonusPercent,
  };
}

export function canClaimCombatTrainingReward(profile: GameProfile) {
  return profile.combatTrainingRewardsClaimed < DAILY_COMBAT_TRAINING_REWARD_LIMIT;
}

export function claimCombatTrainingReward(profile: GameProfile, wave: number, defeatedCount: number, rank: CombatTrainingRewardRank = "C") {
  if (!canClaimCombatTrainingReward(profile)) {
    return profile;
  }

  const reward = getCombatTrainingReward(profile, wave, defeatedCount, rank);
  const next = cloneProfile(profile);
  next.combatTrainingRewardsClaimed += 1;
  next.xp += reward.xp;
  next.battleContribution += reward.battleContribution;
  addRewards(next.resources, reward.resources);

  applyLevelUps(next);
  next.log.unshift(`Тренировочная волна ${Math.max(1, Math.floor(wave))} зачищена. Ранг: ${rank}.`);
  return touch(next);
}

export function setTeamDirective(profile: GameProfile, directiveId: TeamDirectiveId) {
  const directive = getTeamDirective(directiveId);
  if (profile.teamDirectiveId === directive.id) {
    return profile;
  }

  const next = cloneProfile(profile);
  next.teamDirectiveId = directive.id;
  next.log.unshift(`Приказ отряду изменен: ${directive.name}.`);
  return touch(next);
}

export function changeProfession(profile: GameProfile, professionId: ProfessionId) {
  const mode = getProfessionChangeMode(profile, professionId);
  if (mode === "selected" || mode === "blocked") {
    return profile;
  }

  const next = cloneProfile(profile);

  if (mode === "free") {
    next.professionChangeSeasonKey = getProfessionSeason(next.dayKey).key;
  }

  if (mode === "paid") {
    removeResources(next.resources, professionChangeCost);
  }

  next.professionId = professionId;
  next.log.unshift(
    mode === "free"
      ? `Бесплатная смена профессии: ${getProfession(professionId).name}.`
      : `Профессия изменена за ресурсы: ${getProfession(professionId).name}.`,
  );
  return touch(next);
}

function createEnhancementBag(initial: Partial<EnhancementBag> = {}): EnhancementBag {
  return enhancementIds.reduce((bag, id) => {
    bag[id] = Math.max(0, Math.floor(Number(initial[id] || 0)));
    return bag;
  }, {} as EnhancementBag);
}

function createEquipmentBag(initial: Partial<EquipmentBag> = {}): EquipmentBag {
  return equipmentIds.reduce((bag, id) => {
    bag[id] = Math.max(0, Math.floor(Number(initial[id] || 0)));
    return bag;
  }, {} as EquipmentBag);
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
    professionChangeSeasonKey: typeof legacy.professionChangeSeasonKey === "string" ? legacy.professionChangeSeasonKey : "",
    teamDirectiveId: isTeamDirectiveId(legacy.teamDirectiveId) ? legacy.teamDirectiveId : DEFAULT_TEAM_DIRECTIVE_ID,
    level: Math.max(1, Math.floor(Number(legacy.level || 1))),
    xp: Math.max(0, Math.floor(Number(legacy.xp || 0))),
    energy: Math.max(0, Math.floor(Number(legacy.energy ?? 4))),
    resources: normalizeResources(legacy.resources),
    enhancements: migratedEnhancements,
    equipment: createEquipmentBag(legacy.equipment),
    discoveredBlueprints: normalizeEquipmentIds(legacy.discoveredBlueprints),
    completedMissions: Array.isArray(legacy.completedMissions) ? legacy.completedMissions.slice() : [],
    completedDungeons: normalizeDungeonIds(legacy.completedDungeons || legacy.defeatedMobs),
    completedPathfinderExpeditions: normalizePathfinderExpeditionIds(legacy.completedPathfinderExpeditions),
    battleContribution: Math.max(0, Math.floor(Number(legacy.battleContribution || 0))),
    combatTrainingRewardsClaimed: Math.max(0, Math.floor(Number(legacy.combatTrainingRewardsClaimed || 0))),
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
    coins: Math.max(0, Math.floor(Number(resources?.coins || 0))),
  };
}

function normalizeDungeonIds(ids: string[] | undefined): DungeonId[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const validIds = new Set(dungeons.map((dungeon) => dungeon.id));
  return ids.filter((id): id is DungeonId => validIds.has(id as DungeonId));
}

function normalizeEquipmentIds(ids: string[] | undefined): EquipmentId[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const validIds = new Set(equipmentIds);
  return ids.filter((id): id is EquipmentId => validIds.has(id as EquipmentId));
}

function normalizePathfinderExpeditionIds(ids: string[] | undefined): PathfinderExpeditionId[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const validIds = new Set(pathfinderExpeditionIds);
  return ids.filter((id): id is PathfinderExpeditionId => validIds.has(id as PathfinderExpeditionId));
}

function getDirectiveMissionRewards(profile: GameProfile, mission: DailyMission): Partial<ResourceBag> {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;

  if (directiveId === "craft") {
    return compactResources({
      ore: 1,
      coins: profile.professionId === "miner" ? 1 : 0,
    });
  }

  if (directiveId === "research" && studyMissionIds.has(mission.id)) {
    return { schematics: 1 };
  }

  if (directiveId === "alchemy" && studyMissionIds.has(mission.id)) {
    return compactResources({
      essence: 1,
      schematics: profile.professionId === "enchanter" ? 1 : 0,
    });
  }

  if (directiveId === "market") {
    return { supplies: 1, coins: 2 };
  }

  return {};
}

function getDirectiveMissionXp(profile: GameProfile, mission: DailyMission) {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  if (directiveId === "training") {
    return profile.professionId === "tactician" ? 14 : 10;
  }

  if (directiveId === "research" && studyMissionIds.has(mission.id)) {
    return 6;
  }

  if (directiveId === "alchemy" && studyMissionIds.has(mission.id)) {
    return profile.professionId === "enchanter" ? 12 : 8;
  }

  return 0;
}

function getDirectiveMissionContribution(profile: GameProfile) {
  const directiveId = getTeamDirective(profile.teamDirectiveId).id;
  const tacticianPush = profile.professionId === "tactician" ? 1 : 0;
  return directiveId === "hunt" ? 2 + tacticianPush : directiveId === "command" ? 1 + tacticianPush : 0;
}

function isProfessionId(id: unknown): id is ProfessionId {
  return typeof id === "string" && professions.some((profession) => profession.id === id);
}

function isTeamDirectiveId(id: unknown): id is TeamDirectiveId {
  return typeof id === "string" && teamDirectives.some((directive) => directive.id === id);
}

function getProfessionSeasonIndex(dayKey: string) {
  const date = parseDateKey(dayKey);
  const epochDate = parseDateKey(PROFESSION_SEASON_EPOCH_KEY);
  const dayDistance = Math.floor((date.getTime() - epochDate.getTime()) / 86400000);
  return Math.floor(dayDistance / PROFESSION_SEASON_LENGTH_DAYS);
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

function getCombatTrainingRankBonus(rank: CombatTrainingRewardRank) {
  const bonuses: Record<CombatTrainingRewardRank, number> = {
    S: 35,
    A: 20,
    B: 10,
    C: 0,
  };

  return bonuses[rank];
}

function scaleRankReward(value: number, bonusPercent: number) {
  return Math.max(0, Math.round(value * (1 + bonusPercent / 100)));
}

function getEquipmentStatPower(stats: EquipmentStatBag) {
  return (
    (stats.strength || 0) * 7 +
    (stats.agility || 0) * 5 +
    (stats.intelligence || 0) * 6 +
    (stats.craft || 0) * 4 +
    (stats.economy || 0) * 3 +
    (stats.readiness || 0) * 5
  );
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
    equipment: { ...profile.equipment },
    discoveredBlueprints: profile.discoveredBlueprints.slice(),
    completedMissions: profile.completedMissions.slice(),
    completedDungeons: profile.completedDungeons.slice(),
    completedPathfinderExpeditions: profile.completedPathfinderExpeditions.slice(),
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
