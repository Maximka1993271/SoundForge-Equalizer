# SoundForge Equalizer v3.22.8 — Firefox 153.0 ESR
## Единая полная история проекта, аудита, исправлений, регрессий и финальной стабилизации

**Проект:** SoundForge Equalizer  
**Платформа:** Mozilla Firefox 153.0 ESR  
**Архитектура:** WebExtension / Manifest V2  
**Версия:** 3.22.8  
**Дата консолидации:** 2026-07-31  
**Автор проекта:** Maxim Melnikov

---

# 1. Назначение документа

Этот документ объединяет в одном файле всю историю работы над Firefox-версией SoundForge Equalizer v3.22.8.

Сюда входят:

- первоначальный аудит Firefox-архива;
- сравнение с Chrome-веткой;
- перенос архитектурных исправлений;
- Storage;
- Runtime Messaging;
- Multi-Tab;
- Navigation / SPA;
- Injection lifecycle;
- Web Audio;
- Volume 0–800%;
- 0% hard mute;
- Master Gain;
- Compressor;
- Safety Limiter;
- Visualization;
- Effects;
- Popup;
- Separate Window;
- Window Connect;
- A/B Compare;
- Preset flow;
- Preset feedback loop;
- канонические 50 пресетов;
- Firefox-specific runtime compatibility;
- финальные проверки;
- оставшиеся runtime-рекомендации.

Документ объединяет всю историю, но не является доказательством того, что каждый runtime-сценарий был вручную прогнан внутри Firefox 153.0 ESR. Статические проверки и проверки структуры проведены; финальный браузерный E2E smoke test остаётся отдельным этапом.

---

# 2. Исходный Firefox-архив

Для последней итерации был принят архив:

```text
Test SoundForge_EQ_Firefox(2).zip
```

Архив был полностью прочитан и проанализирован перед внесением изменений.

На момент аудита в проекте было:

- 34 файла;
- около 22 тысяч строк текста/кода;
- Firefox-specific WebExtension runtime;
- Manifest V2;
- `background.js`;
- `inject.js`;
- `popup.js`;
- `window.js`;
- `manifest.json`;
- `popup.html`;
- `window.html`;
- CSS;
- modules;
- features;
- 50 preset records.

Целью было не переписать Firefox-проект заново, а аккуратно привести его к устойчивой архитектуре, уже отработанной на Chrome-ветке, с учётом различий Firefox API.

---

# 3. Главные правила переноса с Chrome на Firefox

Перенос выполнялся не как blind copy.

Для Firefox отдельно проверялись:

- `browser.*` API;
- `chrome.*` fallback;
- Promise/callback совместимость;
- Manifest V2;
- `runtime.sendMessage`;
- `tabs.update`;
- `scripting`/injection возможности;
- Window runtime;
- per-tab state;
- target tab routing.

Основной принцип:

```text
Chrome architecture
        ↓
Firefox compatibility layer
        ↓
Firefox runtime
        ↓
Same application behavior
```

---

# 4. Первоначальный глубокий аудит

Были выявлены следующие группы риска:

- race conditions;
- lost updates;
- stale state;
- глобальное подключение вместо per-tab;
- stale injection;
- повторная инъекция;
- reconnect после SPA;
- Window Connect;
- проблемы с Web Audio lifecycle;
- некорректная 0% громкость;
- bypass native media path;
- несколько AudioContext;
- слабая синхронизация Popup и Window;
- дублирование preset flow;
- несогласованность порядка 50 пресетов;
- несоответствие Chrome и Firefox runtime semantics.

Принцип работы:

```text
Сначала понять
→ затем изменить
→ затем проверить
```

Без полного переписывания проекта.

---

# 5. Storage — сериализация и защита данных

## Проблемы

Проверялись:

- race conditions;
- lost updates;
- одновременные записи Popup и Window;
- stale snapshot;
- риск потери настроек;
- небезопасный reset;
- конфликтующие user presets.

## Исправления

Использована сериализованная запись:

```text
enqueueStorageMutation()
enqueueStoragePatch()
enqueueUserPresetsMutation()
```

Основные принципы:

- меняются только нужные поля;
- используется patch-merge;
- записи сериализуются;
- старый snapshot не должен перетирать новый;
- user presets хранятся безопасно;
- импорт проходит санитизацию.

Используются:

```text
sanitizeImportedSettings()
sanitizeUserPresets()
sanitizeGains()
sanitizeSiteSettings()
```

