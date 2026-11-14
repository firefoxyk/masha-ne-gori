import type { GameEvent } from '../game/events.ts'

// Черновые истории; тексты и числовой баланс могут измениться после игровых проб.
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
  {
    id: 'work-list', title: 'Список дел с характером',
    text: 'Список дел стал таким длинным, что его хочется свернуть в рулон.',
    dialogue: [{ speaker: 'Маша', text: 'Одно дело за раз. Или хотя бы один рулон.' }],
    trigger: { type: 'after_action', action: 'work' }, conditions: [], repeat: 'repeatable',
    choices: [
      { id: 'prioritize', text: 'Выбрать главное', effects: { energy: -3, motivation: 4 }, result: 'У списка появился первый пункт, а у Маши — план.' },
      { id: 'shelve', text: 'Закрыть список до завтра', effects: { sanity: 3, motivation: -2 }, result: 'Список подождёт. Маша тоже имеет право на паузу.' },
    ],
  },
  {
    id: 'assistant-letter', title: 'Слишком вежливое письмо',
    text: 'Помощник составил ответ клиенту и трижды поблагодарил его за существование.',
    dialogue: [{ speaker: 'Помощник', text: 'Вежливость рассчитана с запасом.' }],
    trigger: { type: 'after_action', action: 'work' }, conditions: [{ field: 'day', min: 2 }], repeat: 'repeatable',
    choices: [
      { id: 'proofread', text: 'Проверить и отправить', effects: { energy: -4, money: 8 }, result: 'Маша исправила письмо и получила небольшую оплату за срочность.' },
      { id: 'simplify', text: 'Ответить коротко самой', effects: { motivation: 3, sanity: -2 }, result: 'Короткий ответ ушёл адресату. Помощник слегка растерялся.' },
    ],
  },
  {
    id: 'last-cookie', title: 'Последнее печенье',
    text: 'После еды Маша заметила последнее печенье. Рядом записка: «Не забудь купить ещё».',
    dialogue: [{ speaker: 'Маша', text: 'Сложные переговоры начинаются.' }],
    trigger: { type: 'after_action', action: 'eat' }, conditions: [], repeat: 'repeatable',
    choices: [
      { id: 'buy-more', text: 'Купить ещё и устроить чаепитие', effects: { money: -5, sanity: 4 }, result: 'К чаю нашлось угощение, а на кухне стало чуточку уютнее.' },
      { id: 'save-cookie', text: 'Съесть печенье и отложить покупки', effects: { satiety: 5, motivation: -2 }, result: 'Печенье исчезло, а поход в магазин остался в списке дел.' },
    ],
  },
  {
    id: 'lunch-plan', title: 'План на обед',
    text: 'На сытый желудок строить планы проще. Особенно планы о следующем обеде.',
    dialogue: [{ speaker: 'Маша', text: 'Вот это я понимаю — дальновидность.' }],
    trigger: { type: 'state' }, conditions: [{ field: 'satiety', min: 50 }], repeat: 'repeatable',
    choices: [
      { id: 'prepare', text: 'Купить продукты заранее', effects: { money: -8, sanity: 4 }, result: 'Продукты куплены; одной бытовой заботой стало меньше.' },
      { id: 'improvise', text: 'Придумать рецепт из того, что есть', effects: { energy: -3, motivation: 3 }, result: 'Маша придумала рецепт и записала его на случай вдохновения.' },
    ],
  },
  {
    id: 'tiny-break', title: 'Пауза на потягушки',
    text: 'Отдых прервал важный вопрос: потянуться или послушать тишину?',
    dialogue: [{ speaker: 'Маша', text: 'Оба варианта звучат профессионально.' }],
    trigger: { type: 'after_action', action: 'rest' }, conditions: [], repeat: 'repeatable',
    choices: [
      { id: 'stretch', text: 'Потянуться', effects: { energy: 4, motivation: -2 }, result: 'Маша потянулась и решила не торопить следующие дела.' },
      { id: 'listen', text: 'Послушать тишину', effects: { sanity: 4, energy: -3 }, result: 'За окном кто-то шуршал, но в целом тишина удалась.' },
    ],
  },
  {
    id: 'quiet-evening', title: 'Тихий уголок',
    text: 'В комнате наконец тихо. Даже мысли выстроились в очередь.',
    dialogue: [{ speaker: 'Маша', text: 'Главное — не спугнуть.' }],
    trigger: { type: 'after_action', action: 'rest' }, conditions: [{ field: 'day', min: 2 }], repeat: 'repeatable',
    choices: [
      { id: 'nap', text: 'Ещё немного полежать', effects: { energy: 5, motivation: -3 }, result: 'Маша устроилась поудобнее и отложила планы ненадолго.' },
      { id: 'sketch', text: 'Набросать идею в блокноте', effects: { motivation: 4, energy: -4 }, result: 'В блокноте появилась идея и очень убедительная закорючка.' },
    ],
  },
  {
    id: 'napkin-idea', title: 'Идея на салфетке',
    text: 'Маше пришла в голову идея. Под рукой оказалась только салфетка.',
    dialogue: [{ speaker: 'Маша', text: 'Кажется, это может быть началом чего-то. Опять.' }],
    trigger: { type: 'state' }, conditions: [{ field: 'motivation', min: 50 }], repeat: 'repeatable',
    choices: [
      { id: 'start', text: 'Записать и начать новый проект', effects: { unfinishedProjects: 1, motivation: 3 }, result: 'У новой идеи появилась папка. И место среди незаконченных проектов.' },
      { id: 'park', text: 'Оставить идею на потом', effects: { sanity: 3, motivation: -2 }, result: 'Салфетка сохранена. Начинать всё прямо сейчас необязательно.' },
    ],
  },
  {
    id: 'almost-done', title: 'Папка «Почти готово»',
    text: 'Среди незаконченных проектов нашёлся один, которому нужен последний штрих.',
    dialogue: [{ speaker: 'Маша', text: 'На этот раз «почти» не шутит?' }],
    trigger: { type: 'state' }, conditions: [{ field: 'unfinishedProjects', min: 1 }], repeat: 'repeatable',
    choices: [
      { id: 'finish', text: 'Довести проект до конца', effects: { unfinishedProjects: -1, energy: -6, motivation: 3 }, result: 'Маша закончила проект и мысленно поставила ему галочку.' },
      { id: 'sort', text: 'Разобрать заметки без спешки', effects: { energy: -2, sanity: 3 }, result: 'Заметки разобраны. Сам проект пока подождёт.' },
    ],
  },
  {
    id: 'goose-courier', title: 'Гусь-доставщик',
    text: 'У двери гусь охраняет блестящую монетку и делает вид, что всё под контролем.',
    dialogue: [{ speaker: 'Гусь', text: 'Га-га!' }],
    trigger: { type: 'state' }, conditions: [{ field: 'day', min: 2 }], repeat: 'once',
    choices: [
      { id: 'negotiate', text: 'Обменять печенье на монетку', effects: { money: 5, sanity: -3 }, result: 'Гусь принял воображаемое печенье, но переговоры оказались напряжёнными.' },
      { id: 'wave', text: 'Помахать гусю и оставить находку ему', effects: { sanity: 3, motivation: -2 }, result: 'Гусь довольно зашагал прочь. Маша отвлеклась от дел.' },
    ],
  },
] satisfies [GameEvent, ...GameEvent[]]
