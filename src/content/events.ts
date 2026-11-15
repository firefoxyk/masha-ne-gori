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
      { id: 'stretch', text: 'Потянуться и отложить дела', effects: { energy: 4, motivation: -2 }, result: 'Маша потянулась и почувствовала прилив сил, но настроение приниматься за дела немного улетучилось.' },
      { id: 'listen', text: 'Прислушаться к звукам за окном', effects: { sanity: 4, energy: -3 }, result: 'Маша отвлеклась и успокоилась, хотя внимательно прислушиваться оказалось немного утомительно.' },
    ],
  },
  {
    id: 'quiet-evening', title: 'Тихий уголок',
    text: 'В комнате наконец тихо. Даже мысли выстроились в очередь.',
    dialogue: [{ speaker: 'Маша', text: 'Главное — не спугнуть.' }],
    trigger: { type: 'after_action', action: 'rest' }, conditions: [{ field: 'day', min: 2 }], repeat: 'repeatable',
    choices: [
      { id: 'nap', text: 'Ещё немного полежать', effects: { energy: 5, motivation: -3 }, result: 'Маша отдохнула, но приниматься за планы после этого расхотелось.' },
      { id: 'sketch', text: 'Потратить силы на набросок идеи', effects: { motivation: 4, energy: -4 }, result: 'На набросок ушли силы, зато в блокноте появилась вдохновляющая идея и убедительная закорючка.' },
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
  {
    id: 'goose-gift-start', title: 'Гусиный подарок',
    text: 'Гусь торжественно принёс Маше перо и ждёт ответа.',
    dialogue: [{ speaker: 'Гусь', text: 'Га!' }], trigger: { type: 'state' }, conditions: [{ field: 'day', min: 2 }], repeat: 'once',
    choices: [
      { id: 'accept', text: 'Принять перо', effects: { sanity: 3 }, result: 'Маша поблагодарила гуся и поставила перо в стакан.' },
      { id: 'decline', text: 'Вежливо отказаться', effects: { motivation: 2 }, result: 'Маша объяснила, что перо нужнее гусю. Он задумался.' },
    ],
  },
  {
    id: 'goose-gift-accepted', title: 'Гусиная выставка',
    text: 'Гусь вернулся и серьёзно осматривает своё перо в стакане.',
    dialogue: [{ speaker: 'Гусь', text: 'Га-а!' }], trigger: { type: 'state' }, conditions: [], repeat: 'once',
    continuation: { eventId: 'goose-gift-start', choiceId: 'accept', minDays: 1 },
    choices: [{ id: 'admire', text: 'Устроить выставку одного пера', effects: { sanity: 3, energy: -2 }, result: 'Гусь одобрил выставку. Подготовка немного утомила Машу.' }],
  },
  {
    id: 'goose-gift-declined', title: 'Гусиная коллекция',
    text: 'Гусь вернулся с целой охапкой перьев. Похоже, отказ его вдохновил.',
    dialogue: [{ speaker: 'Гусь', text: 'Га-га!' }], trigger: { type: 'state' }, conditions: [], repeat: 'once',
    continuation: { eventId: 'goose-gift-start', choiceId: 'decline', minDays: 1 },
    choices: [{ id: 'applaud', text: 'Похвалить коллекцию', effects: { motivation: 3, energy: -2 }, result: 'Гусь расправил крылья. Аплодировать оказалось небольшой зарядкой.' }],
  },
  {
    id: 'assistant-help-start', title: 'Помощник и список',
    text: 'Помощник предлагает помочь с бытовыми делами и ждёт инструкций.',
    dialogue: [{ speaker: 'Помощник', text: 'Готов составить список. Даже два.' }], trigger: { type: 'after_action', action: 'work' }, conditions: [], repeat: 'once',
    choices: [
      { id: 'shopping', text: 'Попросить список покупок', effects: { sanity: 2 }, result: 'Помощник обещал подготовить список покупок.' },
      { id: 'break', text: 'Попросить идею для отдыха', effects: { motivation: 2 }, result: 'Помощник задумался о хорошем отдыхе.' },
    ],
  },
  {
    id: 'assistant-shopping', title: 'Список с запасом',
    text: 'В списке покупок помощника оказались чай, хлеб и сто огурцов.',
    dialogue: [{ speaker: 'Помощник', text: 'На случай огуречного сезона.' }], trigger: { type: 'state' }, conditions: [], repeat: 'once',
    continuation: { eventId: 'assistant-help-start', choiceId: 'shopping', minDays: 1 },
    choices: [{ id: 'check', text: 'Проверить список', effects: { energy: -3, sanity: 3 }, result: 'Маша исправила список. Проверка заняла немного сил.' }],
  },
  {
    id: 'idea-garden', title: 'Зелень с характером',
    text: 'После отдыха Маша заметила пустой горшок и вспомнила о «Зелёном уголке» из списка идей.',
    dialogue: [{ speaker: 'Маша', text: 'Интересно, растения тоже составляют планы на понедельник?' }],
    trigger: { type: 'after_action', action: 'rest' }, conditions: [], repeat: 'once', requiresIdea: 'balcony-garden',
    choices: [
      { id: 'start', text: 'Начать «Зелёный уголок» — 1 действие', projectStart: 'balcony-garden', effects: {}, result: 'Маша начала «Зелёный уголок». Следующий шаг ждёт в разделе проектов.' },
      { id: 'later', text: 'Оставить идею в списке на потом — бесплатно', effects: {}, result: '«Зелёный уголок» по-прежнему ждёт в доступных идеях.' },
      { id: 'decline', text: 'Пока не заниматься этим — бесплатно', effects: {}, result: 'Маша решила не спешить. Идея остаётся в списке на случай, если настроение изменится.' },
    ],
  },
  {
    id: 'idea-recipes', title: 'Рецепт на память',
    text: 'После еды Маша вспомнила о своей идее собрать простые рецепты.',
    dialogue: [{ speaker: 'Маша', text: 'Первый рецепт: не забыть, что поставила чайник.' }],
    trigger: { type: 'after_action', action: 'eat' }, conditions: [], repeat: 'once', requiresIdea: 'recipe-book',
    choices: [
      { id: 'start', text: 'Начать «Книгу простых рецептов» — 1 действие', projectStart: 'recipe-book', effects: {}, result: 'Маша начала «Книгу простых рецептов». Следующий шаг ждёт в разделе проектов.' },
      { id: 'later', text: 'Оставить идею в списке на потом — бесплатно', effects: {}, result: '«Книга простых рецептов» остаётся в списке доступных идей.' },
      { id: 'decline', text: 'Пока не заниматься этим — бесплатно', effects: {}, result: 'Маша решила пока не собирать рецепты. Идея никуда не исчезла из списка.' },
    ],
  },
  {
    id: 'idea-postcard', title: 'Почта хорошего настроения',
    text: 'Закончив работу, Маша вспомнила идею открытки для соседа.',
    dialogue: [{ speaker: 'Маша', text: 'Пожалуй, это письмо не потребует трёх согласований.' }],
    trigger: { type: 'after_action', action: 'work' }, conditions: [], repeat: 'once', requiresIdea: 'cozy-corner',
    choices: [
      { id: 'start', text: 'Начать «Открытку для соседа» — 1 действие', projectStart: 'cozy-corner', effects: {}, result: 'Маша начала «Открытку для соседа». Следующий шаг ждёт в разделе проектов.' },
      { id: 'later', text: 'Оставить идею в списке на потом — бесплатно', effects: {}, result: '«Открытка для соседа» остаётся в списке доступных идей.' },
      { id: 'decline', text: 'Пока не заниматься этим — бесплатно', effects: {}, result: 'Маша решила повременить. Вернуться к идее можно в списке проектов.' },
    ],
  },
  {
    id: 'assistant-break', title: 'Совет для отдыха',
    text: 'Помощник предложил отдыхать по расписанию и приложил расписание на десять страниц.',
    dialogue: [{ speaker: 'Помощник', text: 'Первый пункт — прочесть инструкцию.' }], trigger: { type: 'state' }, conditions: [], repeat: 'once',
    continuation: { eventId: 'assistant-help-start', choiceId: 'break', minDays: 1 },
    choices: [{ id: 'simplify', text: 'Выбрать простую паузу', effects: { motivation: 3, energy: -2 }, result: 'Маша составила короткий план отдыха и потратила немного сил на выбор.' }],
  },
  {
    id: 'assistant-project-tea', title: 'Чай для команды',
    text: 'После работы Маша предлагает помощнику виртуальный чай. Тот уточняет, нужен ли для него виртуальный чайник.',
    dialogue: [{ speaker: 'Помощник', text: 'Я подготовил список из трёх вариантов чаепития.' }],
    trigger: { type: 'after_action', action: 'work' }, conditions: [], repeat: 'once',
    choices: [
      { id: 'together', text: 'Устроить небольшую паузу', effects: { energy: 2, motivation: 1 }, result: 'Маша выпила чай, а помощник терпеливо подождал. Команда довольна.' },
      { id: 'list', text: 'Проверить список', effects: { energy: -2, sanity: 3 }, result: 'Маша вычеркнула виртуальный чайник и оставила время для настоящей паузы.' },
    ],
  },
  {
    id: 'rocking-chair-first-rest', title: 'Минутка в кресле',
    text: 'Маша устраивается в новом кресле-качалке. Оно тихонько поскрипывает, словно предлагает обсудить планы на вечер.',
    dialogue: [{ speaker: 'Маша', text: 'Планы подождут. Сначала проверим, умею ли я просто сидеть.' }],
    trigger: { type: 'after_action', action: 'rest' }, conditions: [], requiresItem: 'rocking-chair', repeat: 'once',
    choices: [
      { id: 'pause', text: 'Немного покачаться', effects: { sanity: 3 }, result: 'Маша закрыла глаза. Кресло одобрительно скрипнуло.' },
      { id: 'ideas', text: 'Записать спокойную идею', effects: { motivation: 3, energy: -2 }, result: 'Идея заняла одну строчку, а отдых — всё остальное время.' },
    ],
  },
] satisfies [GameEvent, ...GameEvent[]]
