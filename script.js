const welcomeScreen = document.getElementById("welcomeScreen");
const startScreen = document.getElementById("startScreen");
const explanationScreen = document.getElementById("explanationScreen");

const welcomeVideo = document.getElementById("welcomeVideo");
const startVideo = document.getElementById("startVideo");
const characterVideo = document.getElementById("characterVideo");
const startButton = document.getElementById("startButton");
const explanationButton = document.getElementById("explanationButton");
const constructorButton = document.getElementById("constructorButton");
const workspace = document.getElementById("workspace");
const elementCounter = document.getElementById("elementCounter");
const finishConstructorButton = document.getElementById("finishConstructorButton");
const characterScreen = document.getElementById("characterScreen");
const characterPreview = document.getElementById("characterPreview");
const characteristicScreen = document.getElementById("characteristicScreen");
const readCharacteristicButton = document.getElementById("readCharacteristicButton");
const characteristicResults = document.getElementById("shapeCharacteristicResults");
const continueToSecondStageButton = document.getElementById("continueToSecondStageButton");
const selectionOutline = document.getElementById("selectionOutline");
const selectionOutlinePath = document.getElementById("selectionOutlinePath");
const shapeButtons = document.querySelectorAll(".shape-button");
const colorButtons = document.querySelectorAll(".color-button");
const sizeButtons = document.querySelectorAll(".size-button");
const rotationButtons = document.querySelectorAll(".rotation-button");
const nudgeButtons = document.querySelectorAll(".nudge-button");
const moveButton = document.getElementById("moveButton");
const deleteButton = document.getElementById("deleteButton");
// Ненав'язливий звуковий сигнал під час переходу на новий екран
let transitionAudioContext = null;

function playScreenTransitionSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!transitionAudioContext) {
      transitionAudioContext = new AudioContextClass();
    }

    if (transitionAudioContext.state === "suspended") {
      transitionAudioContext.resume();
    }

    const context = transitionAudioContext;
    const notes = [880, 1174.66, 1567.98];
    const startAt = context.currentTime + 0.02;

    notes.forEach((frequency, index) => {
      const noteStart = startAt + index * 0.13;
      const noteEnd = noteStart + 0.62;
      const volume = context.createGain();

      volume.gain.setValueAtTime(0.0001, noteStart);
      volume.gain.linearRampToValueAtTime(0.075, noteStart + 0.018);
      volume.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      volume.connect(context.destination);

      const fundamental = context.createOscillator();
      fundamental.type = "sine";
      fundamental.frequency.setValueAtTime(frequency, noteStart);
      fundamental.connect(volume);
      fundamental.start(noteStart);
      fundamental.stop(noteEnd + 0.02);

      // Тихий обертон надає ноті дзвінкого, скляного відтінку
      const overtone = context.createOscillator();
      const overtoneVolume = context.createGain();

      overtone.type = "sine";
      overtone.frequency.setValueAtTime(frequency * 2.01, noteStart);
      overtoneVolume.gain.setValueAtTime(0.0001, noteStart);
      overtoneVolume.gain.linearRampToValueAtTime(0.014, noteStart + 0.018);
      overtoneVolume.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      overtone.connect(overtoneVolume);
      overtoneVolume.connect(context.destination);
      overtone.start(noteStart);
      overtone.stop(noteEnd + 0.02);
    });
  } catch (error) {
    // Якщо браузер не підтримує Web Audio, інтерактив працює без звуку
    console.log("Звуковий сигнал недоступний у цьому браузері:", error);
  }
}
let undoHistory = [];
let selectedRating = 0;
// Дані поточного проходження тесту
let currentPassageId = null;
let passageStartedAt = null;

// Адреса Google Apps Script
const analyticsUrl = "https://script.google.com/macros/s/AKfycbyYBGkLA7IPaOoYXM0pklSGkflKIiWs5hyvNmCEV3lhJAJQBdWejWKfgQYVA-rBVzLR/exec";

// Передавання аналітичної події
function sendAnalyticsEvent(data) {

  const formData = new URLSearchParams();
  formData.append("payload", JSON.stringify(data));

  fetch(analyticsUrl, {
    method: "POST",
    mode: "no-cors",
    body: formData
  })
  .then(() => {
    console.log("Аналітичний запит передано:", data.event);
  })
  .catch(error => {
    console.error("Помилка передавання аналітики:", error);
  });
}

// Формування даних для завершення проходження
function finishPassage(emailStatus, emailRequestAt = null) {

  if (!currentPassageId) {
    console.error("Не знайдено ID поточного проходження.");
    return;
  }

  const results = calculateCombinedProfileResults();

  const profileNames = results.recommendedProfiles
    .map(profile => profileCharacteristics[profile]?.title)
    .filter(Boolean);
  const profileKeys = results.recommendedProfiles;

  sendAnalyticsEvent({
    event: "finish",
    passageId: currentPassageId,
    completedAt: new Date().toISOString(),
    lastStage: "Результати переглянуто",
    rating: selectedRating,
    mainProfiles: profileNames.slice(0, 1),
    additionalProfiles: profileNames.slice(1),
    mainProfileKeys: profileKeys.slice(0, 1),
    additionalProfileKeys: profileKeys.slice(1),
    emailRequestAt: emailRequestAt,
    emailStatus: emailStatus
  });
}

let isMoving = false;
let isGroupSelecting = false;
let selectedElements = [];
let selectionStart = null;
let selectionBox = document.getElementById("selectionBox");
const groupSelectButton = document.getElementById("groupSelectButton");
// Твердження для дослідження інтересів
const interestStatements = [
  // Біологічний напрям
  {
    id: 1,
    text: "Досліджувати живий світ і те, як працює людський організм.",
    profile: "biological"
  },
  {
    id: 2,
    text: "Досліджувати, як люди думають, відчувають і поводяться.",
    profile: "biological"
  },
  {
    id: 3,
    text: "Шукати пояснення природним явищам і досліджувати, як влаштоване життя.",
    profile: "biological"
  },

  // Історичний напрям
  {
    id: 4,
    text: "Розбиратися, чому країни співпрацюють або конфліктують.",
    profile: "historical"
  },
  {
    id: 5,
    text: "Досліджувати історичні події та їхній вплив на сучасний світ.",
    profile: "historical"
  },
  {
    id: 6,
    text: "З'ясовувати, як виникають суспільні зміни та що впливає на життя людей.",
    profile: "historical"
  },

  // Економічний напрям
  {
    id: 7,
    text: "З'ясовувати, як працюють гроші, ринки та бізнес.",
    profile: "economic"
  },
  {
    id: 8,
    text: "Аналізувати числа, закономірності й ухвалювати рішення.",
    profile: "economic"
  },
  {
    id: 9,
    text: "Придумувати власні проєкти, планувати ресурси та знаходити способи втілити ідеї.",
    profile: "economic"
  },

  // Інформаційний напрям
  {
    id: 10,
    text: "Створювати цифрові інструменти й розв'язувати задачі за допомогою технологій.",
    profile: "informatics"
  },
  {
    id: 11,
    text: "Програмувати, експериментувати з алгоритмами й технологіями.",
    profile: "informatics"
  },
  {
    id: 12,
    text: "Дізнаватися, як працює штучний інтелект і як його можна використовувати.",
    profile: "informatics"
  },

  // Українська філологія
  {
    id: 13,
    text: "Працювати зі словами, текстами й українською культурою.",
    profile: "ukrainianPhilology"
  },
  {
    id: 14,
    text: "Створювати тексти, досліджувати українську мову та літературу.",
    profile: "ukrainianPhilology"
  },
  {
    id: 15,
    text: "Досліджувати, як мова відображає історію, традиції та світогляд українців.",
    profile: "ukrainianPhilology"
  },

  // Іноземна філологія
  {
    id: 16,
    text: "Відкривати інші мови та культури, порівнювати їх.",
    profile: "foreignPhilology"
  },
  {
    id: 17,
    text: "Вивчати іноземні мови й використовувати їх у спілкуванні.",
    profile: "foreignPhilology"
  },
  {
    id: 18,
    text: "Дізнаватися, як живуть люди в інших країнах, і знаходити з ними спільну мову.",
    profile: "foreignPhilology"
  }
];

const profileCharacteristics = {
  biological: {
  title: "Біологічний / медичний профілі",
  activityType: "Людина — природа",
  activityDescription: "Схоже, тобі близькі дослідження живого світу та людського організму. Тебе може цікавити, як функціонує організм людини, як влаштовані живі системи та чому відбуваються різні природні явища. Можливо, тобі також цікаво розуміти, як люди думають, відчувають і поводяться, шукати пояснення особливостям людської поведінки та закономірностям життя. Якщо тобі подобається досліджувати, спостерігати й знаходити наукові пояснення навколишньому світу, зверни увагу на біологічний і медичний напрями!",
  profileInvitation: "Твої інтереси можуть бути пов'язані з біологією, медициною та психологією. Дізнайся більше про освітні можливості нашого ліцею!",
  profileCard: "Твої зацікавлення можуть перетинатися з біологією, медициною, фармацією, біотехнологіями та психологією. У нашому ліцеї можна ознайомитися з біологічним і медичним профілями як окремими освітніми напрямами.",
  professions: [
    "лікар", "психолог", "біолог", "біотехнолог", "фармацевт", "науковець"
  ]
},

  historical: {
  title: "Історичний профіль (міжнародні відносини)",
  activityType: "Людина — людина",
  activityDescription: "Тебе можуть цікавити історичні події, причини й наслідки суспільних змін, розвиток держав і взаємодія між країнами. Тобі може подобатися аналізувати минуле, знаходити зв'язки із сучасністю, досліджувати міжнародну співпрацю та конфлікти, розуміти політичні й суспільні процеси. Якщо тобі цікаво, як формувався сучасний світ і як країни взаємодіють між собою, зверни увагу на історичний напрям та міжнародні відносини!",
  profileInvitation: "Твої інтереси можуть бути пов'язані з історією, міжнародними відносинами та дипломатією. Дізнайся більше про освітні можливості нашого ліцею!",
  profileCard: "Цей напрям поєднує зацікавлення історією, суспільними процесами та міжнародною взаємодією. Він може стати основою для подальшого вивчення міжнародних відносин, дипломатії, політології та права.",
  professions: [
    "історик", "фахівець з міжнародних відносин", "дипломат",
    "політолог", "аналітик", "журналіст"
  ]
},

  economic: {
    title: "Економічний профіль",
    activityType: "Людина — знакова система",
    activityDescription: "Схоже, тобі близька робота з інформацією, числами та різноманітними закономірностями. Тебе може захоплювати аналіз даних, пошук логічних зв'язків, оцінювання можливостей і ухвалення рішень. Можливо, тобі також цікаво з'ясовувати, як працюють гроші, ринки та бізнес, планувати використання ресурсів і знаходити способи втілення власних ідей. Ти можеш отримувати задоволення від завдань, у яких потрібно поєднувати аналітичне мислення з практичним результатом. Якщо тобі цікаві бізнес, фінанси та реалізація проєктів, зверни увагу на економічний профіль!",
    profileInvitation: "Тобі може бути цікавим навчання в нашому ліцеї на економічному профілі!",
    profileCard: "На економічному профілі ти зможеш поглиблювати математичні знання, знайомитися з міжнародним бізнесом, підприємництвом, плануванням ресурсів та економічними процесами.",
    professions: [
      "економіст", "підприємець", "фінансовий аналітик", "маркетолог", "менеджер", "фахівець із міжнародного бізнесу"
    ]
  },

  informatics: {
    title: "Інформатичний профіль",
    activityType: "Людина — техніка",
    activityDescription: "Схоже, тебе захоплюють сучасні технології та можливості їх практичного використання. Тобі може подобатися програмувати, експериментувати з алгоритмами, створювати цифрові інструменти й розв'язувати завдання за допомогою технологій. Можливо, ти також цікавишся тим, як працює штучний інтелект, які можливості він відкриває та як його можна застосовувати в різних сферах життя. Тобі близький пошук логічних і нестандартних рішень, а складні технічні завдання можуть сприйматися як цікаві виклики. Якщо це про тебе, придивися до інформатичного профілю!",
    profileInvitation: "Тобі може бути цікавим навчання в нашому ліцеї на інформатичному профілі!",
    profileCard: "На інформатичному профілі ти зможеш поглиблювати знання з інформатики, знайомитися з основами Computer Science, програмуванням, алгоритмами та сучасними цифровими технологіями.",
    professions: [
      "програміст", "розробник програмного забезпечення", "тестувальник", "аналітик даних", "фахівець зі штучного інтелекту", "кіберфахівець"
    ]
  },

  ukrainianPhilology: {
    title: "Профіль української філології",
    activityType: "Людина — художній образ",
    activityDescription: "Схоже, тобі близькі слова, тексти та українська культура. Тебе можуть захоплювати українська мова й література, дослідження мовних явищ, читання та створення власних текстів. Можливо, тобі цікаво з'ясовувати, як мова відображає історію, традиції та світогляд українців, як через слова й літературні образи передаються думки та почуття. Тобі може подобатися працювати з текстами, знаходити в них цікаві смисли й ділитися власними ідеями. Якщо тобі цікаво відкривати можливості української мови та літератури, зверни увагу на профіль української філології!",
    profileInvitation: "Тобі може бути цікавим навчання в нашому ліцеї на профілі української філології!",
    profileCard: "На цьому профілі ти зможеш поглиблювати знання з української мови та літератури, досліджувати мовні явища, працювати з текстами й знайомитися зі сферою медіакомунікацій.",
    professions: [
      "філолог", "редактор", "письменник", "журналіст", "перекладач", "викладач української мови та літератури"
    ]
  },

  foreignPhilology: {
    title: "Профіль іноземної філології",
    activityType: "Людина — художній образ",
    activityDescription: "Схоже, тобі цікаво відкривати світ через інші мови та культури. Тебе можуть захоплювати вивчення іноземних мов, порівняння традицій і способів життя різних народів, спілкування з людьми з інших країн. Можливо, тобі подобається знаходити спільне й відмінне між культурами, краще розуміти людей з різним досвідом і долати мовні бар'єри. Ти можеш сприймати іноземну мову не лише як навчальний предмет, а і як можливість пізнавати світ, подорожувати, спілкуватися та відкривати нові перспективи. Якщо тобі подобається пізнавати світ через мови, придивися до профілю іноземної філології!",
    profileInvitation: "Тобі може бути цікавим навчання в нашому ліцеї на профілі іноземної філології!",
    profileCard: "На цьому профілі ти зможеш поглиблено вивчати англійську мову та знайомитися з другою іноземною мовою — залежно від освітньої пропозиції ліцею (наприклад, німецькою, іспанською, французькою або польською).",
    professions: [
      "перекладач", "філолог", "викладач іноземних мов", "фахівець із міжнародних комунікацій", "дипломат", "журналіст-міжнародник"
    ]
  }
};