---

# 6. Runtime Messaging — Firefox compatibility

В Firefox особое внимание уделялось тому, что:

- `browser.runtime.sendMessage()` обычно Promise-based;
- `chrome.*` compatibility может вести себя иначе;
- некоторые старые bridge-обёртки ожидали Promise там, где результат мог быть `undefined`.

Для устранения подобных проблем был введён совместимый messaging bridge.

Цель:

```text
sendMessageAsync()
```

который нормализует вызовы для:

- Firefox;
- Chrome compatibility;
- callback-style;
- Promise-style.

Это особенно важно для:

- Popup;
- Window;
- Background;
- Inject.

---

# 7. Первичная ошибка дополнительного окна Firefox

Возникала ошибка:

```text
Uncaught TypeError:
can't access property "then",
api.runtime.sendMessage(...) is undefined
```

Причина:

Window напрямую предполагал Promise от выбранного runtime API.

## Исправление

Messaging был переведён на совместимый bridge.

После этого:

- Firefox Window перестал падать на старте;
- `applySavedSettings()` продолжил работу;
- `getInjectSettings()` обрабатывается через совместимый путь;
- Storage messaging также нормализован.

---

# 8. Multi-Tab / Per-Tab State

Firefox-версия получила per-tab routing.

Целевая модель:

```text
_tabSessions
    ↓
tabId
    ↓
runtime state
    ↓
connection state
```

Добавлены/используются:

```text
getTabSession()
invalidateTabRuntime()
markTabInjected()
restorePersistedConnection()
```

При закрытии вкладки состояние должно удаляться.

При navigation:

```text
invalidateTabRuntime(tabId)
```

необходимо для предотвращения stale runtime.

---

# 9. Navigation / SPA / Reinjection

Проверялись:

- YouTube SPA;
- URL changes;
- history state;
- reload;
- navigation;
- reinjection;
- stale injection.

Используются механизмы:

```text
injectScriptDirectly()
doInjectScriptDirectly()
isInjectLoaded()
canInjectScript()
canSendMessage()
```

Есть:

- retry;
- cooldown;
- защита от бесконечной инъекции;
- повторное внедрение после navigation.

---

# 10. Web Audio — исходные проблемы

Обнаружены типовые проблемы:

- analyzer мог стоять не в правильной позиции;
- fake visualization;
- hardcoded sampleRate;
- lifecycle leaks;
- AudioContext restore;
- отсутствие полного cleanup.

## Исправления

Добавлены/усилены:

```text
validateAudioChain()
recreateAudioChain()
restoreAudioContext()
fullCleanup()
```

`sampleRate` больше не должен жёстко фиксироваться как:

```text
48000
```

а должен определяться реальным AudioContext.

---

# 11. Важная регрессия: звук пропадал при подключении

В одной из промежуточных версий Connection Flow мог создавать граф, но source не всегда был реально подключён.

Проблемная модель:

```text
Media Source
    X
    не подключён к DSP
```

Это давало:

- звук исчезал при Connect;
- UI показывал Connected;
- реального аудиосигнала не было.

## Исправление

Установлено, что runtime graph должен иметь реальную непрерывную цепь:

```text
Source
→ DSP
→ Analyzer
→ Destination
```

---

# 12. Volume 0–800%

Первоначальная проблема:

- UI менялся;
- GainNode менялся;
- но слышимый сигнал иногда продолжал идти другим маршрутом.

Причина:

```text
Native Media Path
```

мог воспроизводиться параллельно с SoundForge DSP.

## Исправление

Пока SoundForge активен:

```text
native <audio>/<video>
→ muted
```

а реальный слышимый сигнал должен проходить через SoundForge graph.

При Disconnect:

```text
native volume restored
native muted restored
```

---

# 13. 0% — абсолютная тишина

Одна из самых важных задач Firefox-ветки.

Проблема:

VOT и другие userscripts/расширения могли использовать:

```text
Другой AudioContext
```

или другой источник звука.

Поэтому:

```text
SoundForge Gain = 0
```

не всегда гарантировал тишину всей вкладки.

## Дополнительное решение

Введён tab-level mute flow:

```text
inject.js
    ↓
setTabVolumeMute
    ↓
background.js
    ↓
browser.tabs.update / chrome.tabs.update
```

При:

```text
Volume = 0%
```

должны применяться:

```text
Master Gain = 0
HardMute = 0
FadeGain = 0
Tab Mute = true
```

При:

```text
Volume > 0%
```

восстанавливается исходное состояние вкладки.

При Disconnect:

```text
Tab Mute restored
```

Это является дополнительной защитой от сторонних AudioContext.

---

# 14. Финальная DSP-архитектура Firefox

Целевая цепочка:

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
AudioContext.destination
```

## Почему Master Gain после Compressor

Так:

```text
100%
```

является базовым уровнем.

А:

```text
200%
400%
600%
800%
```

увеличивают итоговый обработанный сигнал.

---

# 15. Safety Limiter

Для защиты от чрезмерных пиков добавлен Safety Limiter.

Он:

- находится после Master Gain;
- защищает output;
- проверяется в `validateAudioChain()`;
- очищается в `fullCleanup()`.

Это особенно важно при комбинации:

```text
EQ +12 dB
Bass +12 dB
Volume 800%
```

Clipping detection показывает проблему, но limiter должен предотвращать слишком агрессивный выходной пик.

---

# 16. Дополнительное окно — первая проблема Window Connect

После первоначальной стабилизации Firefox Window была следующая проблема.

Window отправлял:

```text
connect
```

Background находил правильную вкладку.

Но Window получал:

```text
statusUpdate: connecting
```

и мог решить, что это событие относится к другой вкладке.

Дальше:

```text
timeout
```

и:

```text
Window NOT connected
```

---

# 17. Исправление Window Connect

Добавлен:

```text
targetTabId
```

Window теперь:

- знает конкретную аудиовкладку;
- отправляет Connect на неё;
- получает `tabId`;
- фильтрует `statusUpdate` по `targetTabId`;
- принимает immediate `connected`;
- использует fallback `getStatus`.

Сценарий:

```text
Window
→ Connect
→ Background
→ finds Target Tab
→ targetTabId
→ if already connected
→ immediate Connected
```

Больше не должно быть ситуации:

```text
connected
→ Window ignored response
→ wait
→ timeout
```

---

# 18. Эффекты в дополнительном окне

Поддерживаются:

```text
Spectrum
Waves
Fire
Neon
```

Целевой runtime flow:

```text
click
→ cycleEffectInWindow()
→ update current effect
→ save state
→ update button
→ renderEffectInWindow()
```

Дополнительно:

- Enter;
- Space.

Эффект синхронизируется между Popup и Window.

---

# 19. Preset flow без Disconnect

Была выявлена проблема, при которой смена пресета могла вызывать несколько независимых операций:

```text
updateEQ
setVolume
setBass
```

Это создавало гонки.

Целевой поток:

```text
Popup / Window
    ↓
applyPreset
    ↓
Background
    ↓
Target Tab
    ↓
inject.js
    ↓
SF_APPLY_PRESET
    ↓
EQ + Bass + Volume
```

Смена пресета не должна:

- вызывать Disconnect;
- вызывать Connect;
- пересоздавать AudioContext;
- разрушать Audio Graph.

---

# 20. Критическая регрессия Preset Feedback Loop

В одной из промежуточных версий был создан feedback loop.

Проблемный поток:

```text
applyPreset
→ SF_APPLY_PRESET
→ presetChanged
→ Window / Popup
→ applyPreset
→ SF_APPLY_PRESET
→ ...
```

Симптом:

```text
logitech
logitech
logitech
logitech
...
```

и многократное:

```text
Звук восстановлен
```

Это вызывало:

- лаги;
- рассинхронизацию;
- повторное применение;
- нестабильность.

## Финальное решение

Разделено:

```text
applyPreset
=
COMMAND
```

и:

```text
presetChanged
=
UI EVENT
```

`presetChanged` больше не должен отправлять новый `applyPreset`.

---

# 21. A/B Compare

Firefox-ветка получила такую же модель A/B:

```text
A
↕
B
```

Сохраняются:

- 10 EQ bands;
- Bass;
- Volume.

Сценарий:

```text
Save A
→ change settings
→ Save B
→ A ↔ B
```

Volume:

```text
0%
```

должен сохраняться как настоящий 0%, а не превращаться в 100%.

A/B не должен создавать новый AudioContext и не должен выполнять Disconnect.

---

# 22. 50 канонических пресетов

Финальный Firefox-проект стандартизирован по модели:

```text
50 presets
Popup = 50
Window = 50
Hotkeys = 50
```

Для всех:

```text
Volume = 100%
```

Каждый имеет:

```text
individual Bass Boost
10 EQ bands
```

Bass должен находиться в диапазоне:

```text
-12 … +12 dB
```

---

# 23. Единый порядок пресетов

Была обнаружена возможность расхождения между:

```text
Popup
```

и:

```text
Window
```

Финальная модель:

```text
PRESET_ORDER
    ↓
