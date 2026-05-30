import type { Threat } from '../../engine/state';

// Редкие угрозы — реже, но больнее.
export const RARE_THREATS: readonly Threat[] = [
  {
    id: 'rare-backup-loss',
    title: 'Потеря резервных копий',
    tier: 'rare',
    intro:
      'Понадобился бэкап. Бэкапы делались исправно — прямо на тот же диск, который и умер. Шрёдингеровская резервная копия: вроде есть, а вроде нет.',
    defendedBy: ['backup'],
    baseImpact: { clientTrust: -26, team: -10 },
    options: [
      {
        text: 'Собрать данные из реплик и логов, восстановить вручную',
        kind: 'process',
        immediate: { budget: -6, team: -9 },
        resolvesThreat: true,
        feedback: 'Восстановили почти всё по кусочкам. Долго, больно, но обошлось.',
        recommended: true,
      },
      {
        text: 'Настроить геораспределённые бэкапы и регулярные проверки восстановления',
        kind: 'invest',
        immediate: { budget: -12, team: -5 },
        defenseUpgrade: 'backup',
        resolvesThreat: true,
        feedback: 'Теперь бэкапы лежат отдельно и проверяются восстановлением. А не «по вере».',
      },
      {
        text: 'Признать данные утерянными и жить дальше',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'Регулятор и клиенты к идее «жить дальше без их данных» отнеслись прохладно.',
      },
    ],
  },
  {
    id: 'rare-db-failure',
    title: 'Сбой базы данных',
    tier: 'rare',
    intro:
      'Primary-база ушла в себя. Реплика готова стать главной, но кто-то полгода назад отключил автоматический failover «чтобы не мешал».',
    defendedBy: ['backup', 'monitoring'],
    baseImpact: { clientTrust: -28, team: -8 },
    options: [
      {
        text: 'Выполнить failover на реплику по процедуре',
        kind: 'process',
        immediate: { budget: -6, team: -8 },
        resolvesThreat: true,
        feedback: 'Перешли на реплику за 15 минут. Те самые 15 минут, ради которых её и держали.',
        recommended: true,
      },
      {
        text: 'Настроить автоматический failover и алерты на состояние БД',
        kind: 'invest',
        immediate: { budget: -12, team: -5 },
        defenseUpgrade: 'monitoring',
        resolvesThreat: true,
        feedback: 'Теперь failover автоматический. В следующий раз вы узнаете о нём из отчёта, а не от клиентов.',
      },
      {
        text: 'Перезагрузить primary и молиться',
        kind: 'hack',
        immediate: { team: -4 },
        delayed: [
          {
            afterTurns: 2,
            text: 'Primary поднялась с битым индексом. Часть транзакций «потерялась», часть задвоилась.',
            impact: { clientTrust: -18, techDebt: 14 },
          },
        ],
        resolvesThreat: true,
        feedback: 'База поднялась! И сразу выдала пару сюрпризов про целостность данных.',
      },
    ],
  },
  {
    id: 'rare-network-failure',
    title: 'Сетевой сбой',
    tier: 'rare',
    intro:
      'Между дата-центрами пропала связность. Сервисы видят друг друга через раз и устраивают split-brain. Сеть — это всегда DNS. Или нет. Но обычно да.',
    defendedBy: ['monitoring', 'incidentResponse'],
    baseImpact: { clientTrust: -24, team: -9 },
    options: [
      {
        text: 'Перевести трафик в здоровый регион, поднять инцидент',
        kind: 'process',
        immediate: { budget: -6, team: -8 },
        resolvesThreat: true,
        feedback: 'Трафик ушёл в живой регион, split-brain погасили. Сеть потом извинилась.',
        recommended: true,
      },
      {
        text: 'Собрать команду реагирования и отработать сетевые сценарии',
        kind: 'invest',
        immediate: { budget: -12, team: -5 },
        defenseUpgrade: 'incidentResponse',
        resolvesThreat: true,
        feedback: 'Теперь на сетевые сбои есть отдельный сценарий и дежурный сетевик.',
      },
      {
        text: 'Перезапустить всё подряд — вдруг поможет',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'Помогло ровно настолько, насколько помогает перезапуск без понимания причины. То есть никак.',
      },
    ],
  },
  {
    id: 'rare-domain-block',
    title: 'Блокировка домена',
    tier: 'rare',
    intro:
      'Основной домен внезапно перестал открываться у части пользователей. Провайдеры в одном регионе решили, что он им не нравится.',
    defendedBy: ['changeManagement', 'incidentResponse'],
    baseImpact: { clientTrust: -25, budget: -6 },
    options: [
      {
        text: 'Поднять резервные домены и зеркала, оповестить клиентов',
        kind: 'process',
        immediate: { budget: -6, team: -7 },
        resolvesThreat: true,
        feedback: 'Резервные домены подхватили трафик. У вас же были резервные домены, да?',
        recommended: true,
      },
      {
        text: 'Выстроить процесс ротации доменов и зеркал заранее',
        kind: 'invest',
        immediate: { budget: -12, team: -5 },
        defenseUpgrade: 'changeManagement',
        resolvesThreat: true,
        feedback: 'Теперь домены меняются по накатанной процедуре, а не в режиме пожара.',
      },
      {
        text: 'Раскидать новый домен только в одном чате поддержки',
        kind: 'hack',
        immediate: { budget: -2 },
        delayed: [
          {
            afterTurns: 2,
            text: 'Новый домен разлетелся по фишинговым копиям быстрее, чем по вашим клиентам.',
            impact: { clientTrust: -16 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Часть клиентов нашла новый домен. Часть — нашла фишинг под новый домен.',
      },
    ],
  },
  {
    id: 'rare-load-spike',
    title: 'Массовый рост нагрузки',
    tier: 'rare',
    intro:
      'Маркетинг запустил акцию и «забыл» предупредить. Трафик вырос в 8 раз за десять минут. Автоскейл нервно курит в сторонке.',
    defendedBy: ['monitoring', 'incidentResponse'],
    baseImpact: { clientTrust: -22, team: -8 },
    options: [
      {
        text: 'Включить лимиты, кэш и горизонтальное масштабирование',
        kind: 'process',
        immediate: { budget: -6, team: -7 },
        resolvesThreat: true,
        feedback: 'Кэш и автоскейл удержали нагрузку. Акция прошла, прод выжил.',
        recommended: true,
      },
      {
        text: 'Наладить нагрузочное тестирование и алерты на трафик',
        kind: 'invest',
        immediate: { budget: -12, team: -5 },
        defenseUpgrade: 'monitoring',
        resolvesThreat: true,
        feedback: 'Теперь пики видно заранее, а лимиты выставлены до акции, а не во время.',
      },
      {
        text: 'Ничего не делать — выдержим на характере',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'Характер кончился раньше оперативной памяти. А память — раньше терпения клиентов.',
      },
    ],
  },
];