// Результати дослідження інтересів
const interestScores = {
  biological: 0,
  historical: 0,
  economic: 0,
  informatics: 0,
  ukrainianPhilology: 0,
  foreignPhilology: 0
};

// Кульки, які ще братимуть участь у порівнянні
let remainingInterestStatements = [];

// Поточна пара для порівняння
let currentInterestPair = [];

// Кількість завершених порівнянь
let completedInterestComparisons = 0;

// Увімкнення та вимкнення режиму групового виділення
groupSelectButton.addEventListener("click", () => {

  // Якщо група вже виділена — скасовуємо її
  if (selectedElements.length > 0) {
    selectedElements.forEach(item => {
      item.element.classList.remove("group-selected");
    });

    selectedElements = [];
    selectedElement = null;

    groupSelectButton.classList.remove("has-selection");
    groupSelectButton.classList.remove("active");

    workspace.classList.remove("group-selecting");

    selectionBox.hidden = true;
    selectionStart = null;
    isGroupSelecting = false;

    // Панель закриваємо лише тоді, коли фігур на полі немає
    selectedShapePanel.hidden = elements.length === 0;

    return;
  }

  // Якщо групи немає — перемикаємо режим рамки
  isGroupSelecting = !isGroupSelecting;

  groupSelectButton.classList.toggle("active", isGroupSelecting);
  workspace.classList.toggle("group-selecting", isGroupSelecting);

  if (!isGroupSelecting) {
    selectionBox.hidden = true;
    selectionStart = null;
  }
});

// Початок малювання рамки
workspace.addEventListener("pointerdown", event => {
  if (!isGroupSelecting) return;

  event.preventDefault();
  workspace.setPointerCapture(event.pointerId);

  const rect = workspace.getBoundingClientRect();

  selectionStart = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

  selectionBox.hidden = false;
  selectionBox.style.left = `${selectionStart.x}px`;
  selectionBox.style.top = `${selectionStart.y}px`;
  selectionBox.style.width = "0px";
  selectionBox.style.height = "0px";
});

// Зміна розміру рамки під час руху
workspace.addEventListener("pointermove", event => {
  if (!isGroupSelecting || !selectionStart) return;

  const rect = workspace.getBoundingClientRect();

  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  const left = Math.min(selectionStart.x, currentX);
  const top = Math.min(selectionStart.y, currentY);
  const width = Math.abs(currentX - selectionStart.x);
  const height = Math.abs(currentY - selectionStart.y);

  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;
});

// Завершення виділення
workspace.addEventListener("pointerup", () => {
  if (!isGroupSelecting || !selectionStart) return;

  const box = selectionBox.getBoundingClientRect();

// Прибираємо попереднє індивідуальне та групове виділення
selectedElement = null;
selectedElements = [];

document.querySelectorAll(".workspace-shape").forEach(shape => {
  shape.classList.remove("active", "group-selected");
});

// Визначаємо фігури, що потрапили в рамку
const selectionRect = selectionBox.getBoundingClientRect();

selectedElements = elements.filter(item => {
  const rect = item.element.getBoundingClientRect();

  return (
    rect.left < selectionRect.right &&
    rect.right > selectionRect.left &&
    rect.top < selectionRect.bottom &&
    rect.bottom > selectionRect.top
  );
});

// Позначаємо всі фігури групи
selectedElements.forEach(item => {
  item.element.classList.add("group-selected");
});

// Прибираємо стару індивідуальну рамку
selectionOutlinePath.setAttribute("d", "");
selectionOutline.style.width = "0px";
selectionOutline.style.height = "0px";

// Панель інструментів залишається доступною для групи
selectedShapePanel.hidden = selectedElements.length === 0;
// Оновлюємо індикатор розміру групи
updateSizeButtons(selectedElements[0] || null);

console.log("Виділено фігур:", selectedElements.length);

    selectionBox.hidden = true;
  selectionStart = null;

  // Завершуємо режим малювання рамки
  isGroupSelecting = false;
  groupSelectButton.classList.remove("active");
  workspace.classList.remove("group-selecting");

  // Зберігаємо групове виділення для подальшої роботи
  groupSelectButton.classList.toggle(
    "has-selection",
    selectedElements.length > 0
  );
});

