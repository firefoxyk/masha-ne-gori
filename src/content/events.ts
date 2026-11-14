import type { GameEvent } from '../game/events'

// Черновые истории для проверки формата; игра пока их не использует.
export const exampleEvents = [
  {
    id: 'assistant-report',
    title: 'Отчёт помощника',
    text: 'ИИ-помощник принёс отчёт и торжественно объявил, что почти уверен в результате.',
    dialogue: [{ speaker: 'Помощник', text: 'Всё готово! Кажется.' }],
    trigger: { type: 'after_action', action: 'work' },
    conditions: [],
    repeat: 'repeatable',
    choices: [
      { id: 'review', text: 'Проверить отчёт', effects: { energy: -5, motivation: 3 }, result: 'Маша нашла опечатку и похвалила себя за внимательность.' },
      { id: 'postpone', text: 'Вернуться к отчёту позже', effects: { unfinishedProjects: 1 }, result: 'Отчёт отправился в папку «потом», где ему уже приготовили место.' },
    ],
  },
  {
    id: 'hungry-fridge',
    title: 'Важное совещание с холодильником',
    text: 'Маша заглянула на кухню: желудок явно требует слова.',
    dialogue: [{ speaker: 'Маша', text: 'Интересно, печенье считается обедом?' }],
    trigger: { type: 'state' },
    conditions: [{ field: 'satiety', max: 30 }],
    repeat: 'repeatable',
    choices: [
      { id: 'snack', text: 'Купить перекус', conditions: [{ field: 'money', min: 10 }], effects: { money: -10, satiety: 15 }, result: 'Перекус устроил короткий праздник в животе.' },
      { id: 'tea', text: 'Заварить чай и немного передохнуть', effects: { sanity: 3 }, result: 'Чай не обед, но пауза получилась уютной.' },
    ],
  },
  {
    id: 'goose-note',
    title: 'Гусиная записка',
    text: 'На пороге лежит записка с загадочным отпечатком лапы.',
    dialogue: [{ speaker: 'Гусь', text: 'Га.' }],
    trigger: { type: 'state' },
    conditions: [{ field: 'day', min: 2 }],
    repeat: 'once',
    choices: [
      { id: 'read', text: 'Прочитать записку', effects: { sanity: 4 }, result: 'В записке нарисован гусь. Похоже, это автограф.' },
      { id: 'save', text: 'Отложить на потом', effects: { motivation: 2 }, result: 'Маша аккуратно положила записку рядом с планами.' },
    ],
  },
] satisfies [GameEvent, ...GameEvent[]]
