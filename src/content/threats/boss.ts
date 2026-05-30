import type { Threat } from '../../engine/state';

// Боссы — крупные, многоресурсные угрозы. Сильно вознаграждают заранее
// выстроенные процессы.
export const BOSS_THREATS: readonly Threat[] = [
  {
    id: 'boss-internal-slacker',
    title: 'Внутренний Разгильдяй',
    tier: 'boss',
    intro:
      'Тот самый коллега закоммитил в main мимо ревью, отключил пару проверок CI «чтобы быстрее» и ушёл на обед. CI зелёный, потому что его выключили.',
    defendedBy: ['codeReview', 'changeManagement', 'riskAssessment'],
    baseImpact: { clientTrust: -28, peerTrust: -12, techDebt: 10 },
    options: [
      {
        text: 'Откатить, вернуть проверки CI, ввести защиту main-ветки',
        kind: 'process',
        immediate: { budget: -5, team: -8 },
        resolvesThreat: true,
        feedback: 'Main защищён, проверки вернули, обед коллеги слегка затянулся объяснительной.',
        recommended: true,
      },
      {
        text: 'Сделать обязательным ревью и branch protection на уровне процесса',
        kind: 'invest',
        immediate: { budget: -13, team: -6 },
        defenseUpgrade: 'codeReview',
        resolvesThreat: true,
        feedback: 'Теперь в main без ревью и зелёного CI не попасть. Даже Разгильдяю.',
      },
      {
        text: 'Оставить как есть — вроде же работает',
        kind: 'hack',
        immediate: {},
        delayed: [
          {
            afterTurns: 2,
            text: 'Закоммиченное мимо ревью прилегло на проде в самый неподходящий момент.',
            impact: { clientTrust: -20, peerTrust: -8, techDebt: 12 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Работает же. До первого пользователя, который нажмёт «не туда».',
      },
    ],
  },
  {
    id: 'boss-friday-release',
    title: 'Релиз в пятницу',
    tier: 'boss',
    intro:
      'Пятница, 17:45. «Маленькая, безопасная фича, точно ничего не сломает». Команда уже мысленно в выходных. Дежурный — тоже.',
    defendedBy: ['qa', 'postReleaseAcceptance', 'changeManagement'],
    baseImpact: { clientTrust: -30, team: -12 },
    options: [
      {
        text: 'Перенести релиз на понедельник, заморозить изменения',
        kind: 'process',
        immediate: { budget: -2, peerTrust: -4 },
        resolvesThreat: true,
        feedback: 'Продакт надулся, зато выходные прошли без созвонов в 3 ночи. Размен честный.',
        recommended: true,
      },
      {
        text: 'Ввести release-freeze по пятницам и чек-лист готовности',
        kind: 'invest',
        immediate: { budget: -12, team: -5 },
        defenseUpgrade: 'changeManagement',
        resolvesThreat: true,
        feedback: 'Теперь пятничные релизы — только с явным обоснованием и дежурной командой.',
      },
      {
        text: 'Катить! Что вообще может пойти не так в пятницу вечером?',
        kind: 'hack',
        immediate: { team: -6 },
        delayed: [
          {
            afterTurns: 2,
            text: 'Фича уронила биллинг в субботу ночью. Дежурный познакомился со всей семьёй по громкой связи.',
            impact: { clientTrust: -26, team: -10, techDebt: 10 },
          },
        ],
        resolvesThreat: true,
        feedback: 'Выкатили. Чат «инциденты» оживился аккурат к началу выходных.',
      },
    ],
  },
  {
    id: 'boss-high-season',
    title: 'Высокий сезон',
    tier: 'boss',
    intro:
      'Финал крупного турнира. Нагрузка бьёт рекорды, ставки летят лавиной, и именно сейчас всё должно работать идеально. Конечно же.',
    defendedBy: ['monitoring', 'incidentResponse', 'backup'],
    baseImpact: { clientTrust: -32, team: -10, budget: -6 },
    options: [
      {
        text: 'Заранее масштабироваться, посадить дежурную команду, включить мониторинг',
        kind: 'process',
        immediate: { budget: -7, team: -8 },
        resolvesThreat: true,
        feedback: 'Сезон прошли на повышенной готовности. Графики ровные, клиенты довольны, премия близко.',
        recommended: true,
      },
      {
        text: 'Построить дежурство и пред-сезонные учения как процесс',
        kind: 'invest',
        immediate: { budget: -13, team: -6 },
        defenseUpgrade: 'incidentResponse',
        resolvesThreat: true,
        feedback: 'Теперь к каждому сезону команда готовится по чек-листу, а не по интуиции.',
      },
      {
        text: 'Понадеяться, что инфраструктура выдержит как обычно',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: '«Как обычно» не рассчитано на пиковый сезон. Прод это доходчиво объяснил.',
      },
    ],
  },
  {
    id: 'boss-critical-vuln',
    title: 'Критическая уязвимость',
    tier: 'boss',
    intro:
      'В популярной библиотеке нашли RCE с CVSS 9.8. Она у вас, конечно же, в каждом сервисе. И в том легаси, про который все забыли.',
    defendedBy: ['riskAssessment', 'incidentResponse', 'codeReview'],
    baseImpact: { clientTrust: -34, peerTrust: -8, budget: -8 },
    options: [
      {
        text: 'Поднять инцидент, обновить зависимости, проверить следы компрометации',
        kind: 'process',
        immediate: { budget: -7, team: -9 },
        resolvesThreat: true,
        feedback: 'Закрыли уязвимость за часы, следов взлома не нашли. В этот раз успели первыми.',
        recommended: true,
      },
      {
        text: 'Внедрить процесс оценки рисков и сканирование зависимостей',
        kind: 'invest',
        immediate: { budget: -13, team: -6 },
        defenseUpgrade: 'riskAssessment',
        resolvesThreat: true,
        feedback: 'Теперь уязвимые зависимости подсвечиваются автоматически и приоритизируются по риску.',
      },
      {
        text: 'Запланировать обновление на следующий квартал',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'До следующего квартала уязвимость дожила. Данные клиентов — не все.',
      },
    ],
  },
  {
    id: 'boss-mass-block',
    title: 'Массовая блокировка',
    tier: 'boss',
    intro:
      'Регулятор в ключевом регионе разом заблокировал домены, IP и платёжные реквизиты. Доступ к продукту упал у целой страны.',
    defendedBy: ['changeManagement', 'incidentResponse', 'riskAssessment'],
    baseImpact: { clientTrust: -34, budget: -10, peerTrust: -6 },
    options: [
      {
        text: 'Активировать план непрерывности: зеркала, новые реквизиты, оповещение',
        kind: 'process',
        immediate: { budget: -7, team: -9 },
        resolvesThreat: true,
        feedback: 'План BCP сработал: трафик и платежи переехали, отток клиентов удержали.',
        recommended: true,
      },
      {
        text: 'Заранее проработать сценарии блокировок и оценку регуляторных рисков',
        kind: 'invest',
        immediate: { budget: -14, team: -6 },
        defenseUpgrade: 'riskAssessment',
        resolvesThreat: true,
        feedback: 'Теперь регуляторные риски оценены заранее, а пути обхода блокировок готовы и протестированы.',
      },
      {
        text: 'Ждать и надеяться, что разблокируют',
        kind: 'ignore',
        resolvesThreat: false,
        feedback: 'Не разблокировали. Зато разблокировали отток клиентов к конкурентам.',
      },
    ],
  },
];