// Не дозволяємо звичайним клікам заважати груповому виділенню
workspace.addEventListener("click", event => {
  if (isGroupSelecting) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

const selectedShapePanel = document.getElementById("selectedShapePanel");

let selectedShapeType = null;
let selectedElement = null;
let elements = [];
// Поточний масштаб і зміщення композиції в робочому полі
let workspaceLayoutScale = 1;
let workspaceLayoutOffsetX = 0;
let workspaceLayoutOffsetY = 0;

// Остаточний знімок персонажа для загальної характеристики
let savedCharacterData = null;
const maxElements = 10;

const shapeCharacteristics = {
  square: {
    icon: "■",
    title: "Практик, аналітик, організатор",
    subtitle: "Тобі близькі порядок і системність",
    description: "Ти можеш отримувати задоволення від завдань, у яких потрібно розібратися в складній системі, упорядкувати інформацію та знайти практичне рішення. Тобі може подобатися планувати роботу, помічати деталі й доводити розпочате до результату. Ти цінуєш зрозумілі правила, логіку та можливість бачити конкретний результат своїх зусиль.",
    professions: [
      "інженер",
      "архітектор",
      "програміст (розробник, тестувальник)",
      "фахівець із логістики",
      "юрист (договірне право)",
      "державний службовець"
    ]
  },

  rectangle: {
    icon: "▭",
    title: "Шукач, новатор, дослідник",
    subtitle: "Тобі цікаво відкривати нове",
    description: "Ти можеш бути людиною, якій цікаво пробувати незнайоме, ставити запитання й шукати власні відповіді. Нові обставини не обов'язково тебе лякають — навпаки, вони можуть стати приводом для дослідження. Тобі подобається дізнаватися, як усе влаштовано, аналізувати інформацію та ділитися відкриттями з іншими.",
    professions: [
      "дослідник",
      "науковець",
      "журналіст",
      "репортер",
      "копірайтер"
    ]
  },

  triangle: {
    icon: "▲",
    title: "Лідер, стратег, організатор досягнень",
    subtitle: "Тобі подобається ставити цілі й досягати їх",
    description: "Ти можеш прагнути досягати поставлених цілей, брати на себе відповідальність і впливати на результат спільної справи. Тобі може подобатися бачити перспективу, швидко орієнтуватися в ситуації та ухвалювати рішення. Конкуренція й складні завдання можуть сприйматися тобою як можливість перевірити власні сили.",
    professions: [
      "топменеджер",
      "керівник проєктів",
      "директор компанії",
      "юрист (адвокат у судових справах)",
      "прокурор",
      "політик",
      "дипломат"
    ]
  },

  circle: {
    icon: "●",
    title: "Гуманіст, комунікатор, дипломат",
    subtitle: "Тобі важливі люди та взаєморозуміння",
    description: "Ти можеш добре відчувати настрій інших людей, помічати їхні переживання та прагнути до взаєморозуміння. Тобі може подобатися працювати в команді, допомагати іншим, підтримувати доброзичливу атмосферу й знаходити спільну мову навіть у непростих ситуаціях. Для тебе важливими можуть бути довіра та людські стосунки.",
    professions: [
      "психолог",
      "психотерапевт",
      "HR-менеджер",
      "рекрутер",
      "соціальний працівник",
      "учитель",
      "вихователь"
    ]
  },

  zigzag: {
    icon: "〰",
    title: "Творець, генератор ідей, митець",
    subtitle: "Тобі подобається створювати щось незвичайне",
    description: "Ти можеш мислити нестандартно, помічати незвичні можливості й генерувати оригінальні ідеї. Тобі може бути цікаво експериментувати, створювати власні проєкти та знаходити рішення, які відрізняються від загальноприйнятих. Різноманітність і простір для самовираження можуть бути для тебе важливішими за одноманітні завдання.",
    professions: [
      "дизайнер",
      "художник",
      "ілюстратор",
      "сценарист",
      "режисер",
      "актор",
      "письменник",
      "журналіст-есеїст",
      "музикант"
    ]
  }
};

// Характеристики кольорів
const colorCharacteristics = {
  "#E53935": {
    title: "Рішучість та ініціативність",
    description: "Тобі може подобатися не лише обмірковувати ідеї, а й переходити до дій. Ти можеш охоче братися за нові справи та втілювати задумане."
  },
  "#FB8C00": {
    title: "Енергійність та взаємодія",
    description: "Ти можеш додавати енергії спільній справі, охоче взаємодіяти з іншими й надихати людей навколо."
  },
  "#FDD835": {
    title: "Допитливість та нові можливості",
    description: "Тобі може бути цікаво відкривати незвичне, ставити запитання, експериментувати й шукати нові можливості."
  },
  "#43A047": {
    title: "Послідовність та розвиток",
    description: "Ти можеш цінувати поступовий розвиток, стабільність і можливість бачити результати своєї роботи."
  },
  "#1E88E5": {
    title: "Спокій та обдуманість",
    description: "Ти можеш віддавати перевагу спокійному аналізу, зваженим рішенням і можливості добре обміркувати свої дії."
  },
  "#8E24AA": {
    title: "Уява та самовираження",
    description: "Тобі може подобатися шукати власний стиль, експериментувати й утілювати нестандартні ідеї."
  },
  "#FFFFFF": {
    title: "Відкритість та новий початок",
    description: "Ти можеш із цікавістю ставитися до нових можливостей і не поспішати обмежувати себе одним напрямом."
  },
  "#263238": {
    title: "Самостійність та індивідуальність",
    description: "Тобі може бути важливо мати власну позицію, самостійно ухвалювати рішення й обирати свій спосіб дії."
  }
};

// Формування характеристики за геометричними фігурами
function renderShapeCharacteristics() {
  const counts = {};

  elements.forEach(item => {
    counts[item.shape] = (counts[item.shape] || 0) + 1;
  });

  const levels = [...new Set(Object.values(counts))]
  .filter(count => count >= 2)
  .sort((a, b) => b - a)
  .slice(0, 2);

    const hasBalancedShapeTypes =
    levels.length === 1 &&
    Object.keys(counts).length === 5 &&
    Object.values(counts).every(count => count === levels[0]);
  
  // ДІАГНОСТИКА: підрахунок усіх геометричних фігур
  const allShapeCounts = {
    circle: 0,
    square: 0,
    rectangle: 0,
    triangle: 0,
    zigzag: 0
  };

  elements.forEach(item => {
    if (Object.prototype.hasOwnProperty.call(allShapeCounts, item.shape)) {
      allShapeCounts[item.shape]++;
    }
  });

  console.group("🧩 ДІАГНОСТИКА: геометрична характеристика");

  console.table(
    Object.entries(allShapeCounts).map(([shape, count]) => {
      const data = shapeCharacteristics[shape];
      let group = "Не потрапила до характеристики";

      if (count >= 2 && count === levels[0]) {
        group = "Основний типаж";
      } else if (count >= 2 && count === levels[1]) {
        group = "Додатковий типаж";
      }

      return {
        "Фігура": shape,
        "Кількість": count,
        "Група": group,
        "Типаж": data.title,
        "Визначальна риса": data.subtitle
      };
    })
  );

  console.log("Рівні повторення, які враховуються:", levels);
  console.groupEnd();

  let html = "";

  levels.forEach((level, index) => {
    const groupTitle = index === 0 && hasBalancedShapeTypes
      ? "Рівномірно представлені типажі"
      : index === 0
        ? "Основний типаж"
        : "Додатковий типаж";

    const matchingShapes = Object.keys(counts)
      .filter(shape => counts[shape] === level);

    html += `
      <div class="rules-card characteristic-group">
        <h2>${groupTitle}</h2>

        ${matchingShapes.map(shape => {
          const data = shapeCharacteristics[shape];

          return `
            <div class="characteristic-card">

              <div class="characteristic-main">
                <div class="characteristic-figure shape-${shape}"></div>

                <div class="characteristic-text">
                  <h3>${data.title}</h3>
                  <p class="characteristic-subtitle">${data.subtitle}</p>
                  <p>${data.description}</p>
                </div>
              </div>

              <div class="characteristic-professions">
                <h4>МОЖЛИВІ ПРОФЕСІЇ</h4>
                <div class="profession-tags">
                  ${data.professions.map(profession =>
                    `<span class="profession-tag">${profession}</span>`
                  ).join("")}
                </div>
              </div>

            </div>
          `;
        }).join("")}
      </div>
    `;
  });

  characteristicResults.innerHTML = html;
}

// Формування кольорової характеристики
function renderColorCharacteristics() {
  const colorCounts = {};

  elements.forEach(item => {
    if (!item.color) return;

    let color = item.color.toUpperCase();

  // Перетворюємо RGB у HEX для коректного розпізнавання
  const rgbMatch = color.match(
    /^RGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/
  );

  if (rgbMatch) {
    color = "#" + rgbMatch.slice(1)
      .map(value => Number(value).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

    // Не враховуємо стандартний бірюзовий колір
    if (color === "#14B8A6") return;

    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });

  // Відбираємо лише кольори, використані двічі або більше,
  // і для яких є опис характеристики
  const matchingColors = Object.keys(colorCounts)
    .filter(color =>
      colorCounts[color] >= 2 && colorCharacteristics[color]
    );

  const hasBalancedColors =
    matchingColors.length > 1 &&
    matchingColors.every(
      color => colorCounts[color] === colorCounts[matchingColors[0]]
    );
  
    // ДІАГНОСТИКА: збережені кольори та їх підрахунок
  console.group("🎨 ДІАГНОСТИКА: кольорова характеристика");

  console.table(
    elements.map((item, index) => ({
      "№ фігури": index + 1,
      "Фігура": item.shape,
      "Збережений колір": item.color || "(колір відсутній)"
    }))
  );

  console.table(
    Object.entries(colorCounts).map(([color, count]) => ({
      "Колір": color,
      "Кількість": count,
      "Є опис характеристики": Boolean(colorCharacteristics[color]),
      "Потрапив до результату": matchingColors.includes(color)
    }))
  );

  console.log("Кольори, які пройшли відбір:", matchingColors);
  console.groupEnd();

  // Якщо таких кольорів немає — не показуємо весь блок
  if (matchingColors.length === 0) return "";

  // Визначаємо два найвищі рівні повторення кольорів
  const levels = [...new Set(
    matchingColors.map(color => colorCounts[color])
  )]
    .sort((a, b) => b - a)
    .slice(0, 2);

    let html = `
      <div class="color-characteristic-card">
        <h2>Особливості характеру</h2>
        ${hasBalancedColors ? `
          <p>
            Твоя композиція поєднує кілька кольорових характеристик.
            Жодна з них не переважає, тому розглянь їх як різні
            грані твого самовираження.
          </p>
        ` : ""}
    `;

  levels.forEach((level, index) => {
    const colorsAtLevel = matchingColors.filter(
      color => colorCounts[color] === level
    );

    const groupTitle = index === 0
      ? "Основна характеристика"
      : "Додаткова характеристика";

    html += `
      <div class="color-characteristic-group">
        <h4 class="color-characteristic-level">${groupTitle}</h4>
    `;

    colorsAtLevel.forEach(color => {
      const characteristic = colorCharacteristics[color];

      html += `
        <div class="color-characteristic">
          <div class="color-characteristic-dot"
               style="background-color: ${color};"></div>
          <div class="color-characteristic-text">
            <h3>${characteristic.title}</h3>
            <p>${characteristic.description}</p>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  html += `</div>`;

  return html;
}

// Повертає поточне виділення: групу або одну фігуру
function getActiveSelection() {
  if (selectedElements.length > 0) {
    return selectedElements;
  }

  if (selectedElement) {
    return [selectedElement];
  }

  return [];
}
// Обчислюємо половину розмірів повернутої фігури
function getShapeHalfBounds(item) {
  const radians = (item.rotation || 0) * Math.PI / 180;
  const width = item.element.offsetWidth;
  const height = item.element.offsetHeight;

  return {
    halfWidth: (
      Math.abs(width * Math.cos(radians)) +
      Math.abs(height * Math.sin(radians))
    ) / 2,
    halfHeight: (
      Math.abs(width * Math.sin(radians)) +
      Math.abs(height * Math.cos(radians))
    ) / 2
  };
}

// Обчислюємо межі фігури за її початковими розмірами
function getBaseShapeHalfBounds(item) {
  const radians = (item.rotation || 0) * Math.PI / 180;
  const width = item.baseWidth;
  const height = item.baseHeight;

  return {
    halfWidth: (
      Math.abs(width * Math.cos(radians)) +
      Math.abs(height * Math.sin(radians))
    ) / 2,
    halfHeight: (
      Math.abs(width * Math.sin(radians)) +
      Math.abs(height * Math.cos(radians))
    ) / 2
  };
}
// Оновлюємо початкові координати після переміщення фігури
function syncBasePosition(item) {
  item.baseX =
    (item.x - workspaceLayoutOffsetX) / workspaceLayoutScale;

  item.baseY =
    (item.y - workspaceLayoutOffsetY) / workspaceLayoutScale;
}
// Перевіряємо, чи вся композиція вміщується в робоче поле
function isCompositionWithinWorkspace(padding = 4) {
  if (!workspace || elements.length === 0) return true;

  return elements.every(item => {
    const { halfWidth, halfHeight } = getShapeHalfBounds(item);

    return (
      item.x - halfWidth >= padding &&
      item.x + halfWidth <= workspace.clientWidth - padding &&
      item.y - halfHeight >= padding &&
      item.y + halfHeight <= workspace.clientHeight - padding
    );
  });
}
// Адаптуємо композицію до розміру робочого поля
// Початкові координати й розміри не змінюються
function fitElementsIntoWorkspace() {
  if (!workspace || elements.length === 0) return;

  const fieldWidth = workspace.clientWidth;
  const fieldHeight = workspace.clientHeight;

  if (fieldWidth <= 0 || fieldHeight <= 0) return;

  const padding = 4;

  // Якщо базові параметри ще не задані, відновлюємо їх
  // з поточного відображення
  elements.forEach(item => {
    if (!Number.isFinite(item.baseX)) {
      item.baseX =
        (item.x - workspaceLayoutOffsetX) / workspaceLayoutScale;
    }

    if (!Number.isFinite(item.baseY)) {
      item.baseY =
        (item.y - workspaceLayoutOffsetY) / workspaceLayoutScale;
    }

    if (!Number.isFinite(item.baseWidth)) {
      item.baseWidth =
        item.element.offsetWidth / workspaceLayoutScale;
    }

    if (!Number.isFinite(item.baseHeight)) {
      item.baseHeight =
        item.element.offsetHeight / workspaceLayoutScale;
    }
  });

  // Визначаємо межі всієї композиції
  const bounds = elements.map(item => {
    const { halfWidth, halfHeight } =
      getBaseShapeHalfBounds(item);

    return {
      left: item.baseX - halfWidth,
      right: item.baseX + halfWidth,
      top: item.baseY - halfHeight,
      bottom: item.baseY + halfHeight
    };
  });

  const compositionBounds = {
    left: Math.min(...bounds.map(bound => bound.left)),
    right: Math.max(...bounds.map(bound => bound.right)),
    top: Math.min(...bounds.map(bound => bound.top)),
    bottom: Math.max(...bounds.map(bound => bound.bottom))
  };

  const compositionWidth =
    compositionBounds.right - compositionBounds.left;

  const compositionHeight =
    compositionBounds.bottom - compositionBounds.top;

  if (compositionWidth <= 0 || compositionHeight <= 0) return;

  // Визначаємо єдиний пропорційний масштаб
  const scale = Math.min(
    1,
    (fieldWidth - padding * 2) / compositionWidth,
    (fieldHeight - padding * 2) / compositionHeight
  );

  if (!Number.isFinite(scale) || scale <= 0) return;

  // Розміщуємо композицію в межах робочого поля
  if (scale < 1) {
    // Якщо композиція зменшується — центруємо її
    workspaceLayoutOffsetX =
      (fieldWidth - compositionWidth * scale) / 2 -
      compositionBounds.left * scale;

    workspaceLayoutOffsetY =
      (fieldHeight - compositionHeight * scale) / 2 -
      compositionBounds.top * scale;
  } else {
    // Якщо масштаб 1 — зміщуємо композицію
    // лише тоді, коли вона виходить за межі поля
    workspaceLayoutOffsetX =
      compositionBounds.left < padding
        ? padding - compositionBounds.left
        : compositionBounds.right > fieldWidth - padding
          ? fieldWidth - padding - compositionBounds.right
          : 0;

    workspaceLayoutOffsetY =
      compositionBounds.top < padding
        ? padding - compositionBounds.top
        : compositionBounds.bottom > fieldHeight - padding
          ? fieldHeight - padding - compositionBounds.bottom
          : 0;
  }

  workspaceLayoutScale = scale;

  // Відображаємо всі фігури в новому масштабі
  elements.forEach(item => {
    item.x =
      item.baseX * scale + workspaceLayoutOffsetX;

    item.y =
      item.baseY * scale + workspaceLayoutOffsetY;

    item.element.style.width =
      `${item.baseWidth * scale}px`;

    item.element.style.height =
      `${item.baseHeight * scale}px`;

    item.element.style.left = `${item.x}px`;
    item.element.style.top = `${item.y}px`;
  });

  if (selectedElements.length > 0) {
    return;
  }

  if (selectedElement) {
    updateSelectionOutline(selectedElement);
  }
}

// Повністю очищує поточне виділення
function clearSelection() {
  selectedElement = null;
  selectedElements = [];

  document.querySelectorAll(".workspace-shape").forEach(shape => {
    shape.classList.remove("active", "group-selected");
  });

  selectionOutlinePath.setAttribute("d", "");
  selectionOutline.style.width = "0px";
  selectionOutline.style.height = "0px";

  selectedShapePanel.hidden = true;

  sizeButtons.forEach(button => {
    button.classList.remove("active");
  });
}
const constructorScreen = document.getElementById("constructorScreen");

// Підказка про прокручування панелі інструментів
const toolsPanel = document.querySelector("#constructorScreen .tools-panel");
const toolsScrollHint = document.getElementById("toolsScrollHint");

function updateToolsScrollHint() {
  const isLandscapeMobile = window.matchMedia(
    "(max-width: 900px)"
  ).matches;

  const isConstructorActive =
    constructorScreen.classList.contains("active");

  // Підказка працює лише в конструкторі на мобільних екранах
  if (!isLandscapeMobile || !isConstructorActive) {
    toolsScrollHint.hidden = true;
    return;
  }

  const hasMoreContent =
    toolsPanel.scrollHeight > toolsPanel.clientHeight + 2;

  const isAtBottom =
    toolsPanel.scrollTop + toolsPanel.clientHeight >=
    toolsPanel.scrollHeight - 8;

  toolsScrollHint.hidden = !hasMoreContent || isAtBottom;
}

// Реагуємо на прокручування
toolsPanel.addEventListener("scroll", updateToolsScrollHint);

// Реагуємо на появу або приховування налаштувань фігури
const toolsPanelObserver = new MutationObserver(() => {
  requestAnimationFrame(updateToolsScrollHint);
});

toolsPanelObserver.observe(toolsPanel, {
  attributes: true,
  subtree: true,
  attributeFilter: ["hidden"]
});

// Перевіряємо стан підказки при зміні розміру вікна
window.addEventListener("resize", updateToolsScrollHint);

// Автовідтворення першого відео
welcomeVideo.play().catch(() => {
  console.log("Автовідтворення першого відео заблоковано браузером.");
});

// Перехід з першого екрана на другий
startButton.addEventListener("click", () => {
  // Реєстрація нового проходження тесту
  currentPassageId =
    "PASS-" + Date.now() + "-" +
    Math.random().toString(36).slice(2, 8);

  passageStartedAt = new Date().toISOString();

  sendAnalyticsEvent({
    event: "start",
    passageId: currentPassageId,
    startedAt: passageStartedAt
  });

  welcomeScreen.classList.remove("active");
  startScreen.classList.add("active");
  playScreenTransitionSound();

  welcomeVideo.pause();

  startVideo.currentTime = 0;

  startVideo.play().catch(() => {
    console.log("Не вдалося автоматично запустити друге відео.");
  });

});

// Перехід з другого екрана на третій
explanationButton.addEventListener("click", () => {

  startScreen.classList.remove("active");
  explanationScreen.classList.add("active");
  playScreenTransitionSound();

  startVideo.pause();

});

// Перехід з третього екрана до конструктора
constructorButton.addEventListener("click", () => {
  explanationScreen.classList.remove("active");
  constructorScreen.classList.add("active");
  playScreenTransitionSound();
  requestAnimationFrame(updateToolsScrollHint);
});

// Перехід із конструктора на екран готового персонажа
finishConstructorButton.addEventListener("click", () => {

  constructorScreen.classList.remove("active");
  characterScreen.classList.add("active");
  playScreenTransitionSound();

  characterVideo.currentTime = 0;
  characterVideo.play().catch(() => {
    console.log("Не вдалося автоматично запустити відео Сови на п'ятому екрані.");
  });

  requestAnimationFrame(() => {
    renderCharacterPreview();
  });

});

// Перехід від готового персонажа до його характеристики
readCharacteristicButton.addEventListener("click", () => {
  saveCharacterData();

  renderShapeCharacteristics();
  document.getElementById("colorCharacteristicResults").innerHTML =
    renderColorCharacteristics();

  characterScreen.classList.remove("active");
  characteristicScreen.classList.add("active");
  playScreenTransitionSound();
  // Фіксуємо завершення першого етапу
  sendAnalyticsEvent({
    event: "stage",
    passageId: currentPassageId,
    lastStage: "Характеристика персонажа"
  });
});

// Перехід із першої характеристики до запрошення на другий етап
continueToSecondStageButton.addEventListener("click", () => {

  characteristicScreen.classList.remove("active");
  secondStageScreen.classList.add("active");
  playScreenTransitionSound();

  secondStageVideo.currentTime = 0;
  secondStageVideo.play().catch(() => {
    console.log("Не вдалося автоматично запустити відео Сови на сьомому екрані.");
  });

});

// Перехід від запрошення до правил другого етапу
document.getElementById("startSecondStageButton").addEventListener("click", () => {

  secondStageScreen.classList.remove("active");
  interestExplanationScreen.classList.add("active");
  playScreenTransitionSound();

});

// Перехід від правил до дослідження інтересів
document.getElementById("startInterestTestButton").addEventListener("click", () => {

  interestExplanationScreen.classList.remove("active");
  secondTestScreen.classList.add("active");
  playScreenTransitionSound();

  startInterestTest();

});

// Перехід від дослідження інтересів до проміжного екрана
document.getElementById("readInterestCharacteristicButton").addEventListener("click", () => {
  secondTestScreen.classList.remove("active");
  document.getElementById("interestResultsScreen").classList.add("active");
  playScreenTransitionSound();

  // Фіксуємо завершення другого етапу
  sendAnalyticsEvent({
    event: "stage",
    passageId: currentPassageId,
    lastStage: "Дослідження інтересів"
  }); 

  const resultsVideo = document.getElementById("interestResultsOwlVideo");
  resultsVideo.currentTime = 0;
  resultsVideo.play().catch(() => {
    console.log("Не вдалося автоматично запустити відео Сови на десятому екрані.");
  });
});

// Перехід від проміжного екрана до характеристики інтересів
document.getElementById("continueToFinalButton").addEventListener("click", () => {
  document.getElementById("interestResultsScreen").classList.remove("active");
  document.getElementById("interestCharacteristicScreen").classList.add("active");
  playScreenTransitionSound();

  renderInterestCharacteristics();
});

// Перехід до екрана вражень та отримання результатів
document.getElementById("continueToEmailScreenButton").addEventListener("click", () => {
  document.getElementById("interestCharacteristicScreen").classList.remove("active");
  document.getElementById("emailScreen").classList.add("active");
  playScreenTransitionSound();
});

// Перехід до завершення без надсилання результатів
document.getElementById("skipEmailButton").addEventListener("click", () => {

  finishPassage("не надсилалося");

  document.getElementById("emailScreen").classList.remove("active");
  document.getElementById("farewellScreen").classList.add("active");
  playScreenTransitionSound();
});

// Повторне проходження інтерактиву з самого початку
document.getElementById("restartButton").addEventListener("click", () => {
  window.location.reload();
  playScreenTransitionSound();

  setTimeout(() => {
    window.location.reload();
  }, 1000);
});

// КОНСТРУКТОР: ДОДАВАННЯ ТА ВИБІР ФІГУР

// Зміна кольору вибраних фігур
colorButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selection = getActiveSelection();

    if (selection.length === 0) return;

    saveState();

    const color = button.dataset.color;

    selection.forEach(item => {
      item.element.style.backgroundColor = color;
      item.color = color;
    });
  });
});

// Зміна розміру вибраної фігури або групи
sizeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selection = getActiveSelection();
    if (selection.length === 0) return;

    saveState();

    const size = button.dataset.size;

    const sizes = {
      circle: { small: [30, 30], medium: [60, 60], large: [110, 110] },
      square: { small: [30, 30], medium: [60, 60], large: [110, 110] },
      rectangle: { small: [42, 28], medium: [85, 55], large: [150, 95] },
      triangle: { small: [30, 30], medium: [60, 60], large: [110, 110] },
      zigzag: { small: [32, 25], medium: [65, 50], large: [115, 88] }
    };

    selection.forEach(item => {
      const dimensions = sizes[item.shape][size];

      // Зберігаємо нові початкові розміри
      item.baseWidth = dimensions[0];
      item.baseHeight = dimensions[1];

      // Відображаємо розмір з урахуванням масштабу поля
      item.element.style.width =
        `${item.baseWidth * workspaceLayoutScale}px`;

      item.element.style.height =
        `${item.baseHeight * workspaceLayoutScale}px`;

      item.size = size;
    });

    // Адаптуємо всю композицію лише тоді,
    // коли після зміни розміру вона перестала вміщуватися
    if (!isCompositionWithinWorkspace()) {
      fitElementsIntoWorkspace();
    }

    // Оновлюємо підсвічування розміру
    updateSizeButtons(selection[0]);

    // Оновлюємо контур лише для індивідуального виділення
    if (selectedElements.length === 0 && selectedElement) {
      updateSelectionOutline(selectedElement);
    }
  });
});

// Поворот вибраної фігури або групи
rotationButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selection = getActiveSelection();

    if (selection.length === 0) return;

    saveState();

    const angle = Number(button.dataset.rotation);
    const radians = angle * Math.PI / 180;

    // Визначаємо спільний центр групи
    const centerX = selection.reduce((sum, item) => sum + item.x, 0) / selection.length;
    const centerY = selection.reduce((sum, item) => sum + item.y, 0) / selection.length;

    // Повертаємо центри фігур і самі фігури
    selection.forEach(item => {
      const dx = item.x - centerX;
      const dy = item.y - centerY;

      item.x = centerX + dx * Math.cos(radians) - dy * Math.sin(radians);
      item.y = centerY + dx * Math.sin(radians) + dy * Math.cos(radians);

      item.rotation = (item.rotation || 0) + angle;
    });

    // Визначаємо межі всієї повернутої групи
    const minX = Math.max(...selection.map(item => {
      const radians = (item.rotation || 0) * Math.PI / 180;
      const halfWidth = (
        Math.abs(item.element.offsetWidth * Math.cos(radians)) +
        Math.abs(item.element.offsetHeight * Math.sin(radians))
      ) / 2;

      return halfWidth - item.x;
    }));

    const maxX = Math.min(...selection.map(item => {
      const radians = (item.rotation || 0) * Math.PI / 180;
      const halfWidth = (
        Math.abs(item.element.offsetWidth * Math.cos(radians)) +
        Math.abs(item.element.offsetHeight * Math.sin(radians))
      ) / 2;

      return workspace.clientWidth - halfWidth - item.x;
    }));

    const minY = Math.max(...selection.map(item => {
      const radians = (item.rotation || 0) * Math.PI / 180;
      const halfHeight = (
        Math.abs(item.element.offsetWidth * Math.sin(radians)) +
        Math.abs(item.element.offsetHeight * Math.cos(radians))
      ) / 2;

      return halfHeight - item.y;
    }));

    const maxY = Math.min(...selection.map(item => {
      const radians = (item.rotation || 0) * Math.PI / 180;
      const halfHeight = (
        Math.abs(item.element.offsetWidth * Math.sin(radians)) +
        Math.abs(item.element.offsetHeight * Math.cos(radians))
      ) / 2;

      return workspace.clientHeight - halfHeight - item.y;
    }));

    // Зміщуємо групу всередину, якщо це необхідно
    const shiftX = Math.max(minX, Math.min(0, maxX));
    const shiftY = Math.max(minY, Math.min(0, maxY));

    selection.forEach(item => {
      item.x += shiftX;
      item.y += shiftY;

      syncBasePosition(item);

      item.element.style.left = `${item.x}px`;
      item.element.style.top = `${item.y}px`;
      item.element.style.transform =
        `translate(-50%, -50%) rotate(${item.rotation}deg)`;
    });

    // Оновлюємо рамку для одиночної фігури
    if (selection.length === 1) {
      updateSelectionOutline(selection[0]);
    }
  });
});

// Точне переміщення вибраної фігури або групи
nudgeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selection = getActiveSelection();

    if (selection.length === 0) return;

    const dx = Number(button.dataset.x);
    const dy = Number(button.dataset.y);

    // Перевіряємо, чи можна перемістити всю вибірку
    const canMove = selection.every(item => {
    const newX = item.x + dx;
    const newY = item.y + dy;

    const { halfWidth, halfHeight } = getShapeHalfBounds(item);

    return (
      newX >= halfWidth &&
      newX <= workspace.clientWidth - halfWidth &&
      newY >= halfHeight &&
      newY <= workspace.clientHeight - halfHeight
    );
  });

    if (!canMove) return;

    saveState();

    selection.forEach(item => {
      item.x += dx;
      item.y += dy;

      syncBasePosition(item);

      item.element.style.left = `${item.x}px`;
      item.element.style.top = `${item.y}px`;
    });

    // Оновлюємо контур одиночної фігури
    if (selection.length === 1) {
      updateSelectionOutline(selection[0]);
    }
  });
});

// Активація та скасування режиму переміщення
moveButton.addEventListener("click", () => {
  if (getActiveSelection().length === 0) return;

  // Якщо режим уже активний — скасовуємо його
  if (isMoving) {
    isMoving = false;
    moveButton.classList.remove("active");
    workspace.querySelector(".workspace-hint")?.remove();
    return;
  }

  // Якщо режим неактивний — вмикаємо його
  isMoving = true;
  moveButton.classList.add("active");

  workspace.querySelector(".workspace-hint")?.remove();

  const hint = document.createElement("div");
  hint.className = "workspace-hint";
  hint.textContent = selectedElements.length > 0
    ? "Обери нове місце для групи фігур"
    : "Обери нове місце для фігури";

  workspace.appendChild(hint);
});

// Вибір фігури в панелі інструментів
shapeButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectedShapeType = button.dataset.shape;

    shapeButtons.forEach(item => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
  });
});

// Додавання фігури на робоче поле
workspace.addEventListener("click", event => {

// Переміщення вибраної фігури або групи
  if (isMoving) {
    const selection = getActiveSelection();

    if (selection.length === 0) return;

    const rect = workspace.getBoundingClientRect();

// Координати кліку відносно внутрішньої частини робочого поля
const x = event.clientX - rect.left - workspace.clientLeft;
const y = event.clientY - rect.top - workspace.clientTop;

saveState();

// Визначаємо бажане зміщення відносно першої фігури
const firstElement = selection[0];

let deltaX = x - firstElement.x;
let deltaY = y - firstElement.y;

// Визначаємо допустимі межі переміщення всієї групи
const minDeltaX = Math.max(...selection.map(item => {
  const { halfWidth } = getShapeHalfBounds(item);
  return halfWidth - item.x;
}));

const maxDeltaX = Math.min(...selection.map(item => {
  const { halfWidth } = getShapeHalfBounds(item);
  return workspace.clientWidth - halfWidth - item.x;
}));

const minDeltaY = Math.max(...selection.map(item => {
  const { halfHeight } = getShapeHalfBounds(item);
  return halfHeight - item.y;
}));

const maxDeltaY = Math.min(...selection.map(item => {
  const { halfHeight } = getShapeHalfBounds(item);
  return workspace.clientHeight - halfHeight - item.y;
}));

// Обмежуємо переміщення межами робочого поля
deltaX = Math.max(minDeltaX, Math.min(deltaX, maxDeltaX));
deltaY = Math.max(minDeltaY, Math.min(deltaY, maxDeltaY));

// Переміщуємо всі фігури зі збереженням їхнього розташування
selection.forEach(item => {
  item.x += deltaX;
  item.y += deltaY;

  syncBasePosition(item);

  item.element.style.left = `${item.x}px`;
  item.element.style.top = `${item.y}px`;
});

    isMoving = false;
    moveButton.classList.remove("active");

    workspace.querySelector(".workspace-hint")?.remove();

    // Оновлюємо контур для індивідуального виділення
    if (selectedElements.length === 0 && selectedElement) {
      updateSelectionOutline(selectedElement);
    }

    event.stopImmediatePropagation();
    return;
  }

  // Якщо натиснули на вже розміщену фігуру — не додаємо нову
  if (event.target.classList.contains("workspace-shape")) {
    return;
  }

  if (!selectedShapeType) {
    return;
  }

  if (elements.length >= maxElements) {
    alert("Можна додати не більше 10 елементів!");
    return;
  }
  saveState();

  const rect = workspace.getBoundingClientRect();

  let x = event.clientX - rect.left - workspace.clientLeft;
  let y = event.clientY - rect.top - workspace.clientTop;

  const shape = document.createElement("div");

  shape.classList.add(
    "workspace-shape",
    `shape-${selectedShapeType}`
  );
  shape.dataset.shape = selectedShapeType;

  shape.style.left = `${x}px`;
  shape.style.top = `${y}px`;

  workspace.appendChild(shape);

// Запам'ятовуємо початкові розміри фігури
  const baseWidth = shape.offsetWidth;
  const baseHeight = shape.offsetHeight;

  // Одразу застосовуємо масштаб робочого поля
  shape.style.width =
    `${baseWidth * workspaceLayoutScale}px`;

  shape.style.height =
    `${baseHeight * workspaceLayoutScale}px`;

  const halfWidth = shape.offsetWidth / 2;
  const halfHeight = shape.offsetHeight / 2;
  
  // Обмежуємо розміщення фігури межами робочого поля
  x = Math.max(halfWidth, Math.min(x, workspace.clientWidth - halfWidth));
  y = Math.max(halfHeight, Math.min(y, workspace.clientHeight - halfHeight));

  // Оновлюємо позицію фігури
  shape.style.left = `${x}px`;
  shape.style.top = `${y}px`;

  const elementData = {
    id: Date.now(),
    shape: selectedShapeType,
    element: shape,

    // Координати та розміри в початковому масштабі
    baseX: (x - workspaceLayoutOffsetX) / workspaceLayoutScale,
    baseY: (y - workspaceLayoutOffsetY) / workspaceLayoutScale,
    baseWidth: baseWidth,
    baseHeight: baseHeight,

    // Координати поточного відображення
    x: x,
    y: y,
    rotation: 0
  };

  elements.push(elementData);
  
  selectElement(elementData);
  selectedShapeType = null;
  
  shapeButtons.forEach(item => {
    item.classList.remove("selected");
  });
  updateElementCounter();
  updateWorkspaceHint();
});

// Збереження поточного стану конструктора
function saveState() {
  const state = {
    elements: elements.map(item => ({
      id: item.id,
      shape: item.shape,
      x: item.baseX,
      y: item.baseY,
      baseX: item.baseX,
      baseY: item.baseY,
      baseWidth: item.baseWidth,
      baseHeight: item.baseHeight,
      color: getComputedStyle(item.element).backgroundColor,
      width: item.baseWidth,
      height: item.baseHeight,
      size: item.size || "medium",
      rotation: item.rotation || 0
    })),
    selectedId: selectedElement ? selectedElement.id : null
  };

  undoHistory.push(state);
  updateUndoButton();
}

// Вибір уже доданої фігури
workspace.addEventListener("click", event => {
  const shape = event.target.closest(".workspace-shape");

  if (!shape) return;

  const elementData = elements.find(item => item.element === shape);

  if (elementData) {
    selectElement(elementData);
  }
});

// Оновлення доступності кнопки скасування
function updateUndoButton() {
  undoButton.disabled = undoHistory.length === 0;
}

// Відновлення попереднього стану конструктора
function restoreState(state) {
  // Видаляємо всі поточні фігури
  workspace.querySelectorAll(".workspace-shape").forEach(shape => {
    shape.remove();
  });

  // Відновлюємо фігури зі збереженого стану
  elements = state.elements.map(item => {
    const shape = document.createElement("div");

    shape.classList.add(
      "workspace-shape",
      `shape-${item.shape}`
    );

    shape.dataset.shape = item.shape;
    shape.style.left = `${item.x}px`;
    shape.style.top = `${item.y}px`;
    shape.style.width = `${item.baseWidth ?? item.width}px`;
    shape.style.height = `${item.baseHeight ?? item.height}px`;
    shape.style.transform = `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`;
    shape.style.backgroundColor = item.color;

    workspace.appendChild(shape);

    return {
      ...item,
      element: shape
    };
  });

  // Скидаємо режим переміщення
  isMoving = false;
  moveButton.classList.remove("active");
  workspace.querySelector(".workspace-hint")?.remove();

    // Очищаємо попереднє виділення
  selectionOutlinePath.setAttribute("d", "");
  selectionOutline.style.width = "0px";
  selectionOutline.style.height = "0px";

  // Скидаємо групове виділення
  selectedElements = [];
  groupSelectButton.classList.remove("active");
  groupSelectButton.classList.remove("has-selection");

  // Відновлюємо вибрану фігуру
  selectedElement = elements.find(
    item => item.id === state.selectedId
  ) || null;

  document.querySelectorAll(".workspace-shape").forEach(shape => {
    shape.classList.remove("active");
  });

  selectedShapePanel.hidden = elements.length === 0;

  sizeButtons.forEach(button => {
    button.classList.remove("active");
  });

  if (selectedElement) {
    selectElement(selectedElement);
  }

  updateElementCounter();

  // Після скасування також перевіряємо межі: поле могло змінити розмір.
  fitElementsIntoWorkspace();
}

// Скасування останньої дії
undoButton.addEventListener("click", () => {
  if (undoHistory.length === 0) return;

  const previousState = undoHistory.pop();
  restoreState(previousState);
  updateUndoButton();
});

// Виділення фігури та відкриття налаштувань
function selectElement(elementData) {
  selectedElement = elementData;

  // Переходимо від групового виділення до індивідуального
  selectedElements = [];
  groupSelectButton.classList.remove("has-selection");

  // Прибираємо попереднє виділення з усіх фігур
  document.querySelectorAll(".workspace-shape").forEach(shape => {
    shape.classList.remove("active", "group-selected");
  });

  // Виділяємо тільки поточну фігуру
  elementData.element.classList.add("active");

  selectedShapePanel.hidden = false;
  updateSizeButtons(elementData);
  updateSelectionOutline(elementData);
}

// Видалення вибраних фігур
deleteButton.addEventListener("click", () => {
  // Визначаємо, що саме потрібно видалити
  const itemsToDelete = selectedElements.length > 0
    ? [...selectedElements]
    : selectedElement
      ? [selectedElement]
      : [];

  if (itemsToDelete.length === 0) return;

  saveState();

  // Видаляємо вибрані фігури
  itemsToDelete.forEach(item => {
    item.element.remove();
  });

  elements = elements.filter(
    item => !itemsToDelete.includes(item)
  );

  // Очищаємо виділення
  selectedElement = null;
  selectedElements = [];

  document.querySelectorAll(".workspace-shape").forEach(shape => {
    shape.classList.remove("active", "group-selected");
  });

  selectedShapePanel.hidden = elements.length === 0;

  sizeButtons.forEach(button => {
    button.classList.remove("active");
  });

  selectionOutlinePath.setAttribute("d", "");
  selectionOutline.style.width = "0px";
  selectionOutline.style.height = "0px";

  // Скидаємо режим переміщення
  isMoving = false;
  moveButton.classList.remove("active");
  workspace.querySelector(".workspace-hint")?.remove();

  updateElementCounter();
});

// Підсвічування поточного розміру
function updateSizeButtons(elementData) {
  const selection = getActiveSelection();

  let currentSize;

  if (selection.length > 1) {
    const sizes = selection.map(item => item.size || "medium");

    currentSize = sizes.every(size => size === sizes[0])
      ? sizes[0]
      : null;
  } else {
    currentSize = elementData
      ? elementData.size || "medium"
      : null;
  }

  sizeButtons.forEach(button => {
    button.classList.toggle(
      "active",
      currentSize !== null && button.dataset.size === currentSize
    );
  });
}

// Оновлення контуру вибраної фігури
function updateSelectionOutline(elementData) {
  const paths = {
    circle: "M 50 3 A 47 47 0 1 1 50 97 A 47 47 0 1 1 50 3",
    square: "M 3 3 H 97 V 97 H 3 Z",
    rectangle: "M 3 3 H 97 V 97 H 3 Z",
    triangle: "M 50 3 L 97 97 H 3 Z",
    zigzag: "M 3 10 L 25 55 L 50 10 L 75 55 L 97 10 L 97 45 L 75 90 L 50 45 L 25 90 L 3 45 Z"  };

  const shape = elementData.element;

  selectionOutlinePath.setAttribute(
    "d",
    paths[elementData.shape]
  );

  selectionOutline.classList.toggle(
    "zigzag-selected",
    elementData.shape === "zigzag"
  );

  selectionOutline.style.width = `${shape.offsetWidth}px`;
  selectionOutline.style.height = `${shape.offsetHeight}px`;
  selectionOutline.style.left = `${elementData.x}px`;
  selectionOutline.style.top = `${elementData.y}px`;
  selectionOutline.style.transform =
  `translate(-50%, -50%) rotate(${elementData.rotation || 0}deg)`;
}

// Оновлення лічильника та стану кнопки завершення
function updateElementCounter() {
  elementCounter.textContent = `Елементів: ${elements.length} / ${maxElements}`;

  finishConstructorButton.disabled = elements.length !== maxElements;
}

// Відображення копії персонажа на екрані перегляду
function renderCharacterPreview() {
  characterPreview.innerHTML = "";

  console.log("Кількість фігур для перегляду:", elements.length);
if (elements.length === 0) return;

  const previewWidth = characterPreview.clientWidth;
  const previewHeight = characterPreview.clientHeight;
  console.log("Розміри області:", previewWidth, previewHeight);

  const minX = Math.min(...elements.map(item => item.x - parseFloat(getComputedStyle(item.element).width) / 2));
  const maxX = Math.max(...elements.map(item => item.x + parseFloat(getComputedStyle(item.element).width) / 2));
  const minY = Math.min(...elements.map(item => item.y - parseFloat(getComputedStyle(item.element).height) / 2));
  const maxY = Math.max(...elements.map(item => item.y + parseFloat(getComputedStyle(item.element).height) / 2));

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  const scale = Math.min(
    (previewWidth - 40) / contentWidth,
    (previewHeight - 40) / contentHeight,
    1
  );

  const offsetX = (previewWidth - contentWidth * scale) / 2;
  const offsetY = (previewHeight - contentHeight * scale) / 2;

  elements.forEach(item => {
    const copy = document.createElement("div");
  
    copy.classList.add(
      "workspace-shape",
      `shape-${item.shape}`
    );

    copy.style.position = "absolute";
    copy.style.width = `${parseFloat(getComputedStyle(item.element).width) * scale}px`;
    copy.style.height = `${parseFloat(getComputedStyle(item.element).height) * scale}px`;
    copy.style.left = `${offsetX + (item.x - minX) * scale}px`;
    copy.style.top = `${offsetY + (item.y - minY) * scale}px`;
    copy.style.backgroundColor = getComputedStyle(item.element).backgroundColor;
    copy.style.transform = `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`;
    copy.style.border = "none";
    copy.style.cursor = "default";

    characterPreview.appendChild(copy);
  });
}

// Адаптація фігур після зміни орієнтації або розміру робочого поля.
let workspaceResizeFrame = null;

function handleWorkspaceResize() {
  if (!constructorScreen.classList.contains("active")) return;

  if (workspaceResizeFrame) {
    cancelAnimationFrame(workspaceResizeFrame);
  }

  workspaceResizeFrame = requestAnimationFrame(() => {
    fitElementsIntoWorkspace();
    workspaceResizeFrame = null;
  });
}

// ResizeObserver реагує саме на зміну розмірів поля, а не лише вікна.
if ("ResizeObserver" in window) {
  const workspaceObserver = new ResizeObserver(handleWorkspaceResize);
  workspaceObserver.observe(workspace);
} else {
  window.addEventListener("resize", handleWorkspaceResize);
  window.addEventListener("orientationchange", handleWorkspaceResize);
}

// Оновлення персонажа після зміни розміру вікна
window.addEventListener("resize", () => {
  if (characterScreen.classList.contains("active")) {
    requestAnimationFrame(() => {
      renderCharacterPreview();
    });
  }
});

// Збереження остаточного стану персонажа
function saveCharacterData() {
  savedCharacterData = elements.map(item => ({
    id: item.id,
    shape: item.shape,
    x: item.x,
    y: item.y,
    color: getComputedStyle(item.element).backgroundColor,
    width: parseFloat(getComputedStyle(item.element).width),
    height: parseFloat(getComputedStyle(item.element).height),
    size: item.size || "medium",
    rotation: item.rotation || 0
  }));

  console.table(savedCharacterData.map(item => ({
  shape: item.shape,
  width: item.width,
  height: item.height,
  x: item.x,
  y: item.y
})));
  console.log("Збережені дані персонажа:", savedCharacterData);
}

// Розрахунок загальних результатів двох етапів

function calculateCombinedProfileResults() {

  // 1. Підрахунок використаних фігур
  const shapeCounts = {
    rectangle: 0,
    triangle: 0,
    square: 0,
    circle: 0,
    zigzag: 0
  };

  savedCharacterData.forEach(item => {
    if (shapeCounts.hasOwnProperty(item.shape)) {
      shapeCounts[item.shape]++;
    }
  });

  // 2. Відбираємо фігури, використані щонайменше тричі
  const qualifyingShapes = Object.entries(shapeCounts)
    .filter(([shape, count]) => count >= 3);

  // 3. Початкові геометричні бонуси
  const geometryBonus = {
    biological: 0,
    historical: 0,
    economic: 0,
    informatics: 0,
    ukrainianPhilology: 0,
    foreignPhilology: 0
  };

  // 4. Зв'язок характеристик фігур з освітніми профілями
  const shapeProfiles = {
    square: [
      "biological",
      "economic",
      "informatics"
    ],
    rectangle: [
      "biological",
      "historical",
      "informatics"
    ],
    triangle: [
      "economic",
      "historical",
      "foreignPhilology"
    ],
    circle: [
      "biological",
      "historical",
      "ukrainianPhilology",
      "foreignPhilology"
    ],
    zigzag: [
      "informatics",
      "ukrainianPhilology",
      "foreignPhilology"
    ]
  };

  // 5. Визначаємо основну та додаткову фігури
  if (qualifyingShapes.length > 0) {

    const countLevels = [...new Set(
      qualifyingShapes.map(([shape, count]) => count)
    )].sort((a, b) => b - a);

    qualifyingShapes.forEach(([shape, count]) => {

      let shapeWeight = 0;

      if (count === countLevels[0]) {
        shapeWeight = 1;
      } else if (count === countLevels[1]) {
        shapeWeight = 0.5;
      }

      // Рівномірно розподіляємо бонус фігури
      // між усіма пов'язаними з нею профілями
      if (shapeWeight > 0) {
        const profiles = shapeProfiles[shape];
        const profileBonus = shapeWeight / profiles.length;

        profiles.forEach(profile => {
          geometryBonus[profile] += profileBonus;
        });
      }
    });
  }

  // 6. Об'єднуємо результати двох етапів
  const combinedScores = {};

  Object.keys(interestScores).forEach(profile => {
    combinedScores[profile] =
      interestScores[profile] + geometryBonus[profile];
  });

  // 7. Визначаємо профілі, які пройшли поріг 80%
  // Поріг залежить ТІЛЬКИ від результатів тесту інтересів
  const highestInterestScore = Math.max(
    ...Object.values(interestScores)
  );

  const eligibleProfiles = Object.keys(interestScores)
    .filter(profile =>
      interestScores[profile] >= highestInterestScore * 0.8
    );

  // 8. Сортуємо рекомендовані профілі
  // за сумою балів інтересів і геометричного бонусу
  const recommendedProfiles = eligibleProfiles.sort(
    (a, b) => combinedScores[b] - combinedScores[a]
  );

  return {
    shapeCounts,
    geometryBonus,
    combinedScores,
    recommendedProfiles,
    isVersatile: qualifyingShapes.length === 0
  };
}

function renderInterestCharacteristics() {
  const resultsContainer = document.getElementById(
    "interestCharacteristicResults"
  );

  if (!resultsContainer) return;

  const results = calculateCombinedProfileResults();
  let html = "";

  // Вступ для різносторонньої характеристики
  if (results.isVersatile) {
    html += `
      <div class="rules-card versatility-card">
        <h2>Ти — різностороння людина!</h2>
        <p>
          Тобі можуть бути цікаві різні сфери діяльності,
          а твої зацікавлення не обмежуються одним напрямом.
          Це чудова нагода пробувати нове, поєднувати різні
          знання та відкривати несподівані можливості.
          Можливо, саме на перетині кількох сфер ти знайдеш
          те, що захопить тебе найбільше!
        </p>
      </div>
    `;
  }

  // Картки рекомендованих профілів
  if (results.recommendedProfiles.length > 0) {
    html += `
      <div class="rules-card characteristic-group">
        <h2>Напрями, які можуть тобі підійти</h2>
    `;

    results.recommendedProfiles.forEach((profile, index) => {
      const data = profileCharacteristics[profile];

      if (!data) return;

      const groupTitle = index === 0
        ? "Твоя основна характеристика"
        : "Твоя додаткова характеристика";

      html += `
        <div class="characteristic-card interest-profile-card">

          <h3 class="interest-group-title">${groupTitle}</h3>

          <div class="characteristic-text">
            <p class="activity-type">
              <span class="highlight-limit">${data.activityType}</span>
            </p>
            <p>${data.activityDescription}</p>
          </div>

          <div class="characteristic-professions">
            <h4>МОЖЛИВІ ПРОФЕСІЇ</h4>
            <div class="profession-tags">
              ${data.professions.map(profession =>
                `<span class="profession-tag">${profession}</span>`
              ).join("")}
            </div>
          </div>

          <p class="profile-invitation">
            <strong>${data.profileInvitation}</strong>
          </p>

          <div class="profile-learning-card">
            <h4><span class="highlight-word">${data.title}</span></h4>
            <p>${data.profileCard}</p>
          </div>

        </div>
      `;
    });

    html += `</div>`;
  }

  resultsContainer.innerHTML = html;
}

// Приховування початкової підказки
function updateWorkspaceHint() {
  const hint = workspace.querySelector(".workspace-hint");

  if (hint) {
    hint.remove();
  }
}
// ========================================
// ДРУГИЙ ЕТАП. ДОСЛІДЖЕННЯ ІНТЕРЕСІВ
// ========================================

// Перемішування тверджень перед початком дослідження
function shuffleInterestStatements() {
  remainingInterestStatements = [...interestStatements];

  for (let i = remainingInterestStatements.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [
      remainingInterestStatements[i],
      remainingInterestStatements[j]
    ] = [
      remainingInterestStatements[j],
      remainingInterestStatements[i]
    ];
  }
}

// Створення кульки з твердженням про інтерес
function createInterestBubble(statement, position) {
  const bubble = document.createElement("button");

  bubble.type = "button";
  bubble.classList.add("interest-bubble");
  bubble.classList.add(`bubble-${position}`);
  bubble.classList.add("bubble-entering");

  bubble.dataset.statementId = statement.id;
  bubble.dataset.position = position;

  bubble.textContent = statement.text;

  bubble.addEventListener("click", () => {
    chooseMoreInteresting(statement);
  });

  return bubble;
}

// Вибір цікавішого твердження
function chooseMoreInteresting(statement) {

  const lessInterestingStatement = currentInterestPair.find(
    item => item.id !== statement.id
  );

  if (!lessInterestingStatement) return;

  const workspace = document.getElementById("bubbleComparison");

  const lessInterestingBubble = workspace.querySelector(
    `[data-statement-id="${lessInterestingStatement.id}"]`
  );

  if (!lessInterestingBubble) return;

  // Запам'ятовуємо позицію кульки, яка лопне
  const freePosition = lessInterestingBubble.dataset.position;

  // Бал отримує обране твердження
  interestScores[statement.profile]++;

  // Тимчасово блокуємо обидві кульки від повторного натискання
  workspace.querySelectorAll(".interest-bubble").forEach(bubble => {
    bubble.disabled = true;
  });

  // Додаємо червоний хрестик
  const cross = document.createElement("span");
  cross.classList.add("bubble-cross");
  cross.textContent = "✕";
  lessInterestingBubble.appendChild(cross);

  // Запускаємо анімацію лопання
  lessInterestingBubble.classList.add("bubble-popping");

  lessInterestingBubble.addEventListener("animationend", () => {

    // Видаляємо кульку після завершення анімації
  lessInterestingBubble.remove();

  // Розблоковуємо обрану кульку для наступного порівняння
  const chosenBubble = workspace.querySelector(
    `[data-statement-id="${statement.id}"]`
  );

  if (chosenBubble) {
    chosenBubble.disabled = false;
  }

  // Обране твердження залишається на екрані
  currentInterestPair = [statement];

    completedInterestComparisons++;

    updateInterestProgress();

    // Додаємо нову кульку на звільнене місце
    addNextInterestBubble(freePosition);

    console.log("Обрана цікавіша кулька:", statement.text);
    console.log("Бали за інтереси:", interestScores);

  }, { once: true });
}

// Відображення пари тверджень для порівняння
function renderInterestPair() {
  const workspace = document.getElementById("bubbleComparison");

  workspace.innerHTML = "";

  currentInterestPair.forEach(statement => {
    const bubble = createInterestBubble(statement);
    workspace.appendChild(bubble);
  });
}

// Додавання наступного твердження на звільнене місце
function addNextInterestBubble(position) {
  const nextStatement = remainingInterestStatements.shift();

  if (!nextStatement) {
    finishInterestTest();
    return;
  }

  currentInterestPair.push(nextStatement);

  const workspace = document.getElementById("bubbleComparison");
  const newBubble = createInterestBubble(nextStatement, position);

  workspace.appendChild(newBubble);
}

// Завершення дослідження інтересів
function finishInterestTest() {
  const progressBar = document.getElementById("interestProgressBar");
  const owlMessage = document.getElementById("interestOwlMessage");
  const finishButton = document.getElementById("readInterestCharacteristicButton");

  progressBar.style.width = "100%";

  owlMessage.textContent =
    "Чудово! Тепер подивімося, які напрями тобі найближчі!";

  finishButton.disabled = false;

  console.log("Дослідження завершено!");
  console.log("Підсумкові бали:", interestScores);
  const combinedResults = calculateCombinedProfileResults();

  console.log("Підрахунок фігур:", combinedResults.shapeCounts);
  console.log("Бонуси за фігури:", combinedResults.geometryBonus);
  console.log("Загальні результати:", combinedResults.combinedScores);
  console.log("Рекомендовані профілі:", combinedResults.recommendedProfiles);
  console.log("Різностороння характеристика:", combinedResults.isVersatile);
  }

// Початок дослідження інтересів
function startInterestTest() {
  // Перемішуємо твердження
  shuffleInterestStatements();

  // Обнуляємо результати попереднього проходження
  Object.keys(interestScores).forEach(profile => {
    interestScores[profile] = 0;
  });

  completedInterestComparisons = 0;
  
  // Беремо перші два твердження для порівняння
  currentInterestPair = remainingInterestStatements.splice(0, 2);

  // Додаємо обидві кульки на робоче поле
  const workspace = document.getElementById("bubbleComparison");
  workspace.innerHTML = "";

  currentInterestPair.forEach((statement, index) => {
    const position = index === 0 ? "left" : "right";
    const bubble = createInterestBubble(statement, position);
    workspace.appendChild(bubble);
  });

  console.log("Перша пара для порівняння:", currentInterestPair);
}

// Оновлення прогресу дослідження інтересів
function updateInterestProgress() {
  const progressBar = document.getElementById("interestProgressBar");
  const owlMessage = document.getElementById("interestOwlMessage");

  const totalComparisons = interestStatements.length - 1;
  const progress = (completedInterestComparisons / totalComparisons) * 100;

  progressBar.style.width = `${progress}%`;

  if (completedInterestComparisons === 5) {
    owlMessage.textContent =
      "Цікаво! Ми вже відкрили чимало твоїх зацікавлень 🔎";
  } else if (completedInterestComparisons === 12) {
    owlMessage.textContent =
      "Ще трохи — і побачимо, що цікавого підказав твій вибір!";
  } else if (completedInterestComparisons === 16) {
    owlMessage.textContent =
      "Фініш уже близько! Зробімо останній вибір?";
  } else if (completedInterestComparisons === totalComparisons) {
    owlMessage.textContent =
      "Чудово! Тепер подивімося, які напрями тобі найближчі!";
  }
}
// Оцінювання дослідження зірочками
const ratingStars = document.querySelectorAll(".rating-star");

ratingStars.forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = Number(star.dataset.rating);

    ratingStars.forEach(item => {
      const rating = Number(item.dataset.rating);

      item.classList.toggle("selected", rating <= selectedRating);
      item.setAttribute(
        "aria-pressed",
        rating <= selectedRating ? "true" : "false"
      );
    });
  });
});
// Експорт готового персонажа у PNG
function downloadCharacterPNG(onReady = null) {

  // Оновлюємо дані перед експортом
  saveCharacterData();

  if (savedCharacterData.length === 0) {
    alert("Спочатку створи свого персонажа!");
    return;
  }

  const padding = 30;

  // Визначаємо межі персонажа з урахуванням поворотів
  const bounds = savedCharacterData.map(item => {
    const angle = (item.rotation || 0) * Math.PI / 180;

    const rotatedWidth =
      Math.abs(item.width * Math.cos(angle)) +
      Math.abs(item.height * Math.sin(angle));

    const rotatedHeight =
      Math.abs(item.width * Math.sin(angle)) +
      Math.abs(item.height * Math.cos(angle));

    return {
      left: item.x - rotatedWidth / 2,
      right: item.x + rotatedWidth / 2,
      top: item.y - rotatedHeight / 2,
      bottom: item.y + rotatedHeight / 2
    };
  });

  const minX = Math.min(...bounds.map(item => item.left));
  const maxX = Math.max(...bounds.map(item => item.right));
  const minY = Math.min(...bounds.map(item => item.top));
  const maxY = Math.max(...bounds.map(item => item.bottom));

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  // Формуємо SVG
  const shapesSVG = savedCharacterData.map(item => {

    const x = item.x - minX + padding;
    const y = item.y - minY + padding;

    const w = item.width;
    const h = item.height;

    let shapeSVG = "";

    switch (item.shape) {

      case "circle":
        shapeSVG = `
          <ellipse
            cx="0" cy="0"
            rx="${w / 2}" ry="${h / 2}"
            fill="${item.color}"
          />
        `;
        break;

      case "square":
        shapeSVG = `
          <rect
            x="${-w / 2}" y="${-h / 2}"
            width="${w}" height="${h}"
            rx="3"
            fill="${item.color}"
          />
        `;
        break;

      case "rectangle":
        shapeSVG = `
          <rect
            x="${-w / 2}" y="${-h / 2}"
            width="${w}" height="${h}"
            rx="3"
            fill="${item.color}"
          />
        `;
        break;

      case "triangle":
        shapeSVG = `
          <polygon
            points="
              0,${-h / 2}
              ${-w / 2},${h / 2}
              ${w / 2},${h / 2}
            "
            fill="${item.color}"
          />
        `;
        break;

      case "zigzag":
        shapeSVG = `
          <polygon
            points="
              ${-w / 2},${-h * 0.4}
              ${-w * 0.25},${h * 0.05}
              0,${-h * 0.4}
              ${w * 0.25},${h * 0.05}
              ${w / 2},${-h * 0.4}
              ${w / 2},${-h * 0.1}
              ${w * 0.25},${h * 0.4}
              0,${-h * 0.1}
              ${-w * 0.25},${h * 0.4}
              ${-w / 2},${-h * 0.1}
            "
            fill="${item.color}"
          />
        `;
        break;
    }

    return `
      <g transform="translate(${x}, ${y}) rotate(${item.rotation || 0})">
        ${shapeSVG}
      </g>
    `;

  }).join("");

  const svg = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${width * 2}"
    height="${height * 2}"
    viewBox="0 0 ${width} ${height}"
  >
    <rect
      x="0"
      y="0"
      width="${width}"
      height="${height}"
      fill="#E6F7F2"
    />
    ${shapesSVG}
  </svg>
`;

  // Перетворюємо SVG на PNG
  const svgBlob = new Blob([svg], {
    type: "image/svg+xml;charset=utf-8"
  });
  console.log("SVG для PNG:", svg);

  const svgURL = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {

    const canvas = document.createElement("canvas");

    canvas.width = width * 2;
    canvas.height = height * 2;

    const context = canvas.getContext("2d");

    context.drawImage(image, 0, 0);

    URL.revokeObjectURL(svgURL);

    canvas.toBlob(blob => {

      if (!blob) {
        alert("Не вдалося створити зображення.");
        return;
      }

      if (onReady) {
        onReady(blob);
        return;
      }

      const pngURL = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = pngURL;
      link.download = "Мій_персонаж.png";

      link.click();

      URL.revokeObjectURL(pngURL);

    }, "image/png");
  };

  image.onerror = () => {
    URL.revokeObjectURL(svgURL);
    alert("Не вдалося підготувати зображення персонажа.");
  };

  image.src = svgURL;
}

// Перетворення PNG-зображення у формат Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsDataURL(blob);
  });
}

// Перевірка передавання PNG до Google Apps Script
function testCharacterImageForPDF() {
  downloadCharacterPNG(async blob => {
    try {
      const base64 = await blobToBase64(blob);

      const payload = {
        imageBase64: base64,

        shapeHTML: document.getElementById("shapeCharacteristicResults").innerHTML,
        colorHTML: document.getElementById("colorCharacteristicResults").innerHTML,
        interestHTML: document.getElementById("interestCharacteristicResults").innerHTML
      };

      const formData = new URLSearchParams();
      formData.append("payload", JSON.stringify(payload));

      const response = await fetch("https://script.google.com/macros/s/AKfycbyYBGkLA7IPaOoYXM0pklSGkflKIiWs5hyvNmCEV3lhJAJQBdWejWKfgQYVA-rBVzLR/exec", {
        method: "POST",
        mode: "no-cors",
        body: formData
      });

      console.log("Запит на передавання PNG відправлено.");
      console.log("Режим відповіді:", response.type);

    } catch (error) {
      console.error("Помилка передавання PNG:", error);
    }
  });
}

// Надсилання результатів профорієнтаційного дослідження
document.getElementById("sendResultsButton").addEventListener("click", () => {

  const email = document.getElementById("studentEmail").value.trim();
  const button = document.getElementById("sendResultsButton");
  const originalButtonText = button.textContent;

  // Перевірка адреси електронної пошти
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Будь ласка, введи коректну адресу електронної пошти.");
    return;
  }

  if (!currentPassageId) {
    console.error("Не знайдено ID поточного проходження.");
    return;
  }

  // Блокуємо кнопку на час надсилання
  button.disabled = true;
  button.textContent = "Надсилаємо результати...";

  const emailRequestAt = new Date().toISOString();

  const results = calculateCombinedProfileResults();

  const profileNames = results.recommendedProfiles
    .map(profile => profileCharacteristics[profile]?.title)
    .filter(Boolean);
  const profileKeys = results.recommendedProfiles;

  // Формування зображення та передавання результатів
  downloadCharacterPNG(async blob => {

    try {
      const base64 = await blobToBase64(blob);

      const payload = {
        email: email,
        passageId: currentPassageId,
        completedAt: new Date().toISOString(),
        emailRequestAt: emailRequestAt,
        rating: selectedRating,
        mainProfiles: profileNames.slice(0, 1),
        additionalProfiles: profileNames.slice(1),
        mainProfileKeys: profileKeys.slice(0, 1),
        additionalProfileKeys: profileKeys.slice(1),
        lastStage: "Результати переглянуто",

        imageBase64: base64,
        shapeHTML: document.getElementById("shapeCharacteristicResults").innerHTML,
        colorHTML: document.getElementById("colorCharacteristicResults").innerHTML,
        interestHTML: document.getElementById("interestCharacteristicResults").innerHTML
      };

      const formData = new URLSearchParams();
      formData.append("payload", JSON.stringify(payload));

      await fetch(analyticsUrl, {
        method: "POST",
        mode: "no-cors",
        body: formData
      });

      console.log("Запит на надсилання результатів передано.");

      // Перехід до фінального екрана
      document.getElementById("emailScreen").classList.remove("active");
      document.getElementById("farewellScreen").classList.add("active");
      playScreenTransitionSound();

    } catch (error) {
      console.error("Помилка передавання результатів:", error);
      alert("Не вдалося передати результати. Спробуй ще раз.");

      // Повертаємо кнопку до початкового стану
      button.disabled = false;
      button.textContent = originalButtonText;
    }

  });
});

// Збереження зображення персонажа
document.getElementById("saveCharacterButton").addEventListener("click", () => {
  downloadCharacterPNG();
});

// Збереження першої характеристики у PDF
function downloadFirstCharacteristicPDF() {
  const shapeResults = document.getElementById("shapeCharacteristicResults");
  const colorResults = document.getElementById("colorCharacteristicResults");
  const note = [...document.querySelectorAll(".note-card.compact-note")]
  .find(el => el.textContent.includes("Це не психологічний тест"));

  if (!shapeResults || !colorResults ||
      (!shapeResults.innerHTML.trim() && !colorResults.innerHTML.trim())) {
    alert("Спочатку сформуй характеристику персонажа!");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Дозволь відкривати спливаючі вікна для збереження PDF.");
    return;
  }

  const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map(link => `<link rel="stylesheet" href="${link.href}">`)
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="uk">
    <head>
      <meta charset="UTF-8">
      <title>Моя перша характеристика</title>
      ${stylesheets}
      <style>
        body {
          background: white;
          color: #263238;
          padding: 30px;
        }

        .lyceum-name {
          margin-bottom: 14px;
        }

        .pdf-header {
          text-align: center;
          margin-bottom: 30px;
          margin-top: 8px;
        }

        .pdf-header h1 {
          color: #263238;
          font-size: 26px;
        }

        .pdf-section {
          margin-bottom: 20px;
          break-inside: auto;
        }
        
        .print-button {
          display: block;
          margin: 0 auto 24px;
          padding: 12px 22px;
          border: none;
          border-radius: 12px;
          background: #FF6600;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .print-button:hover {
          background: #e65c00;
        }

        .print-button {
          display: block;
          margin: 0 auto 24px;
          padding: 12px 22px;
          border: none;
          border-radius: 12px;
          background: #FF6600;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .print-button:hover {
          background: #e65c00;
        }

                .pdf-social-links {
          margin-top: 28px;
          padding-top: 12px;
          border-top: 1px solid #D5E4DF;
          text-align: center;
          font-size: 10px;
          line-height: 1.8;
          color: #607D76;
        }

        .pdf-social-links a {
          color: #4682B4;
          text-decoration: underline;
        }

       @media print {
          body {
            padding: 0;
            .print-instruction-note {
              display: none !important;
          }
                    
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          button {
            display: none !important;
          }  
         
        }
      </style>
    </head>
    <body>

      <button class="print-button" onclick="window.print()">
        Зберегти як PDF
      </button>

      <div class="note-card compact-note print-instruction-note">
        <span class="note-icon">💡</span>
        <p>
          Після натискання «Зберегти як PDF» відкриється системне вікно друку браузера.
          Якщо інтерактив тимчасово не реагує, закрий це вікно та повернися до вкладки
          з дослідженням. Твій результат збережеться.
        </p>
      </div>

      <header class="pdf-header">
        <div class="lyceum-name">
          Херсонський академічний ліцей<br>
          імені О. В. Мішукова
        </div>
        <h1>Моя характеристика</h1>
        <p>Перший етап дослідження</p>
      </header>

      <section class="pdf-section">
        ${shapeResults.innerHTML}
      </section>

      <section class="pdf-section">
        ${colorResults.innerHTML}
      </section> 

      <section class="pdf-section">
        ${note ? note.outerHTML : ""}
      </section>

      <footer class="pdf-social-links">
        Херсонський академічний ліцей імені О.В. Мішукова<br>
        <a href="https://new.lyceum.com.ua/" target="_blank">Сайт</a> ·
        <a href="https://t.me/khersonacademlyceum" target="_blank">Telegram</a> ·
        <a href="https://www.facebook.com/academlyceumkherson?locale=uk_UA" target="_blank">Facebook</a> ·
        <a href="https://www.youtube.com/channel/UCIpGgn74OZSR83znKDsmeSA" target="_blank">YouTube</a> ·
        <a href="https://www.tiktok.com/@academ_lyceum" target="_blank">TikTok</a> ·
        <a href="https://www.instagram.com/academyclyceum/" target="_blank">Instagram</a>
      </footer>

    </body>
    </html>
  `);

  printWindow.document.close();
  
}

// Збереження першої характеристики
document.getElementById("saveCharacteristicButton").addEventListener("click", () => {
  downloadFirstCharacteristicPDF();
});

// Збереження другої характеристики у PDF
function downloadSecondCharacteristicPDF() {
  const results = document.getElementById("interestCharacteristicResults");
  const note = [...document.querySelectorAll(".note-card.compact-note")]
  .find(el => el.textContent.includes("Це не остаточний вибір майбутньої професії"));

  if (!results || !results.innerHTML.trim()) {
    alert("Спочатку сформуй характеристику інтересів!");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Дозволь відкривати спливаючі вікна для збереження PDF.");
    return;
  }

  const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map(link => `<link rel="stylesheet" href="${link.href}">`)
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="uk">
    <head>
      <meta charset="UTF-8">
      <title>Моя характеристика інтересів</title>
      ${stylesheets}
      <style>
        body {
          background: white;
          color: #263238;
          padding: 30px;
        }
        
        .lyceum-name {
          margin-bottom: 14px;
        }

        .pdf-header {
          text-align: center;
          margin-bottom: 30px;
          margin-top: 8px;
        }

        .pdf-header h1 {
          color: #263238;
          font-size: 26px;
        }
        
        .print-button {
          display: block;
          margin: 0 auto 24px;
          padding: 12px 22px;
          border: none;
          border-radius: 12px;
          background: #FF6600;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .print-button:hover {
          background: #e65c00;
        }

                .pdf-social-links {
          margin-top: 28px;
          padding-top: 12px;
          border-top: 1px solid #D5E4DF;
          text-align: center;
          font-size: 10px;
          line-height: 1.8;
          color: #607D76;
        }

        .pdf-social-links a {
          color: #4682B4;
          text-decoration: underline;
        }

        @media print {
          body {
            padding: 0;
            .print-instruction-note {
              display: none !important;
          }
                    
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          button {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      
    <button class="print-button" onclick="window.print()">
      Зберегти як PDF
    </button>

    <div class="note-card compact-note print-instruction-note">
      <span class="note-icon">💡</span>
      <p>
        Після натискання «Зберегти як PDF» відкриється системне вікно друку браузера.
        Якщо інтерактив тимчасово не реагує, закрий це вікно та повернися до вкладки
        з дослідженням. Твій результат збережеться.
      </p>
    </div>

    <header class="pdf-header">
        <div class="lyceum-name">
          Херсонський академічний ліцей<br>
          імені О. В. Мішукова
        </div>
        <h1>Моя характеристика інтересів</h1>
        <p>Другий етап дослідження</p>
      </header>

      ${results.innerHTML}

      <section class="pdf-section">
        ${note ? note.outerHTML : ""}
      </section>

      <footer class="pdf-social-links">
        Херсонський академічний ліцей імені О.В. Мішукова<br>
        <a href="https://new.lyceum.com.ua/" target="_blank">Сайт</a> ·
        <a href="https://t.me/khersonacademlyceum" target="_blank">Telegram</a> ·
        <a href="https://www.facebook.com/academlyceumkherson?locale=uk_UA" target="_blank">Facebook</a> ·
        <a href="https://www.youtube.com/channel/UCIpGgn74OZSR83znKDsmeSA" target="_blank">YouTube</a> ·
        <a href="https://www.tiktok.com/@academ_lyceum" target="_blank">TikTok</a> ·
        <a href="https://www.instagram.com/academyclyceum/" target="_blank">Instagram</a>
      </footer>

    </body>
    </html>
  `);

    printWindow.document.close();
  }
// Збереження другої характеристики
document.getElementById("saveInterestCharacteristicButton").addEventListener("click", () => {
  downloadSecondCharacteristicPDF();
});