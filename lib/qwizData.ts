export type Employee = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  totalPoints: number;
  weeklyPoints: number;
  streak: number;
};

export type Prize = {
  place: number;
  title: string;
  detail: string;
};

export type Question = {
  text: string;
  options: string[];
  correct: number;
};

export type Quiz = {
  id: string;
  title: string;
  category: string;
  questions: Question[];
};

export type Completion = {
  quizId: string;
  score: number;
  correct: number;
  accuracy: number;
  answers: number[];
  streakAfter: number;
  completedAt: string;
};

export type WeeklyWinner = {
  place: number;
  employeeId: string;
  name: string;
  weeklyPoints: number;
  prize: string;
};

export type WeeklyAward = {
  weekKey: string;
  label: string;
  winners: WeeklyWinner[];
  createdAt: string;
};

export type AppState = {
  selectedEmployeeId: string;
  employees: Employee[];
  prizePool: Prize[];
  completions: Record<string, Record<string, Completion>>;
  awardHistory: WeeklyAward[];
};

export const APP_TIME_ZONE = "Asia/Irkutsk";

export const employeesSeed: Employee[] = [
  {
    id: "an",
    name: "Аида Новикова",
    role: "Продажи",
    avatar: "АН",
    totalPoints: 620,
    weeklyPoints: 164,
    streak: 6,
  },
  {
    id: "mk",
    name: "Марк Ким",
    role: "Поддержка",
    avatar: "МК",
    totalPoints: 590,
    weeklyPoints: 142,
    streak: 4,
  },
  {
    id: "es",
    name: "Елена Смирнова",
    role: "Операции",
    avatar: "ЕС",
    totalPoints: 545,
    weeklyPoints: 136,
    streak: 5,
  },
  {
    id: "dr",
    name: "Даниил Романов",
    role: "Маркетинг",
    avatar: "ДР",
    totalPoints: 488,
    weeklyPoints: 118,
    streak: 3,
  },
  {
    id: "vp",
    name: "Виктория Павлова",
    role: "HR",
    avatar: "ВП",
    totalPoints: 430,
    weeklyPoints: 96,
    streak: 2,
  },
  {
    id: "it",
    name: "Илья Тарасов",
    role: "IT",
    avatar: "ИТ",
    totalPoints: 394,
    weeklyPoints: 82,
    streak: 1,
  },
];

export const prizePool: Prize[] = [
  {
    place: 1,
    title: "Премия 3 000 ₽",
    detail: "Для лидера недельного рейтинга",
  },
  {
    place: 2,
    title: "Сертификат 2 000 ₽",
    detail: "Для второго места",
  },
  {
    place: 3,
    title: "Дополнительный выходной слот",
    detail: "Для третьего места",
  },
];

