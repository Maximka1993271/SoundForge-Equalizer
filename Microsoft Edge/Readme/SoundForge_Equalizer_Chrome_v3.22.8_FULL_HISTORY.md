# SoundForge Equalizer v3.22.8 — Chrome
## Единая полная история проекта, аудита, исправлений, регрессий и финальной стабилизации

**Проект:** SoundForge Equalizer  
**Платформа:** Google Chrome / Chromium / MV3  
**Версия:** 3.22.8  
**Документ:** Единая история разработки и исправлений для Chrome  
**Дата консолидации:** 2026-07-31  
**Автор проекта:** Maxim Melnikov

---

# 1. Назначение документа

Этот файл объединяет в одном месте всю историю работы над Chrome-версией SoundForge Equalizer, которая была проведена в рамках последовательного аудита, исправлений, runtime-отладки, регрессионных исправлений и финальной стандартизации проекта.

Документ охватывает:

- исходный архитектурный аудит;
- найденные критические проблемы;
- исправления Storage;
- Runtime Messaging;
- Multi-Tab;
- MV3 lifecycle;
- Web Audio;
- EQ;
- Bass Boost;
- Volume 0–800%;
- Hard Mute;
- True Limiter;
- Visualization;
- Presets;
- Popup;
- Separate Window;
- A/B Compare;
- Effects;
- Hotkeys;
- Site Settings;
- Memory Cleanup;
- Security;
- Performance;
- регрессии, возникшие после исправлений;
- повторные исправления этих регрессий;
- финальную унификацию 50 пресетов;
- текущую архитектуру и остаточные риски.

Документ является историей изменений, а не утверждением, что все runtime-сценарии были полноценно протестированы в реальном Chrome во всех возможных окружениях.

---

# 2. Исходное состояние проекта

На момент первоначального аудита проект представлял собой полноценное Chrome Extension Manifest V3 с:

- `background.js`;
- `inject.js`;
- `popup.js`;
- `window.js`;
- `manifest.json`;
- `popup.html`;
- `window.html`;
- CSS;
- модульной структурой `modules/*`;
- функциональными модулями `features/*`;
- 50 встроенными пресетами;
- 10-полосным EQ;
- Bass Boost;
- Volume Boost;
- Visualization;
- History;
- Statistics;
- Site Settings;
- User Presets;
- отдельным окном управления.

Основной runtime-путь:

```text
Popup / Window
    ↓
Background Service Worker
    ↓
Target Tab
    ↓
inject.js
    ↓
Web Audio API
    ↓
Audio Graph
    ↓
Output
```

---

# 3. Первый глубокий аудит

Первичный аудит выявил, что проект функционально масштабный, но имел несколько архитектурных слоёв разных поколений.

Основные проблемы:

- несколько источников состояния;
- несколько storage-механизмов;
- конкурирующие записи;
- risk of lost updates;
- глобальное состояние в background;
- недостаточная изоляция вкладок;
- stale injection после navigation;
- повторная инъекция;
- lifecycle-проблемы Web Audio;
- проблемы cleanup;
- неидеальный runtime messaging;
- рассинхронизация Popup и Window;
- части legacy modules;
- проблемы с реальным audio pipeline;
- визуализация, способная показывать активность без реального сигнала;
- слабая обработка reconnect;
- несогласованность manifest/resource references.

Был выбран принцип дальнейшей работы:

```text
Сначала понять
→ затем изменить
→ затем проверить
→ затем перейти дальше
```

Без Big Bang Rewrite.

---

# 4. Storage и защита от Race Conditions

## Исходные проблемы

Были обнаружены:

- race conditions;
- lost updates;
- конкурентные записи;
- Popup и Window могли писать устаревшие snapshot;
- reset мог очистить всё `chrome.storage.local`;
- пользовательские пресеты могли конфликтовать;
- site settings могли теряться.

## Исправления

Введена сериализация операций через Background.

Основные механизмы:

```text
enqueueStorageMutation()
enqueueStoragePatch()
enqueueUserPresetsMutation()
```

Основные принципы:

- изменяются только нужные поля;
- применяется patch-merge;
- операции идут последовательно;
- устаревшие snapshot не перезаписывают новые значения;
- Popup и Window используют общий storage-flow;
- пользовательские пресеты сохраняются централизованно.

Reset был изменён так, чтобы удалять только SoundForge keys.

Также была добавлена санитизация:

```text
sanitizeImportedSettings()
sanitizeUserPresets()
sanitizeGains()
sanitizeSiteSettings()
```

## Результат

Проверялись:

- быстрые конкурентные записи;
- backup preservation;
- stale-cache;
- cross-context patch merge;
- импорт настроек.

Результаты статических/изолированных проверок:

```text
Storage race test             PASS
Backup preservation           PASS
Cross-context patch merge     PASS
Import sanitizer              PASS
```

---

# 5. Runtime Messaging

## Исходные проблемы

Обнаружены:

- stale state propagation;
- ложный `connected`;
- сообщения между Popup/Window/Background могли теряться;
- состояние могло приходить от другой вкладки;
- Window не всегда мог корректно подключиться;
- `getStatus` использовался не всегда согласованно.

## Исправления

Введены/использованы:

```text
sendMessageToInject()
doSendMessageToInject()
isInjectLoaded()
checkRealConnectionStatus()
SF_PING
```

Connection state теперь разделён на:

```text
connecting
connected
disconnected
error
```

Подключение не считается успешным только потому, что сообщение отправлено.

Успех должен подтверждаться реальным ответом от `inject.js`.

---

# 6. Multi-Tab / Per-Tab State

## Исходная проблема

Ранее проект имел глобальную модель состояния подключения, что было опасно при:

- YouTube в одной вкладке;
- Spotify в другой;
- Popup;
- Window;
- переключении активных вкладок.

## Исправление

Введена модель:

```text
_tabSessions
```

Основные функции:

```text
getTabSession()
invalidateTabRuntime()
markTabInjected()
restorePersistedConnection()
```

Дополнительно:

- состояние удаляется при `tabs.onRemoved`;
- navigation инвалидирует runtime;
- reconnect должен быть привязан к конкретному tabId;
- восстановление состояния после Service Worker restart выполняется по целевой вкладке.

---

# 7. Navigation / SPA / Reinjection

## Исходные проблемы

- stale injection;
- reconnect после YouTube SPA;
- повторные попытки внедрения;
- зависшие injection attempts;
- работа с недоступными страницами.

## Исправления

Добавлены:

```text
invalidateTabRuntime()
injectScriptDirectly()
doInjectScriptDirectly()
canInjectScript()
canSendMessage()
```

Применяются:

- ограничение retries;
- cooldown;
- navigation invalidation;
- reinjection;
- проверка наличия `inject.js`.

---

# 8. Web Audio — первоначальное исправление

Первоначально были обнаружены:

- Analyzer до DSP;
- fake/random visualization;
- hardcoded sampleRate;
- некорректный compressor access;
- lifecycle leaks;
- проблемы восстановления AudioContext.

## Исправления

Добавлены:

```text
validateAudioChain()
recreateAudioChain()
restoreAudioContext()
fullCleanup()
```

Основная цепочка была приведена к реальной обработке сигнала.

---

# 9. Важная регрессия: звук пропадал при подключении

В одной из промежуточных сборок был случайно удалён критический connection:

```text
source → gainNode
```

Получалось:

```text
Media Source
    ↓
создан
    X
    не подключён

DSP chain
    ↓
destination
```

При подключении звук пропадал.

## Исправление

Возвращено:

```text
source.connect(gainNode)
```

После этого цепочка снова стала непрерывной.

---

# 10. Volume 0–800%

Первоначально громкость была реализована через GainNode.

Диапазон:

```text
0% — 800%
```

Однако была обнаружена критическая архитектурная проблема.

Часть media elements могла быть размьючена во время применения громкости, из-за чего существовал обходной native audio path.

Получалось:

```text
Original Media
    ↓
Native Audio
    ↓
Output

SoundForge Audio Graph
    ↓
Output
```

Из-за этого регулятор мог менять обработанный сигнал, но параллельно звучал оригинальный.

## Исправление

Принят принцип:

```text
Native Media остаётся muted
пока SoundForge подключён
```

А реальная громкость контролируется Master Gain.

---

# 11. 0% — абсолютная тишина

После этого появилась следующая проблема: VOT и другие инструменты могли использовать свои AudioContext.

То есть:

```text
SoundForge Gain = 0
```

не гарантировал:

```text
Tab Audio = 0
```

## Дополнительное решение

Введён механизм:

```text
setTabVolumeMute()
```

Идея:

```text
Volume = 0
    ↓
SoundForge Graph = 0
    +
Tab = muted
```

При возврате выше 0%:

```text
Tab = previous muted state
```

восстанавливается.

Это стало отдельным уровнем hard mute для всего Tab.

---

# 12. Дополнительное окно — первая проблема подключения

В отдельном окне возникала ошибка runtime messaging:

```text
api.runtime.sendMessage(...) is undefined
```

