import type { Threat } from '../../engine/state';

// Обычные угрозы. baseImpact — урон при полном провале, масштабируется защитами.
// Экономика: действие по процессу стоит в основном время команды, развитие
// процесса (invest) — бюджет. Костыли почти бесплатны сейчас, но бьют отложенно.
export const COMMON_THREATS: readonly Threat[] = [
  {
    id: 'common-config-error',
    title: 'Ошибка конфигурации',
    tier: 'common',
    intro:
      'На проде кто-то поправил фиче-флаг «по-быстрому» прямо в проде. Теперь часть платежей уходит в тестовый шлюз. Код идеален. Конфиг — нет.',
    defendedBy: ['changeManagement', 'monitoring'],
    // Конфиг опаснее кода — урон выше обычного.
    baseImpact: { clientTrust: -24, peerTrust: -6 },
    options: [
      {
        text: 'Откатить конфиг по процедуре change management, зафиксировать инцидент',
        kind: 'process',
        immediate: { budget: -3, team: -5 },
        resolvesThreat: true,
        feedback: 'Откат по процедуре занял 20 минут. Клиенты почти не заметили.',
        recommended: true,
      },
      {
        text: 'Внедрить контроль изменений конфигурации (review + аудит)',
        kind: 'invest',
        immediate: { budget: -10, team: -3 },
        defenseUpgrade: 'changeManagement',
        resolvesThreat: true,
        feedback: 'Теперь правки конфига проходят ревью. Дороже, но «по-быстрому в проде» больше не будет.',
      },
      {
        text: 'Поправить ещё раз руками прямо в проде',
        kind: 'hack',
        immediate: { budget: -1 },
        delayed: [
          {
            afterTurns: 2,
            text: 'Ручная правка конфига разошлась не на все ноды. Часть платежей опять мимо кассы.',
            impact: { clientTrust: -16, techDebt: 12 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Вроде заработало. Вроде. На той ноде, где вы смотрели.',
      },
      {
        text: 'Подождать — наверняка само устаканится',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'Само не устаканилось. Зато устаканилась очередь в поддержку.',
      },
    ],
  },
  {
    id: 'common-bad-release',
    title: 'Кривой релиз',
    tier: 'common',
    intro:
      'Релиз уехал на прод, и теперь кнопка «Пополнить» иногда списывает дважды. «Иногда» — любимое слово в баг-репортах.',
    defendedBy: ['qa', 'postReleaseAcceptance'],
    baseImpact: { clientTrust: -18, peerTrust: -5 },
    options: [
      {
        text: 'Откатить релиз и прогнать через QA',
        kind: 'process',
        immediate: { budget: -3, team: -6 },
        resolvesThreat: true,
        feedback: 'Откат прошёл штатно, баг воспроизвели и закрыли. Скучно и правильно.',
        recommended: true,
      },
      {
        text: 'Завести пост-релизную приёмку как обязательный этап',
        kind: 'invest',
        immediate: { budget: -10, team: -4 },
        defenseUpgrade: 'postReleaseAcceptance',
        resolvesThreat: true,
        feedback: 'Теперь после релиза идёт приёмка. Такие сюрпризы будут ловиться сразу.',
      },
      {
        text: 'Накатить хотфикс поверх, не откатывая',
        kind: 'hack',
        immediate: { budget: -2 },
        delayed: [
          {
            afterTurns: 3,
            text: 'Хотфикс поверх кривого релиза породил новый кривой релиз. Классика жанра.',
            impact: { clientTrust: -14, techDebt: 14 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Двойные списания прекратились. Появились тройные, но это уже завтрашняя проблема.',
      },
    ],
  },
  {
    id: 'common-bad-task',
    title: 'Ошибка в постановке задачи',
    tier: 'common',
    intro:
      'Команда две недели делала фичу. Оказалось, продакт имел в виду совсем другое. ТЗ умещалось в одно сообщение и одно «ну ты понял».',
    defendedBy: ['riskAssessment', 'changeManagement'],
    baseImpact: { team: -16, peerTrust: -10 },
    options: [
      {
        text: 'Сесть с продактом, переписать требования, оценить риски',
        kind: 'process',
        immediate: { budget: -2, team: -5 },
        resolvesThreat: true,
        feedback: 'Потеряли два дня на переговоры, сэкономили две недели на переделке.',
        recommended: true,
      },
      {
        text: 'Ввести оценку рисков и критерии приёмки для задач',
        kind: 'invest',
        immediate: { budget: -9, team: -3 },
        defenseUpgrade: 'riskAssessment',
        resolvesThreat: true,
        feedback: 'Теперь у задач есть критерии готовности. «Ну ты понял» больше не спецификация.',
      },
      {
        text: 'Доделать как есть — авось продакт привыкнет',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'Продакт не привык. Привыкла команда — к переделкам.',
      },
    ],
  },
  {
    id: 'common-queue-overflow',
    title: 'Переполнение очередей сообщений',
    tier: 'common',
    intro:
      'Очередь в брокере распухла до миллионов сообщений. Консьюмеры не справляются, лаг растёт, бонусы начисляются с задержкой в час.',
    defendedBy: ['monitoring', 'incidentResponse'],
    baseImpact: { clientTrust: -16, team: -8 },
    options: [
      {
        text: 'Поднять консьюмеров и разобрать затор по runbook',
        kind: 'process',
        immediate: { budget: -3, team: -6 },
        resolvesThreat: true,
        feedback: 'Масштабировали обработчики, лаг рассосался. Runbook не зря писали.',
        recommended: true,
      },
      {
        text: 'Настроить алерты на длину очереди и автоскейл',
        kind: 'invest',
        immediate: { budget: -10, team: -4 },
        defenseUpgrade: 'monitoring',
        resolvesThreat: true,
        feedback: 'Теперь о заторе вы узнаете раньше клиентов. Свежо и непривычно.',
      },
      {
        text: 'Просто почистить очередь (purge) и забыть',
        kind: 'hack',
        immediate: { budget: -1 },
        delayed: [
          {
            afterTurns: 2,
            text: 'Среди удалённых purge-ом сообщений были незачисленные бонусы. Клиенты заметили.',
            impact: { clientTrust: -18, techDebt: 8 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Очередь пуста, графики зелёные. Что могло пойти не так?',
      },
    ],
  },
  {
    id: 'common-no-compat-check',
    title: 'Отсутствие проверки совместимости',
    tier: 'common',
    intro:
      'Бэкенд выкатил новую версию API и удалил «ненужное» поле. Мобильное приложение считало его очень даже нужным.',
    defendedBy: ['qa', 'codeReview'],
    baseImpact: { clientTrust: -17, peerTrust: -7 },
    options: [
      {
        text: 'Вернуть поле, согласовать контракт API, прогнать интеграционные тесты',
        kind: 'process',
        immediate: { budget: -3, team: -5 },
        resolvesThreat: true,
        feedback: 'Контракт восстановили, добавили тест на совместимость. Приложение ожило.',
        recommended: true,
      },
      {
        text: 'Добавить контрактные тесты в QA-пайплайн',
        kind: 'invest',
        immediate: { budget: -10, team: -4 },
        defenseUpgrade: 'qa',
        resolvesThreat: true,
        feedback: 'Теперь несовместимые изменения API ловятся до релиза.',
      },
      {
        text: 'Сказать мобильщикам срочно выпустить новую версию',
        kind: 'hack',
        immediate: { budget: -2, peerTrust: -6 },
        delayed: [
          {
            afterTurns: 2,
            text: 'Половина пользователей не обновилась и осталась со сломанным приложением.',
            impact: { clientTrust: -15 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Мобильщики выпустили. И высказали всё, что думают о вашем контракте API.',
      },
      {
        text: 'Подождать, пока пользователи сами обновятся',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'Пользователи обновились — на приложение конкурента.',
      },
    ],
  },
  {
    id: 'common-perf-degradation',
    title: 'Деградация производительности',
    tier: 'common',
    intro:
      'Страницы грузятся всё медленнее. Где-то закрался запрос без индекса, который раньше «и так работал». Данных стало больше.',
    defendedBy: ['monitoring', 'qa'],
    baseImpact: { clientTrust: -15, team: -6 },
    options: [
      {
        text: 'Профилировать, найти узкое место, добавить индекс',
        kind: 'process',
        immediate: { budget: -2, team: -5 },
        resolvesThreat: true,
        feedback: 'Один индекс — и время ответа упало в десять раз. Магия SQL.',
        recommended: true,
      },
      {
        text: 'Подключить мониторинг производительности (APM)',
        kind: 'invest',
        immediate: { budget: -10, team: -3 },
        defenseUpgrade: 'monitoring',
        resolvesThreat: true,
        feedback: 'Теперь медленные запросы видно на графике, а не в жалобах.',
      },
      {
        text: 'Накинуть железа — пусть тормозит, но быстрее',
        kind: 'hack',
        immediate: { budget: -6 },
        delayed: [
          {
            afterTurns: 3,
            text: 'Железо помогло на неделю. Потом данных стало ещё больше, и проблема вернулась с процентами.',
            impact: { clientTrust: -12, budget: -6 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Стало быстрее. Счёт за инфраструктуру — тоже.',
      },
    ],
  },
  {
    id: 'common-human-factor',
    title: 'Человеческий фактор',
    tier: 'common',
    intro:
      'Инженер выполнил DELETE без WHERE на стейджинге. По крайней мере, он думал, что это стейджинг. SSH-сессий было открыто две.',
    defendedBy: ['codeReview', 'changeManagement'],
    baseImpact: { clientTrust: -14, team: -10 },
    options: [
      {
        text: 'Восстановить данные, провести blameless post-mortem',
        kind: 'process',
        immediate: { budget: -3, team: -4 },
        resolvesThreat: true,
        feedback: 'Данные восстановили, виноватых не искали — искали причину. Команда выдохнула.',
        recommended: true,
      },
      {
        text: 'Внедрить подтверждение опасных операций и разделение окружений',
        kind: 'invest',
        immediate: { budget: -9, team: -3 },
        defenseUpgrade: 'changeManagement',
        resolvesThreat: true,
        feedback: 'Теперь прод и стейдж не перепутать, а DELETE без WHERE требует подтверждения.',
      },
      {
        text: 'Публично отчитать инженера на всю компанию',
        kind: 'hack',
        immediate: { team: -6 },
        delayed: [
          {
            afterTurns: 2,
            text: 'После публичной порки люди перестали сообщать об ошибках. Следующий инцидент нашли клиенты.',
            impact: { clientTrust: -12, peerTrust: -10 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Инженер всё понял. И начал тихо обновлять резюме.',
      },
    ],
  },
  {
    id: 'common-provider-outage',
    title: 'Отказ внешнего провайдера',
    tier: 'common',
    intro:
      'Платёжный провайдер прилёг. На их статус-странице, конечно, всё зелёное и «operational». У вас — нет.',
    defendedBy: ['monitoring', 'incidentResponse'],
    baseImpact: { clientTrust: -18, budget: -4 },
    options: [
      {
        text: 'Переключиться на резервного провайдера по плану',
        kind: 'process',
        immediate: { budget: -3, team: -4 },
        resolvesThreat: true,
        feedback: 'Трафик платежей ушёл на резерв. Клиенты даже не заметили подмены.',
        recommended: true,
      },
      {
        text: 'Создать дежурную команду реагирования и runbook на провайдеров',
        kind: 'invest',
        immediate: { budget: -10, team: -4 },
        defenseUpgrade: 'incidentResponse',
        resolvesThreat: true,
        feedback: 'Теперь на инциденты есть дежурный и сценарий. Паника — по расписанию.',
      },
      {
        text: 'Ждать, пока провайдер починится — это же их проблема',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'Это была их проблема ровно до того, как ваши клиенты не смогли пополнить счёт.',
      },
    ],
  },
];