export const quizzes: Quiz[] = [
  {
    id: "service",
    title: "Культура сервиса",
    category: "Клиенты",
    questions: [
      {
        text: "Что лучше всего делать после сложного обращения клиента?",
        options: [
          "Закрыть тикет сразу после ответа",
          "Зафиксировать причину, решение и следующий шаг",
          "Перенаправить клиента без комментария",
          "Подождать повторного обращения",
        ],
        correct: 1,
      },
      {
        text: "Какой ответ помогает снизить напряжение в переписке?",
        options: [
          "Короткое отрицание",
          "Обещание без срока",
          "Признание проблемы и конкретный срок",
          "Ссылка на общий регламент",
        ],
        correct: 2,
      },
      {
        text: "Что считается хорошей метрикой качества сервиса?",
        options: [
          "Только количество закрытых обращений",
          "Скорость без оценки клиента",
          "Решение с первого контакта и удовлетворенность",
          "Количество сообщений в чате",
        ],
        correct: 2,
      },
      {
        text: "Когда стоит передавать обращение коллегам?",
        options: [
          "Когда нужен владелец процесса или специальные права",
          "Когда вопрос кажется скучным",
          "После первого сообщения клиента",
          "Только в конце недели",
        ],
        correct: 0,
      },
      {
        text: "Что важнее всего в финальном сообщении клиенту?",
        options: [
          "Краткий итог решения",
          "Длинная история переписки",
          "Внутренние причины сбоя",
          "Оценка работы других команд",
        ],
        correct: 0,
      },
    ],
  },
  {
    id: "security",
    title: "Безопасность данных",
    category: "Процессы",
    questions: [
      {
        text: "Что нужно сделать при подозрительном письме с вложением?",
        options: [
          "Открыть вложение на телефоне",
          "Переслать всем в команде",
          "Сообщить ответственным и не открывать файл",
          "Удалить письмо без фиксации",
        ],
        correct: 2,
      },
      {
        text: "Где безопаснее хранить рабочие пароли?",
        options: [
          "В корпоративном менеджере паролей",
          "В заметках на рабочем столе",
          "В личном мессенджере",
          "В общем документе отдела",
        ],
        correct: 0,
      },
      {
        text: "Что делать перед отправкой отчета внешнему адресату?",
        options: [
          "Проверить получателя и состав данных",
          "Отправить быстрее, потом уточнить",
          "Добавить всех коллег в копию",
          "Убрать тему письма",
        ],
        correct: 0,
      },
      {
        text: "Какая практика снижает риск доступа к данным?",
        options: [
          "Единый пароль для всех систем",
          "Доступ по роли и регулярная ревизия",
          "Передача логина сменщику",
          "Хранение выгрузок без срока",
        ],
        correct: 1,
      },
      {
        text: "Как поступить с найденной уязвимостью в процессе?",
        options: [
          "Обсудить в открытом чате",
          "Использовать как обходной путь",
          "Передать по внутреннему каналу безопасности",
          "Подождать следующего аудита",
        ],
        correct: 2,
      },
    ],
  },
  {
    id: "collaboration",
    title: "Командная работа",
    category: "Коммуникация",
    questions: [
      {
        text: "Что делает задачу понятной для исполнителя?",
        options: [
          "Контекст, результат и срок",
          "Только срочность",
          "Большое количество ссылок",
          "Устное упоминание без записи",
        ],
        correct: 0,
      },
      {
        text: "Как лучше начать встречу по проблемному проекту?",
        options: [
          "С фактов, цели встречи и ограничений",
          "С поиска виноватого",
          "С обсуждения всех прошлых ошибок",
          "С переноса встречи",
        ],
        correct: 0,
      },
      {
        text: "Какой формат статуса наиболее полезен?",
        options: [
          "Все нормально",
          "Пока не знаю",
          "Сделано, риск, следующий шаг",
          "Вернусь позже",
        ],
        correct: 2,
      },
      {
        text: "Что помогает не терять решения после созвона?",
        options: [
          "Короткое резюме с владельцами действий",
          "Надежда на память участников",
          "Еще один созвон без повестки",
          "Длинная запись без итогов",
        ],
        correct: 0,
      },
      {
        text: "Когда стоит эскалировать риск?",
        options: [
          "Когда уже сорван срок",
          "Когда риск влияет на срок, бюджет или клиента",
          "Только после нескольких напоминаний",
          "Никогда, если команда занята",
        ],
        correct: 1,
      },
    ],
  },
];

export function createInitialState(): AppState {
  return {
    selectedEmployeeId: employeesSeed[0].id,
    employees: employeesSeed.map((employee) => ({ ...employee })),
    prizePool: prizePool.map((prize) => ({ ...prize })),
    completions: {},
    awardHistory: [],
  };
}

export function getTodayKey() {
  return getDateKey(new Date());
}

export function getDateKey(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function formatUtcDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekStartKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return formatUtcDateKey(date);
}

export function displayDate(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    ...options,
  }).format(parseDateKey(dateKey));
}

export function getTodayQuiz(todayKey: string) {
  const checksum = todayKey
    .split("")
    .filter((char) => char !== "-")
    .reduce((total, char) => total + Number(char), 0);
  return quizzes[checksum % quizzes.length];
}

export function calculateScore(quiz: Quiz, answers: number[], streak: number) {
  const correct = quiz.questions.reduce((total, question, index) => {
    return total + (answers[index] === question.correct ? 1 : 0);
  }, 0);
  const accuracy = Math.round((correct / quiz.questions.length) * 100);
  const streakAfter = streak + 1;
  const streakBonus = Math.min(streakAfter * 2, 14);
  const perfectBonus = correct === quiz.questions.length ? 18 : 0;
  const score = 10 + correct * 12 + streakBonus + perfectBonus;

  return {
    score,
    correct,
    accuracy,
    streakAfter,
  };
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}