Popup
    ↓
Window
    ↓
Hotkeys
    ↓
Preset Application
```

Проверено:

```text
Config presets: 50
Popup: 50
Window: 50
Hotkeys: 50
Same order: PASS
```

Цель:

```text
Preset #1 = один и тот же везде
Preset #2 = один и тот же везде
...
Preset #50 = один и тот же везде
```

---

# 24. Firefox-specific compatibility

Для Firefox отдельно проверены:

- `browser.*`;
- `chrome.*` fallback;
- runtime messaging;
- Storage;
- Window runtime;
- tab routing;
- mute API.

Особое внимание уделялось тому, чтобы не переносить Chrome-реализацию без проверки Firefox semantics.

---

# 25. Финальная проверка проекта

После миграции были выполнены статические проверки.

```text
24 JavaScript-файла          PASS
JSON                         PASS
Local imports                0 missing
Manifest resources           0 missing
Presets                      50
Popup order                  50
Window order                 50
Hotkeys order                50
Canonical order              PASS
Volume = 100%                PASS
Bass values                  PASS
10 EQ bands                  PASS
ZIP integrity                PASS
```

---

# 26. Финальная структура Firefox Runtime

Целевая архитектура:

```text
Popup
  │
  ├── Settings
  ├── Presets
  ├── Effects
  └── A/B
        │
        ▼
Background
        │
        ├── Serialized Storage
        ├── Per-Tab State
        ├── Target Tab Routing
        ├── Window Routing
        ├── Hard Mute
        └── Preset Application
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

# 27. История ключевых регрессий Firefox

## Регрессия 1
`sendMessage(...).then is undefined`

Причина:
неправильное ожидание Promise API.

Исправление:
совместимый runtime bridge.

## Регрессия 2
Звук пропадал при Connect.

Причина:
audio source path не был гарантированно подключён.

Исправление:
проверка реального Audio Graph.

## Регрессия 3
Volume не влиял на весь звук.

Причина:
native media path обходил SoundForge.

Исправление:
native media mute + SoundForge master processing.

## Регрессия 4
0% не гарантировал тишину.

Причина:
сторонние AudioContext.

Исправление:
tab-level mute.

## Регрессия 5
Window не подключался.

Причина:
ошибочная обработка statusUpdate.

Исправление:
targetTabId + immediate response.

## Регрессия 6
Смена пресета могла вызывать состояние disconnect.

Причина:
несколько независимых runtime operations.

Исправление:
atomic preset flow.

## Регрессия 7
Пресет применялся бесконечно.

Причина:
feedback loop `applyPreset ↔ presetChanged`.

Исправление:
command/event separation.

## Регрессия 8
Popup/Window могли отображать разные порядки пресетов.

Исправление:
canonical preset order.

---

# 28. Финальный preset model Firefox

Каждый built-in preset:

```text
ID
Name
Category
10 × EQ
Bass Boost
Volume = 100%
```

Количество:

```text
50
```

Порядок:

```text
Canonical
```

Интерфейсы:

```text
Popup
Window
Hotkeys
```

используют один и тот же порядок.

---

# 29. Результат финальной стабилизации

Firefox-версия получила:

✅ Serialized Storage

✅ Per-tab state

✅ Runtime messaging normalization

✅ Window Connect fix

✅ targetTabId

✅ 0% tab-level mute

✅ Master Gain after Compressor

✅ Safety Limiter

✅ Improved A/B Compare

✅ Atomic preset flow

✅ Preset feedback loop fix

✅ 50 canonical presets

✅ Volume 100% for all built-in presets

✅ Individual Bass Boost

✅ Same preset order in Popup and Window

✅ Effects in separate Window

✅ Firefox compatibility layer

---

# 30. Финальный рекомендуемый smoke test Firefox 153.0 ESR

## Test 1 — Connect