и затем:

```text
can't access property "then"
```

## Причина

Window предполагал Promise API, а выбранный API-режим возвращал callback-style/undefined.

## Исправление

Введён совместимый bridge:

```text
sendMessageAsync()
```

Window получил совместимую работу через:

- Firefox browser API;
- Chrome fallback.

---

# 13. Дополнительное окно — проблема подключения после Window Connect Fix

Следующая проблема была более глубокая.

Window отправлял:

```text
connect
```

Background находил правильную вкладку:

```text
tabId = 2070162517
```

Но Window получал:

```text
statusUpdate: connecting
```

и игнорировал его как событие другой вкладки.

Затем:

```text
Окно НЕ подключено (таймаут)
```

## Причина

Window использовал неправильную модель фильтрации `statusUpdate`.

## Исправление

Введён:

```text
targetTabId
```

Window теперь:

- отслеживает targetTabId;
- принимает ответ от Background;
- принимает immediate `connected`;
- принимает `statusUpdate` только для нужного targetTabId;
- fallback-check использует тот же targetTabId.

---

# 14. Кнопка эффектов в Window

Была обнаружена проблема, что эффект в Window не переключался.

После анализа выяснилось, что runtime-путь должен быть:

```text
click
→ cycleEffectInWindow()
→ change current effect
→ save effect
→ update button
→ renderEffectInWindow()
```

В финальной архитектуре Window должен:

- переключать Spectrum;
- Waves;
- Fire;
- Neon;
- сохранять состояние;
- обновлять UI;
- не отправлять повторный apply preset.

---

# 15. A/B Compare

Проводилась работа над A/B Compare.

Изначально существовала только частичная логика:

```text
Save A
→ toggle mode
```

Настоящего переключения A/B не было.

Была добавлена модель:

```text
A
↕
B
```

Сохраняются:

- 10 EQ gains;
- Bass;
- Volume.

Предусмотрена логика:

```text
Первое нажатие → сохранить A
Изменить настройки
Второе нажатие → сохранить B / вернуться к A
Следующие → A ↔ B
```

---

# 16. Новая DSP-архитектура

Для улучшения качества громкости и защиты от клиппинга предложено и внедрено перестроение цепочки.

Новая логика:

```text
Media Source
    ↓
Bass Boost
    ↓
10 × EQ
    ↓
Dynamics Compressor
    ↓
Master Gain
    ↓
Hard Mute
    ↓
Safety Limiter
    ↓
Fade Gain
    ↓
Analyser
    ↓
Output
```

## Причина

Master Gain после Compressor позволяет:

- Compressor работать на обработанном EQ/Bass сигнале;
- 100% быть базовым уровнем;
- 200–800% реально увеличивать финальную громкость;
- Limiter защищать итоговый output.

## Safety Limiter

Использован `DynamicsCompressorNode` как safety limiter.

Он:

- включён в runtime graph;
- валидируется;
- очищается в `fullCleanup()`.

---

# 17. Пресеты — первая проблема

При переходе на атомарное применение пресета возникла критическая регрессия.

Поток был:

```text
Popup
→ applyPreset
→ Background
→ SF_APPLY_PRESET
→ presetChanged
→ Popup
→ applyPreset
→ Background
→ ...
```

Получился бесконечный feedback loop.

В логах один и тот же пресет:

```text
logitech
```

применялся десятки/сотни раз подряд.

Параллельно многократно появлялось:

```text
Звук восстановлен: 30%
```

Это вызывало:

- глюки;
- тормоза;
- повторные изменения состояния;
- рассинхронизацию;
- нагрузку на аудиограф.

---

# 18. Исправление Preset Feedback Loop

Архитектура была разделена:

## Команда

```text
applyPreset
```

изменяет аудиодвижок.

## Событие

```text
presetChanged
```

только синхронизирует UI.

Теперь:

```text
Popup / Window
    ↓
1 × applyPreset
    ↓
Background
    ↓
1 × SF_APPLY_PRESET
    ↓
Audio Engine
    ↓
1 × presetChanged
    ↓
UI sync only
```

`presetChanged` больше не должен повторно вызывать `applyPreset`.

---

# 19. Финальная стандартизация пресетов

Последним этапом была проведена полная унификация пресетов для Chrome.

Требования:

```text
50 встроенных пресетов
Volume = 100% для всех
Индивидуальный Bass Boost
10 EQ bands
Одинаковый порядок
Popup = Window
```

## Проблема

В Popup порядок брался из `modules/config.js`.

В Window использовался отдельный массив в другом порядке.

Поэтому:

```text
Preset #1 в Popup
≠
Preset #1 в Window
```

## Финальное решение

Введён канонический порядок:

```text
PRESET_ORDER
```

Window теперь должен использовать тот же порядок, что и Popup.

Результат проверки:

```text
Config presets: 50
Window presets: 50
Same order: PASS
Same values: PASS
Volume 100%: PASS
Bass defined: PASS
10 EQ bands: PASS
```

---

# 20. Финальная модель пресетов

Каждый из 50 пресетов должен содержать:

```text
name
id
category
10 × EQ gain
bass
volume = 100
```

Bass Boost индивидуальный.

Volume:

```text
100%
```

для каждого встроенного пресета.

Порядок одинаковый:

```text
Popup
=
Window
=
Canonical preset order
```

---

# 21. История ключевых регрессий

В ходе работы были обнаружены и исправлены следующие регрессии:

## Регрессия 1
`saveSettings is not defined`

Причина:
нехватка runtime зависимости в inject.

Исправлено.

## Регрессия 2
`getSiteDomain is not defined`

Причина:
потерянная функция в background.

Исправлено.

## Регрессия 3
Звук пропадал при Connect.

Причина:
`source` не был подключён к audio chain.

Исправлено.

## Регрессия 4
Volume не работал.

Причина:
native media path обходил SoundForge Gain.

Исправлено.

## Регрессия 5
0% не гарантировал абсолютную тишину.

Причина:
другие AudioContext/Tab audio sources.

Исправлено концептуально через Tab mute.

## Регрессия 6
Window не подключался.

Причина:
Window игнорировал статус другой модели tab routing.

Исправлено через targetTabId.

## Регрессия 7
Окно ожидало статус даже при прямом `connected`.

Исправлено обработкой immediate response.

## Регрессия 8
Смена пресета отключала/ломала состояние.

Причина:
несколько независимых команд и гонки.

Исправлено атомарным preset flow.

## Регрессия 9
Пресет применялся бесконечно.

Причина:
feedback loop `applyPreset ↔ presetChanged`.

Исправлено разделением command/event.

## Регрессия 10
Popup и Window показывали пресеты в разном порядке.

Исправлено через канонический `PRESET_ORDER`.

---

# 22. Структура Chrome Runtime после всех этапов

Целевая модель:

```text
Popup
  │
  ├── settings
  ├── presets
  ├── effects
  └── A/B
        │
        ▼
Background Service Worker
        │
        ├── Storage serialization
        ├── Per-tab state
        ├── Target Tab routing
        ├── Preset apply
        ├── Window routing
        └── Hard mute
        │
        ▼
Target Tab
        │
        ▼
inject.js
        │
        ▼
Web Audio Graph
        │
        ├── Bass
        ├── EQ ×10
        ├── Compressor
        ├── Master Gain
        ├── Hard Mute
        ├── Limiter
        ├── Fade
        └── Analyser
        │
        ▼
Output
```

---

# 23. Popup и Window — единая логика

Оба интерфейса должны работать через:

```text
Background
    ↓
Target Tab
```

Они не должны напрямую создавать или уничтожать основной audio graph.

Popup:

```text
UI
→ Background
→ Target Tab
```

Window:

```text
UI
→ Background
→ Target Tab
```

Это позволяет:

- не иметь два AudioContext;
- не иметь два EQ;
- не создавать дубликаты;
- сохранять состояние подключения.

---

# 24. Проверки, выполненные за всю историю

## Syntax

```text
JavaScript files
PASS
```

## Manifest

```text
Manifest references
PASS
```

## Imports

```text
Local imports
PASS
```

## Storage

```text
Storage race
PASS

Backup preservation
PASS

Cross-context merge
PASS

Import sanitizer
PASS
```

## Integrity

```text
ZIP CRC
PASS
```

## Presets

```text
50 Popup
50 Window
Same order
PASS

Same values
PASS

Volume 100%
PASS

Bass defined
PASS

10 EQ bands
PASS
```

---

# 25. Что было целью всех изменений

Финальная цель Chrome-версии:

```text
Stable
Predictable
Per-tab
No data loss
No audio graph duplication
No preset loops
No disconnect on preset change
0% = true mute
100% = unity
800% = controlled boost
Limiter = protection
Popup = Window parity
```

---

# 26. Текущий рекомендуемый порядок дальнейшего тестирования

## Test 1 — Connect

```text
Open YouTube
→ Connect
→ Status = Connected
→ Sound continues
```

## Test 2 — Volume

```text
100%
→ 50%
→ 0%
→ 5%
→ 100%
→ 800%
```

