import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readLocalEnv() {
  const env = {};

  for (const fileName of [".env", ".env.local"]) {
    let content = "";
    try {
      content = readFileSync(fileName, "utf8");
    } catch {
      continue;
    }

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      const quote = value[0];
      if ((quote === '"' || quote === "'") && value.at(-1) === quote) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  }

  return env;
}

const employees = [
  ["an", "Аида Новикова", "Продажи", "АН", 620, 164, 6],
  ["mk", "Марк Ким", "Поддержка", "МК", 590, 142, 4],
  ["es", "Елена Смирнова", "Операции", "ЕС", 545, 136, 5],
  ["dr", "Даниил Романов", "Маркетинг", "ДР", 488, 118, 3],
  ["vp", "Виктория Павлова", "HR", "ВП", 430, 96, 2],
  ["it", "Илья Тарасов", "IT", "ИТ", 394, 82, 1],
].map(([id, full_name, role, avatar, total_points, weekly_points, streak]) => ({
  id,
  full_name,
  role,
  avatar,
  total_points,
  weekly_points,
  streak,
}));

const prizes = [
  [1, "Премия 3 000 ₽", "Для лидера недельного рейтинга"],
  [2, "Сертификат 2 000 ₽", "Для второго места"],
  [3, "Дополнительный выходной слот", "Для третьего места"],
].map(([place, title, detail]) => ({ place, title, detail }));

const quizzes = [
  {
    id: "service",
    title: "Культура сервиса",
    category: "Клиенты",
    questions: [
      [
        "Что лучше всего делать после сложного обращения клиента?",
        [
          "Закрыть тикет сразу после ответа",
          "Зафиксировать причину, решение и следующий шаг",
          "Перенаправить клиента без комментария",
          "Подождать повторного обращения",
        ],
        1,
      ],
      [
        "Какой ответ помогает снизить напряжение в переписке?",
        ["Короткое отрицание", "Обещание без срока", "Признание проблемы и конкретный срок", "Ссылка на общий регламент"],
        2,
      ],
      [
        "Что считается хорошей метрикой качества сервиса?",
        [
          "Только количество закрытых обращений",
          "Скорость без оценки клиента",
          "Решение с первого контакта и удовлетворенность",
          "Количество сообщений в чате",
        ],
        2,
      ],
      [
        "Когда стоит передавать обращение коллегам?",
        [
          "Когда нужен владелец процесса или специальные права",
          "Когда вопрос кажется скучным",
          "После первого сообщения клиента",
          "Только в конце недели",
        ],
        0,
      ],
      [
        "Что важнее всего в финальном сообщении клиенту?",
        ["Краткий итог решения", "Длинная история переписки", "Внутренние причины сбоя", "Оценка работы других команд"],
        0,
      ],
    ],
  },
  {
    id: "security",
    title: "Безопасность данных",
    category: "Процессы",
    questions: [
      [
        "Что нужно сделать при подозрительном письме с вложением?",
        [
          "Открыть вложение на телефоне",
          "Переслать всем в команде",
          "Сообщить ответственным и не открывать файл",
          "Удалить письмо без фиксации",
        ],
        2,
      ],
      [
        "Где безопаснее хранить рабочие пароли?",
        ["В корпоративном менеджере паролей", "В заметках на рабочем столе", "В личном мессенджере", "В общем документе отдела"],
        0,
      ],
      [
        "Что делать перед отправкой отчета внешнему адресату?",
        ["Проверить получателя и состав данных", "Отправить быстрее, потом уточнить", "Добавить всех коллег в копию", "Убрать тему письма"],
        0,
      ],
      [
        "Какая практика снижает риск доступа к данным?",
        ["Единый пароль для всех систем", "Доступ по роли и регулярная ревизия", "Передача логина сменщику", "Хранение выгрузок без срока"],
        1,
      ],
      [
        "Как поступить с найденной уязвимостью в процессе?",
        ["Обсудить в открытом чате", "Использовать как обходной путь", "Передать по внутреннему каналу безопасности", "Подождать следующего аудита"],
        2,
      ],
    ],
  },
  {
    id: "collaboration",
    title: "Командная работа",
    category: "Коммуникация",
    questions: [
      [
        "Что делает задачу понятной для исполнителя?",
        ["Контекст, результат и срок", "Только срочность", "Большое количество ссылок", "Устное упоминание без записи"],
        0,
      ],
      [
        "Как лучше начать встречу по проблемному проекту?",
        ["С фактов, цели встречи и ограничений", "С поиска виноватого", "С обсуждения всех прошлых ошибок", "С переноса встречи"],
        0,
      ],
      ["Какой формат статуса наиболее полезен?", ["Все нормально", "Пока не знаю", "Сделано, риск, следующий шаг", "Вернусь позже"], 2],
      [
        "Что помогает не терять решения после созвона?",
        ["Короткое резюме с владельцами действий", "Надежда на память участников", "Еще один созвон без повестки", "Длинная запись без итогов"],
        0,
      ],
      [
        "Когда стоит эскалировать риск?",
        ["Когда уже сорван срок", "Когда риск влияет на срок, бюджет или клиента", "Только после нескольких напоминаний", "Никогда, если команда занята"],
        1,
      ],
    ],
  },
];

const env = { ...readLocalEnv(), ...process.env };
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function countRows(table) {
  const { count, error } = await supabase.from(table).select("*", {
    count: "exact",
    head: true,
  });

  if (error) {
    console.error(`${table}: ${error.code || "supabase_error"}: ${error.message}`);
    process.exit(1);
  }

  return count ?? 0;
}

async function insertIfEmpty(label, table, rows) {
  const existingRows = await countRows(table);
  if (existingRows > 0) {
    console.log(`${label}: skipped (${existingRows} existing rows)`);
    return;
  }

  const { error } = await supabase.from(table).insert(rows);
  if (error) {
    console.error(`${label}: ${error.code || "supabase_error"}: ${error.message}`);
    process.exit(1);
  }

  console.log(`${label}: inserted ${rows.length}`);
}

await insertIfEmpty("employees", "qwiz_employees", employees);
await insertIfEmpty("prizes", "qwiz_prizes", prizes);
await insertIfEmpty(
  "quizzes",
  "qwiz_quizzes",
  quizzes.map(({ id, title, category }) => ({ id, title, category })),
);

const questions = quizzes.flatMap((quiz) =>
  quiz.questions.map(([prompt, options, correct_index], index) => ({
    quiz_id: quiz.id,
    sort_order: index + 1,
    prompt,
    options,
    correct_index,
  })),
);

await insertIfEmpty("questions", "qwiz_questions", questions);
console.log("Seed complete");