```text
YouTube
→ Connect
→ Connected
→ Audio continues
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

Проверить:

- 0% = тишина;
- 100% = baseline;
- 800% = boost;
- no disconnect.

## Test 3 — Presets

```text
Preset 1
→ Preset 2
→ Preset 3
→ Preset 4
```

Проверить:

- no disconnect;
- no loop;
- audio remains connected;
- preset applied once.

## Test 4 — Window

```text
Open Window
→ Connect
→ change preset
→ change volume
→ change bass
→ change effect
```

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
```

Проверить:

- Popup controls A;
- Window controls A;
- B isolated.

## Test 7 — Navigation

```text
YouTube Video A
→ SPA
→ Video B
```

Проверить:

- reinjection;
- no stale AudioContext;
- no duplicate graph.

## Test 8 — Firefox restart

```text
Close Firefox
→ Start Firefox
→ Restore active tab
→ Connect
```

---

# 31. Итоговая архитектурная оценка Firefox

| Область | Оценка |
|---|---:|
| UI/UX | 9/10 |
| EQ Architecture | 8/10 |
| Web Audio | 8/10 |
| Storage | 8.5/10 |
| Multi-tab | 8/10 |
| Runtime Messaging | 8/10 |
| Visualization | 8.5/10 |
| Presets | 9/10 |
| Window | 8/10 |
| Firefox Compatibility | 8/10 |
| Maintainability | 6.5/10 |
| Architectural cleanliness | 6.5/10 |
| Production readiness | 8/10 |

Это инженерные оценки по текущему аудиту и статическим проверкам.

---

# 32. Финальный архив

Последняя стабилизированная сборка:

```text
SoundForge_EQ_Firefox_153.0ESR_v3.22.8_FINAL_STABILIZED.zip
```

Основные результаты:

```text
24 JS files                 PASS
JSON                        PASS
Local imports               0 missing
Manifest resources          0 missing
50 presets                  PASS
Canonical preset order      PASS
Volume 100%                 PASS
Individual Bass             PASS
10 EQ bands                 PASS
ZIP integrity               PASS
```

---

# 33. Что ещё необходимо перед окончательным релизом

Несмотря на статическую проверку, рекомендуется выполнить:

1. Реальный Firefox 153.0 ESR E2E test.
2. Чистый Firefox profile.
3. YouTube.
4. Spotify.
5. Multi-tab.
6. Window.
7. Connect/Disconnect.
8. Volume 0–800%.
9. Preset switching.
10. A/B Compare.
11. Effects.
12. SPA navigation.
13. Firefox restart.
14. Background lifecycle.
15. External userscript coexistence.

---

# 34. Финальный вывод

Firefox 153.0 ESR ветка SoundForge Equalizer v3.22.8 прошла полный цикл стабилизации:

```text
Initial Firefox Audit
        ↓
Storage Stabilization
        ↓
Runtime Messaging Normalization
        ↓
Per-Tab State
        ↓
Navigation / Reinjection
        ↓
Web Audio Stabilization
        ↓
Volume 0–800%
        ↓
0% Full Tab Mute
        ↓
Master Gain + Safety Limiter
        ↓
Window Connect Fix
        ↓
Effects in Window
        ↓
A/B Compare
        ↓
Atomic Preset Flow
        ↓
Preset Feedback Loop Fix
        ↓
50 Canonical Presets
        ↓
Firefox 153.0 ESR Final Stabilization
```

Главная архитектурная цель:

```text
Popup
=
Window
=
Background
=
Target Tab
=
One Audio Engine
=
One Canonical Preset System
```

Смена пресета не должна отключать звук.

Смена громкости не должна уничтожать AudioContext.

0% должен означать настоящую тишину.

Window должен управлять той же вкладкой, что и Popup.

Popup и Window должны видеть одинаковые 50 пресетов в одинаковом порядке.

`applyPreset` должен быть командой.

`presetChanged` должен быть событием.

Эта модель является текущей целевой архитектурой Firefox-ветки SoundForge Equalizer v3.22.8.

---

**© 2026 Maxim Melnikov**  
**SoundForge Equalizer — Firefox 153.0 ESR**  
**Version 3.22.8**

# 35. Последнее обновление — Window Connect Runtime Handshake V3


═══════════════════════════════════════════════════════════════════════════════
🆕 ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ FIREFOX 153.0 ESR — WINDOW CONNECT RUNTIME HANDSHAKE
🗓️ 31 июля 2026
📌 Версия: 3.22.8
═══════════════════════════════════════════════════════════════════════════════