## Test 3 — Presets

```text
Preset 1
→ Preset 2
→ Preset 3
→ Preset 4
```

Проверять:

- нет disconnect;
- нет повторного цикла;
- звук не пропадает;
- статус остаётся connected.

## Test 4 — Popup / Window

```text
Popup preset
↕
Window preset
```

Проверить:

- одинаковый preset;
- одинаковая EQ;
- Bass;
- Volume = 100%.

## Test 5 — A/B

```text
A
→ modify
→ B
→ A
```

## Test 6 — Multi-tab

```text
Tab A = YouTube
Tab B = Spotify

Popup operates on A
Window operates on A
Tab B remains isolated
```

## Test 7 — Navigation

```text
YouTube video A
→ YouTube video B
→ SPA navigation
```

Проверить:

- no stale injection;
- no duplicate AudioContext.

---

# 27. Важные технические выводы

Главный урок всех исправлений:

Не считать функцию реализованной только потому, что:

- кнопка нажимается;
- state меняется;
- console.log появился;
- storage записался.

Проверять нужно полный путь:

```text
UI
→ Message
→ Background
→ Target Tab
→ inject.js
→ Audio Engine
→ Real Audio Result
```

И отдельно:

```text
Command
≠
Event
```

Например:

```text
applyPreset
```

должен изменять состояние.

А:

```text
presetChanged
```

должен только уведомлять UI.

Смешивание этих двух ролей было причиной одной из самых тяжёлых регрессий.

---

# 28. Финальная архитектурная оценка Chrome

| Область | Оценка |
|---|---:|
| UI/UX | 9/10 |
| EQ architecture | 8/10 |
| Web Audio | 8/10 |
| Storage | 8.5/10 |
| Multi-tab | 8/10 |
| Runtime Messaging | 8/10 |
| Visualization | 8.5/10 |
| Presets | 9/10 |
| Window | 8/10 |
| Maintainability | 6.5/10 |
| Architectural cleanliness | 6.5/10 |
| Production readiness | 8/10 |

Оценки являются инженерной оценкой по проведённым анализам и не заменяют полноценное E2E-тестирование на чистой Chrome-профильной среде.

---

# 29. Финальное состояние пресетов

На последнем этапе система приведена к модели:

```text
50 presets
+
50 presets
=
один канонический набор
```

Для каждого:

```text
Volume = 100%
Bass = индивидуальный
EQ = 10 bands
Order = canonical
Popup = Window
```

Это является последней согласованной конфигурацией Chrome-пресетов.

---

# 30. Итог

SoundForge Equalizer v3.22.8 для Chrome прошёл несколько последовательных циклов:

```text
Initial Audit
    ↓
Storage Fix
    ↓
Runtime Messaging Fix
    ↓
Multi-tab Fix
    ↓
Injection/Lifecycle Fix
    ↓
Web Audio Fix
    ↓
Volume Fix
    ↓
0% Hard Mute
    ↓
Window Connect Fix
    ↓
DSP Upgrade
    ↓
A/B Compare
    ↓
Atomic Preset Flow
    ↓
Preset Feedback Loop Fix
    ↓
Canonical 50 Presets
```

В результате проект был существенно укреплён по направлениям:

- storage consistency;
- runtime messaging;
- per-tab state;
- Web Audio;
- audio lifecycle;
- volume control;
- hard mute;
- limiter;
- visualization;
- presets;
- popup/window parity;
- A/B Compare;
- multi-tab routing.

Главные оставшиеся области для будущего production-hardening:

1. полноценное E2E-тестирование на чистом Chrome profile;
2. автоматические regression tests;
3. реальное multi-tab тестирование;
4. тестирование service worker restart;
5. тестирование YouTube/Spotify SPA navigation;
6. полная консолидация legacy modules;
7. устранение дублей логики между `background.js` и `features/*`;
8. финальная проверка Chrome Web Store;
9. отдельная проверка clipping/headroom на экстремальных значениях;
10. проверка реального A/B поведения в браузере.

---

# 31. Источники истории

История собрана из:

- последовательных аудитов проекта;
- runtime-логов;
- исправленных архивов;
- отчётов по патчам;
- документации проекта;
- сообщений об исправлениях;
- новых функций;
- регрессионных логов;
- финальной стандартизации пресетов.

Документ предназначен как единая техническая история Chrome-ветки SoundForge Equalizer v3.22.8.

---

**© 2026 Maxim Melnikov**  
**SoundForge Equalizer — Chrome / Chromium MV3**  
**Version 3.22.8**
