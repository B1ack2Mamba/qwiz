# Qwiz Team League

Внутреннее приложение для ежедневных квизов сотрудников, начисления баллов, недельных рейтингов и бонусных призов.

## Стек

- Next.js Pages Router
- React
- Supabase
- TypeScript

## Запуск локально

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:3000`.

## Supabase

1. Создайте новый проект Supabase.
2. Скопируйте `.env.example` в `.env.local`.
3. Заполните `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` и `SUPABASE_SERVICE_ROLE_KEY`.
4. Выполните SQL из `supabase/migrations/001_qwiz_schema.sql` или добавьте `SUPABASE_ACCESS_TOKEN` и запустите:

```bash
npm run apply:supabase
```

5. Проверьте подключение и залейте стартовые данные:

```bash
npm run check:supabase
npm run seed:supabase
```

Если переменные Supabase не заданы, интерфейс продолжит работать как локальное демо через `localStorage`.

## Возможности

- выбор сотрудника;
- ежедневный квиз с начислением баллов;
- сохранение локального прогресса;
- синхронизация попыток в Supabase через API-роут;
- недельный рейтинг;
- бонусный фонд и формирование выдачи призов;
- активность команды за текущий день;
- история недельных выдач.