24. WINDOW CONNECT — ВТОРОЙ ЭТАП ИСПРАВЛЕНИЯ
───────────────────────────────────────────────────────────────────────────────

После предыдущего исправления подключения дополнительного окна был получен
runtime-лог, показавший, что проблема глубже, чем только фильтрация statusUpdate.

Наблюдался поток:

Window
→ connect
→ statusUpdate: connecting
→ statusUpdate: disconnected
→ Window продолжает ждать
→ timeout
→ вечная загрузка

Дополнительно было обнаружено, что при успешном подключении приходил:

statusUpdate: connected

но UI мог продолжать показывать индикатор загрузки, если connect polling/timer
не был остановлен в том же обработчике.

Исправлены обе части.

25. TRANSIENT DISCONNECTED ПРИ HANDSHAKE
───────────────────────────────────────────────────────────────────────────────

✅ `disconnected` во время активного connection handshake больше не считается
   окончательным отказом.

✅ Если Window находится в состоянии:

   isConnecting = true

   то промежуточный:

   statusUpdate: disconnected

   игнорируется как transient state.

✅ Handshake продолжается до:

   • реального `connected`;
   • явного `error`;
   • окончательного timeout.

✅ Это устраняет преждевременный сброс подключения.

26. STOP CONNECT POLLING ПОСЛЕ УСПЕШНОГО CONNECT
───────────────────────────────────────────────────────────────────────────────

✅ В Window введён единый connect polling timer.

✅ Добавлен централизованный:

   stopConnectPolling()

✅ При:

   statusUpdate: connected

   выполняется:

   • остановка polling;
   • `isConnecting = false`;
   • `isConnected = true`;
   • `showLoading(false)`;
   • обновление UI статуса.

✅ При Disconnect polling также останавливается.

✅ При Error polling останавливается.

Это устраняет сценарий:

   Реальное подключение уже установлено
   ↓
   Window получил `connected`
   ↓
   UI продолжает показывать "Загрузка..."
   ↓
   бесконечный loading

27. FIREFOX RUNTIME CONNECT — ПРЯМОЕ ПОДТВЕРЖДЕНИЕ ОТ inject.js
───────────────────────────────────────────────────────────────────────────────

Для устранения зависимостей только от `statusUpdate` был усилен сам протокол
подключения.

Новая целевая схема:

Window
→ Background
→ SF_CONNECT
→ inject.js
→ connectAudio()
→ реальный Audio Graph
→ `{ status: "connected" }`
→ Background
→ Window

✅ `SF_CONNECT` теперь должен возвращать реальный асинхронный результат
   подключения из `inject.js`.

✅ Background использует прямой ответ `SF_CONNECT` как дополнительное
   подтверждение.

✅ `statusUpdate` остаётся дополнительным каналом синхронизации, но больше
   не является единственным подтверждением.

28. RETRY CONNECTAUDIO ДЛЯ FIREFOX
───────────────────────────────────────────────────────────────────────────────

Firefox может завершить загрузку media element позже, чем Window/Background
успевают начать Connect.

Проблемные состояния:

- `captureStream()` ещё не готов;
- `mozCaptureStream()` ещё не готов;
- `MediaStream` существует, но `audioTracks` ещё отсутствуют;
- YouTube ещё буферизуется;
- video element ещё не полностью готов.

✅ Добавлен retry flow для `connectAudio()`.

✅ Возможны повторные попытки подключения.

✅ Максимальный целевой retry flow:

   до 12 попыток
   с интервалом около 500 ms

✅ После успешного получения аудиотрека создаётся DSP Graph.

✅ Если подключение действительно невозможно, должен возвращаться явный
   `status: "error"` вместо бесконечного `connecting`.

29. FIREFOX CONNECT WATCHDOG
───────────────────────────────────────────────────────────────────────────────

✅ Background handshake watchdog увеличен до примерно 20 секунд.

✅ Window продолжает ожидать реальный результат в рамках handshake.

✅ При успехе:

   connected

✅ При окончательной ошибке:

   error

✅ При окончательном timeout:

   выход из loading state
   + понятный статус ошибки

Это устраняет бесконечное состояние:

   connecting...
   connecting...
   connecting...

без конечного результата.

30. TARGET TAB ID
───────────────────────────────────────────────────────────────────────────────

✅ Window использует `targetTabId`.

✅ Подключение маршрутизируется к конкретной вкладке.

✅ `statusUpdate` фильтруется относительно `targetTabId`.

