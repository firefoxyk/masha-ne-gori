import type { GameEvent } from '../game/events.ts'

// Черновик из задания: пока не подключён к игровому потоку.
// Последние десять историй требуют существующего правила открытия помощника.
export const workEvents = [
  {
    "id": "work-01",
    "title": "Маленькая просьба",
    "text": "Коллега: «Маш, тут совсем маленькая просьба. Добавишь одну кнопочку?»\n\nЧерез минуту он присылает документ на восемь страниц.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Давай сначала уточним задачу",
        "effects": {
          "motivation": 2
        },
        "result": "Маша находит главное."
      },
      {
        "id": "option-2",
        "text": "Ладно, сделаю по ходу",
        "effects": {
          "energy": -3
        },
        "result": "вечером обнаруживается, что кнопок нужно пять."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-02",
    "title": "Срочная задача",
    "text": "В чате сообщение: «СРОЧНО! Очень нужно!»\n\nОписание задачи: «Добавить красивенькое».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Спросить, что именно нужно",
        "effects": {
          "motivation": 2
        },
        "result": "заказчик присылает пример."
      },
      {
        "id": "option-2",
        "text": "Сделать на свой вкус",
        "effects": {
          "sanity": -2
        },
        "result": "получается красиво, но не то."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-03",
    "title": "Важный созвон",
    "text": "Коллега зовёт Машу на встречу «на пять минут». Через сорок минут все ещё выясняют, кто должен был создать встречу.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Записать решения и закончить",
        "effects": {
          "motivation": 2
        },
        "result": "встреча наконец приносит пользу."
      },
      {
        "id": "option-2",
        "text": "Молча ждать конца",
        "effects": {
          "energy": -3
        },
        "result": "Маша мысленно выращивает помидоры."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-04",
    "title": "Задача без автора",
    "text": "В списке новая задача. Описания нет, автор неизвестен, срок — вчера.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Спросить в общем чате",
        "effects": {
          "sanity": 2
        },
        "result": "оказывается, задачу создали случайно."
      },
      {
        "id": "option-2",
        "text": "Попробовать догадаться",
        "effects": {
          "energy": -3
        },
        "result": "после часа размышлений задача исчезает сама."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-05",
    "title": "Всё понятно",
    "text": "Заказчик: «Тут всё понятно, я же подробно описал».\n\nОписание: «Нужно как обычно, только по-другому».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Попросить пример",
        "effects": {
          "motivation": 2
        },
        "result": "появляется фотография таблицы. Уже лучше."
      },
      {
        "id": "option-2",
        "text": "Ответить: “Поняла”",
        "effects": {
          "sanity": -2
        },
        "result": "теперь Маша и заказчик понимают разное."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-06",
    "title": "Коллега спасает день",
    "text": "Маша полчаса ищет ошибку. Коллега замечает лишний символ: «Вот он».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Поблагодарить и сделать перерыв",
        "effects": {
          "sanity": 3
        },
        "result": "Маша благодарит коллегу и наконец делает паузу. Символу перерыв не положен."
      },
      {
        "id": "option-2",
        "text": "Сделать вид, что почти нашла сама",
        "effects": {},
        "result": "коллега понимающе кивает."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-07",
    "title": "Секретная таблица",
    "text": "Сотрудник склада: «Вот правильная версия таблицы. Но никому не говори, а то попросят общую».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Предложить общий источник данных",
        "effects": {
          "motivation": 2
        },
        "result": "идея нравится всем, кроме автора таблицы."
      },
      {
        "id": "option-2",
        "text": "Аккуратно использовать файл",
        "effects": {
          "energy": -2
        },
        "result": "Маша сохраняет его как «точно_последний»."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-08",
    "title": "Пятничная идея",
    "text": "В конце рабочего дня руководитель пишет: «А давайте к понедельнику полностью переделаем заказы?»",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Сначала обсудить объём",
        "effects": {
          "sanity": 2
        },
        "result": "решение откладывают до разговора."
      },
      {
        "id": "option-2",
        "text": "Открыть список задач",
        "effects": {
          "motivation": -2
        },
        "result": "Маша смотрит на него и закрывает обратно."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-09",
    "title": "Вопрос на весь отдел",
    "text": "Маша спрашивает, где актуальный список товаров. Пять человек присылают пять ссылок.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Сравнить версии вместе",
        "effects": {
          "energy": -2,
          "motivation": 2
        },
        "result": "находится нужная."
      },
      {
        "id": "option-2",
        "text": "Выбрать самый свежий по названию",
        "effects": {
          "sanity": -2
        },
        "result": "файл «актуальный_финал_точно2» оказывается пустым."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-10",
    "title": "Похвала",
    "text": "Коллега: «Маш, новая штука удобная. Спасибо!»\n\nМаша перечитывает сообщение, чтобы убедиться, что это адресовано ей.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Принять похвалу",
        "effects": {
          "motivation": 4
        },
        "result": "Маша принимает похвалу и ещё раз улыбается сообщению."
      },
      {
        "id": "option-2",
        "text": "Сказать: “Да там ничего сложного”",
        "effects": {
          "sanity": 2
        },
        "result": "коллега присылает смайлик с подозрением."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-11",
    "title": "Три одинаковые кружки",
    "text": "В системе есть «Кружка белая», «Белая кружка» и «Кружка, цвет белый». Склад утверждает, что это одна кружка. Или три. Зависит от дня.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Уточнить у склада",
        "effects": {
          "motivation": 2
        },
        "result": "товары удаётся правильно объединить."
      },
      {
        "id": "option-2",
        "text": "Оставить до лучших времён",
        "effects": {},
        "result": "кружки продолжают жить тремя жизнями."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-12",
    "title": "Очень большой заказ",
    "text": "Покупатель заказал одну подушку, а система показывает тысячу. Склад уже освобождает помещение.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Проверить данные заказа",
        "effects": {
          "motivation": 3
        },
        "result": "обнаруживается лишний ноль."
      },
      {
        "id": "option-2",
        "text": "Написать покупателю",
        "effects": {
          "sanity": 2
        },
        "result": "«Одну, пожалуйста. Мне пока хватит»."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-13",
    "title": "Товар есть, но его нет",
    "text": "Система показывает, что лампа на складе есть. Склад говорит, что её нет. Выясняется: лампа есть, но она чужая.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Уточнить, как учитывать такие товары",
        "effects": {
          "energy": -2,
          "motivation": 3
        },
        "result": "Маша уточняет правила: чужой товар больше не притворяется своим."
      },
      {
        "id": "option-2",
        "text": "Подписать лампу “чужая”",
        "effects": {
          "sanity": 2
        },
        "result": "склад благодарит за временное решение."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-14",
    "title": "Посылка путешествует",
    "text": "У заказа статус «Доставлен», хотя он ещё на складе.\n\nСотрудник: «Ну он же доставлен. На склад».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Уточнить значения статусов",
        "effects": {
          "motivation": 3
        },
        "result": "Маша записывает новое правило."
      },
      {
        "id": "option-2",
        "text": "Добавить пояснение к статусу",
        "effects": {
          "energy": -2
        },
        "result": "становится понятнее, но ненадолго."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-15",
    "title": "Загадочный товар",
    "text": "В каталоге найдена позиция «Штука хорошая, 2 шт.».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Узнать, что это",
        "effects": {
          "motivation": 2
        },
        "result": "оказываются дверные ручки."
      },
      {
        "id": "option-2",
        "text": "Оставить название",
        "effects": {
          "sanity": 2
        },
        "result": "через час приходит заказ на «штуку хорошую»."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-16",
    "title": "Склад просит чудо",
    "text": "Сотрудник: «Можно сделать, чтобы система сама знала, где лежит товар?»",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Спросить, как отмечают перемещения",
        "effects": {
          "motivation": 3
        },
        "result": "находится реальный способ помочь."
      },
      {
        "id": "option-2",
        "text": "Предложить спросить у товара",
        "effects": {
          "sanity": 3
        },
        "result": "склад присылает фото молчаливой коробки."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-17",
    "title": "Заказ для кота",
    "text": "Комментарий покупателя: «Пожалуйста, положите коробку побольше. Товар коту не нужен, ему нужна коробка».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Передать пожелание складу",
        "effects": {
          "sanity": 4
        },
        "result": "склад присылает фото кота в коробке."
      },
      {
        "id": "option-2",
        "text": "Сохранить комментарий в заказе",
        "effects": {
          "motivation": 2
        },
        "result": "Маша улыбается весь день."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-18",
    "title": "Пропавшая посылка",
    "text": "Заказ долго ищут и обнаруживают посреди склада с большой надписью «НЕ ПОТЕРЯТЬ».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Помочь разобраться со статусом",
        "effects": {
          "motivation": 2
        },
        "result": "Маша помогает исправить статус, и посылка наконец готова отправиться дальше."
      },
      {
        "id": "option-2",
        "text": "Попросить фотографию на память",
        "effects": {
          "sanity": 3
        },
        "result": "На память остаётся снимок посылки, которую очень старались не потерять."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-19",
    "title": "Инструкция от склада",
    "text": "В инструкции по сборке заказа 24 шага, из которых семь — «найти предыдущую коробку».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Обсудить, что можно упростить",
        "effects": {
          "energy": -2,
          "motivation": 3
        },
        "result": "Маша обсуждает инструкцию со складом: несколько поисков коробок удаётся объединить."
      },
      {
        "id": "option-2",
        "text": "Сначала собрать пример самой",
        "effects": {
          "energy": -3
        },
        "result": "Маша начинает лучше понимать процесс."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-20",
    "title": "Честный статус",
    "text": "Коллега предлагает статус: «Мы пока не знаем, где он, но очень стараемся».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Предложить понятный официальный вариант",
        "effects": {
          "motivation": 2
        },
        "result": "Маша предлагает статус «Уточняем местонахождение». Старательность остаётся за кадром."
      },
      {
        "id": "option-2",
        "text": "Пожалеть, что так нельзя оставить",
        "effects": {
          "sanity": 2
        },
        "result": "Маша сохраняет честный вариант для настроения: он слишком хорош, чтобы его забыть."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-21",
    "title": "Работало же",
    "text": "Маша проверяет функцию. Вчера работало, сегодня нет.\n\nКоллега: «А вчера ты проверяла?»",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Спокойно найти причину",
        "effects": {
          "energy": -2,
          "motivation": 3
        },
        "result": "не хватало настройки."
      },
      {
        "id": "option-2",
        "text": "Проверить ещё раз на удачу",
        "effects": {
          "sanity": -2
        },
        "result": "неожиданно заработало. Теперь стало тревожнее."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-22",
    "title": "Ошибка с характером",
    "text": "На экране сообщение: «Что-то пошло не так». Что именно, оно не объясняет.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Проверить подробности ошибки",
        "effects": {
          "motivation": 3
        },
        "result": "причина найдена."
      },
      {
        "id": "option-2",
        "text": "Посидеть рядом с сообщением",
        "effects": {
          "sanity": 2
        },
        "result": "возможно, ему тоже тяжело."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-23",
    "title": "Невидимая кнопка",
    "text": "Сотрудник сообщает, что кнопка не работает. Оказывается, она находится за пределами экрана.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Исправить расположение",
        "effects": {
          "energy": -2,
          "motivation": 3
        },
        "result": "Маша возвращает кнопку на экран. Теперь её можно не только искать, но и нажать."
      },
      {
        "id": "option-2",
        "text": "Проверить другие размеры экрана",
        "effects": {
          "energy": -3,
          "motivation": 3
        },
        "result": "находится ещё одна спрятанная кнопка."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-24",
    "title": "Загадочное исправление",
    "text": "После обновления ошибка исчезла. Маша точно её не исправляла.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Разобраться, почему",
        "effects": {
          "motivation": 2
        },
        "result": "находится изменение коллеги."
      },
      {
        "id": "option-2",
        "text": "Тихо порадоваться",
        "effects": {
          "sanity": -2
        },
        "result": "ошибка возвращается через час, словно обиделась."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-25",
    "title": "Повторить невозможно",
    "text": "Коллега присылает скриншот ошибки. При повторной проверке у всех всё работает.\n\nКоллега: «Она точно была. Я не настолько творческий человек».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Сохранить информацию и понаблюдать",
        "effects": {
          "motivation": 2
        },
        "result": "Маша сохраняет скриншот и подробности: если ошибка вернётся, у неё будет зацепка."
      },
      {
        "id": "option-2",
        "text": "Попросить больше подробностей",
        "effects": {
          "sanity": 3
        },
        "result": "ошибка была в другой программе."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-26",
    "title": "Не та среда",
    "text": "Маша долго проверяет исправление, но ничего не меняется. Оказывается, она открыла старую версию.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Переключиться и проверить заново",
        "effects": {
          "energy": -2
        },
        "result": "В актуальной версии исправление находится на месте. Маша устала, но проверка закончена."
      },
      {
        "id": "option-2",
        "text": "Сказать старой версии, что она молодец",
        "effects": {
          "sanity": 2
        },
        "result": "проблема не решается, зато напряжение спадает."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-27",
    "title": "Идеальное название",
    "text": "Маша придумывает название кнопки: «Оформить», «Продолжить», «Готово» или «Ну давай».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Спросить будущих пользователей",
        "effects": {
          "motivation": 2
        },
        "result": "они выбирают «Оформить заказ»."
      },
      {
        "id": "option-2",
        "text": "Оставить временное название",
        "effects": {
          "sanity": 3
        },
        "result": "«Ну давай» случайно попадает на демонстрацию."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-28",
    "title": "Ошибка на демонстрации",
    "text": "Во время показа функция выдаёт ошибку. Все замолкают. Маша замечает, что не выбрала заказ.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Выбрать заказ и продолжить",
        "effects": {
          "motivation": 3
        },
        "result": "всё работает."
      },
      {
        "id": "option-2",
        "text": "Пошутить, что система волнуется",
        "effects": {
          "sanity": 3
        },
        "result": "напряжение спадает."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-29",
    "title": "Слишком много уведомлений",
    "text": "После обновления сотруднику приходит десять одинаковых уведомлений.\n\n«Спасибо, я понял с восьмого».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Исправить отправку",
        "effects": {
          "energy": -2,
          "motivation": 3
        },
        "result": "После исправления сотрудник получает одно уведомление. Остальные девять уходят на заслуженный отдых."
      },
      {
        "id": "option-2",
        "text": "Сначала извиниться",
        "effects": {
          "sanity": 2
        },
        "result": "сотрудник отвечает десятью смайликами."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-30",
    "title": "Кнопка-победитель",
    "text": "Маша исправляет кнопку, на которую жаловались несколько дней.\n\nКоллега торжественно пишет: «Она нажалась».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Отпраздновать маленькую победу",
        "effects": {
          "motivation": 3
        },
        "result": "Маша радуется: даже у маленькой кнопки может быть большой день."
      },
      {
        "id": "option-2",
        "text": "Спросить, с первого ли раза",
        "effects": {
          "sanity": 3
        },
        "result": "«Да. Мы тоже удивлены»."
      }
    ],
    "requiresAssistant": false
  },
  {
    "id": "work-31",
    "title": "Уверенный ответ",
    "text": "Маша спрашивает ИИ, почему заказ не появляется в списке.\n\nИИ: «Причина найдена: заказ решил побыть один».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Проверить данные заказа",
        "effects": {
          "motivation": 3
        },
        "result": "находится настоящий фильтр."
      },
      {
        "id": "option-2",
        "text": "Пожелать заказу хорошего отдыха",
        "effects": {
          "sanity": 2
        },
        "result": "помощник благодарит за понимание."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-32",
    "title": "Слишком подробный план",
    "text": "ИИ присылает план из 37 шагов, включая «сделать вдох» и «открыть компьютер».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Попросить сократить",
        "effects": {
          "motivation": 2
        },
        "result": "остаются полезные пункты."
      },
      {
        "id": "option-2",
        "text": "Следовать плану",
        "effects": {
          "energy": -3,
          "sanity": 2
        },
        "result": "на восьмом шаге Маша уже устала."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-33",
    "title": "Почти правильное письмо",
    "text": "ИИ заканчивает черновик письма словами: «С уважением, ваш любимый разработчик».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Исправить подпись",
        "effects": {
          "motivation": 2
        },
        "result": "письмо готово."
      },
      {
        "id": "option-2",
        "text": "Оставить шутку в черновике",
        "effects": {
          "sanity": 3
        },
        "result": "Маша сохраняет фразу для настроения."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-34",
    "title": "Воображаемая функция",
    "text": "ИИ уверенно предлагает использовать функцию, которой в проекте нет.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Проверить предложение",
        "effects": {
          "motivation": 3
        },
        "result": "Маша замечает ошибку и находит рабочий вариант."
      },
      {
        "id": "option-2",
        "text": "Спросить, где найти функцию",
        "effects": {
          "sanity": 2
        },
        "result": "ИИ извиняется и предлагает поискать вместе."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-35",
    "title": "Помощник устал?",
    "text": "ИИ отвечает: «Не знаю. Сложно».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Уточнить вопрос",
        "effects": {
          "motivation": 2
        },
        "result": "со второй попытки ответ полезнее."
      },
      {
        "id": "option-2",
        "text": "Предложить ему отдохнуть",
        "effects": {
          "sanity": 3
        },
        "result": "ИИ спрашивает, можно ли ему виртуальный чай."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-36",
    "title": "Проверка таблицы",
    "text": "ИИ сообщает, что отличий между списками товаров нет. Маша замечает: в одном списке отсутствует целый склад.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Показать ИИ пропущенные данные",
        "effects": {
          "motivation": 3
        },
        "result": "помощник пересчитывает результат."
      },
      {
        "id": "option-2",
        "text": "Перепроверить самостоятельно",
        "effects": {
          "energy": -2,
          "motivation": 2
        },
        "result": "ошибка исправлена, но Маша устала."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-37",
    "title": "Чрезмерная забота",
    "text": "ИИ: «Предлагаю сделать перерыв. Я уже составил план отдыха на 14 пунктов».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Выбрать один пункт и отдохнуть",
        "effects": {
          "sanity": 3
        },
        "result": "Маша выбирает один спокойный пункт и оставляет остальные тринадцать в покое."
      },
      {
        "id": "option-2",
        "text": "Попросить короткую версию",
        "effects": {
          "motivation": 2
        },
        "result": "«Сядь. Подыши»."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-38",
    "title": "Название функции",
    "text": "ИИ предлагает назвать функцию SuperMegaOrderMagic.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Попросить понятное название",
        "effects": {
          "motivation": 2
        },
        "result": "помощник предлагает аккуратный вариант."
      },
      {
        "id": "option-2",
        "text": "Посмеяться и придумать своё",
        "effects": {
          "sanity": 3
        },
        "result": "Маша смеётся и выбирает короткое название, которое можно прочитать без передышки."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-39",
    "title": "Полезная находка",
    "text": "ИИ замечает, что в задаче не сказано, что делать с отменённым заказом. Маша уточняет это у коллеги заранее.",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Поблагодарить помощника",
        "effects": {
          "motivation": 3
        },
        "result": "Помощник принимает благодарность и обещает внимательнее читать условия."
      },
      {
        "id": "option-2",
        "text": "Похвалить себя за проверку",
        "effects": {
          "sanity": 3
        },
        "result": "Маша хвалит себя за проверку: вовремя заданный вопрос тоже работа."
      }
    ],
    "requiresAssistant": true
  },
  {
    "id": "work-40",
    "title": "Идеальный отчёт",
    "text": "ИИ пишет: «Маша блестяще справилась со всеми трудностями, победила хаос и, вероятно, заслуживает премию».",
    "dialogue": [
      {
        "speaker": "Маша",
        "text": "Как поступить?"
      }
    ],
    "trigger": {
      "type": "after_action",
      "action": "work"
    },
    "conditions": [],
    "repeat": "repeatable",
    "choices": [
      {
        "id": "option-1",
        "text": "Попросить более точный отчёт",
        "effects": {
          "motivation": 2
        },
        "result": "получается полезное резюме."
      },
      {
        "id": "option-2",
        "text": "Сохранить черновик для себя",
        "effects": {
          "sanity": 4
        },
        "result": "приятно иногда такое перечитывать."
      }
    ],
    "requiresAssistant": true
  }
] satisfies (GameEvent & { requiresAssistant: boolean })[]