✅ События без tabId считаются глобальными только там, где это безопасно.

✅ События другой вкладки не должны менять состояние текущего Window.

31. ПОСЛЕДНИЙ RUNTIME-ЛОГ И ДИАГНОЗ
───────────────────────────────────────────────────────────────────────────────

В последнем диагностическом логе наблюдалось:

statusUpdate: disconnected
→ ignored as transient
→ statusUpdate: connecting
→ ожидание
→ снова disconnected
→ timeout

Это показало, что простой игнор transient disconnected сам по себе недостаточен.

После этого архитектура была усилена прямым async `SF_CONNECT` result и retry
внутри `connectAudio()`.

Цель:

не ждать бесконечно `statusUpdate`,
а получить конечный результат непосредственно от:

inject.js → connectAudio()

32. АКТУАЛЬНЫЙ FIREFOX WINDOW CONNECT FLOW
───────────────────────────────────────────────────────────────────────────────

Window
   ↓
получает `targetTabId`
   ↓
Connect
   ↓
Background
   ↓
status = connecting
   ↓
SF_CONNECT
   ↓
inject.js
   ↓
найти media element
   ↓
captureStream / mozCaptureStream
   ↓
audio track ready?
   ├── нет → retry
   └── да
        ↓
создать AudioContext
        ↓
создать DSP Graph
        ↓
подключить source
        ↓
проверить Audio Chain
        ↓
return connected
        ↓
Background
        ↓
Window
        ↓
stopConnectPolling()
        ↓
showLoading(false)
        ↓
✅ Connected

33. ВАЖНОЕ КОРРЕКТИРУЮЩЕЕ ПРИМЕЧАНИЕ К ПРЕДЫДУЩЕМУ СТАТУСУ
───────────────────────────────────────────────────────────────────────────────

Ранее в истории проекта встречались формулировки:

✅ Window подключается корректно
✅ Firefox готов к релизу
✅ Все тесты пройдены

После последующих runtime-логов Firefox Window Connect была обнаружена дополнительная
регрессия, поэтому эти утверждения необходимо рассматривать как исторические
состояния предыдущих сборок.

На текущем этапе:

✅ Архитектурные исправления внесены.
✅ Последний Window Connect runtime handshake усилен.
✅ Direct SF_CONNECT response добавлен.
✅ connectAudio retry добавлен.
✅ Transient disconnected обработан.
✅ Loading cleanup усилен.
⚠️ Последний патч V3 требует повторного ручного E2E тестирования непосредственно
   в Firefox 153.0 ESR.

34. ФИНАЛЬНЫЙ SMOKE TEST ДЛЯ WINDOW CONNECT
───────────────────────────────────────────────────────────────────────────────

После установки последнего патча необходимо проверить:

1. Открыть Firefox 153.0 ESR.
2. Открыть YouTube.
3. Открыть SoundForge Window.
4. Проверить `targetTabId`.
5. Нажать Connect.
6. Проверить `connecting`.
7. Проверить отсутствие ложного final disconnect.
8. Проверить получение `connected`.
9. Проверить исчезновение loading overlay.
10. Проверить реальный звук.
11. Изменить Volume.
12. Изменить EQ.
13. Изменить Bass.
14. Сменить preset.
15. Переключить Effect.
16. Проверить Disconnect.
17. Повторно Connect.
18. Проверить вторую вкладку.

35. АКТУАЛЬНОЕ СОСТОЯНИЕ FIREFOX 153.0 ESR
───────────────────────────────────────────────────────────────────────────────

✅ Storage architecture
✅ Runtime messaging normalization
✅ Per-tab state
✅ targetTabId
✅ Window status filtering
✅ Transient disconnected handling
✅ Direct SF_CONNECT response
✅ connectAudio retry flow
✅ 20-second handshake watchdog
✅ Loading cleanup path
✅ 50 canonical presets
✅ Volume 100% for built-in presets
✅ Individual Bass Boost
✅ 10 EQ bands
✅ Master Gain
✅ Safety Limiter
✅ 0% tab mute architecture
✅ A/B Compare architecture
✅ Effects architecture
⚠️ Final browser-level validation of the latest Window Connect V3 patch required

═══════════════════════════════════════════════════════════════════════════════
📌 LAST UPDATE: 31 July 2026
🌐 Firefox 153.0 ESR
📌 v3.22.8
═══════════════════════════════════════════════════════════════════════════════
