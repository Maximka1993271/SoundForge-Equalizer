<<<<<<< HEAD
# 🎛️ SoundForge Equalizer

> Премиальное браузерное расширение с 10-полосным эквалайзером для всех сайтов

![SoundForge Equalizer](Screenshots/Full%20Equalizer.png)

---

## ✨ Возможности

| Функция | Описание |
|---------|----------|
| 🎚️ **10-полосный эквалайзер** | 31 Гц – 16 кГц, ±12 дБ, шаг 0.5 дБ |
| 🎵 **50 профессиональных пресетов** | От Reference до MAX BOOST |
| 🔊 **Громкость 0-800%** | Полное отключение звука при 0% |
| 🎸 **Bass Boost** | ±12 дБ для глубокого баса |
| 🎨 **4 эффекта визуализации** | Спектр, Волны, Огонь, Неон |
| 📊 **VU-метр** | Индикация клиппинга в реальном времени |
| 🌙 **Ночной режим** | Автоматически с 22:00 до 07:00 |
| ⚡ **Энергосбережение** | Снижение частоты обновлений |
| 💾 **Экспорт/Импорт** | Настроек в JSON |
| 🌐 **Для каждого сайта** | Автосохранение настроек |
| 🔀 **A/B сравнение** | Сравнение пресетов |
| ⌨️ **Горячие клавиши** | Быстрое управление |

---

## 📸 Скриншоты

### Полный интерфейс
![Full Interface](Screenshots/soundforge-full-interfac.png)

### Светлая тема
![Light Theme](Screenshots/soundforge-light-ui.png)

### Главное окно
![Main Window](Screenshots/Full%20Equalizer.png)

---

## 🎯 Пресеты

### 🎵 Основные
- **Reference** — нейтральный звук
- **Natural** — естественный
- **Universal** — универсальный
- **Balanced** — сбалансированный

### 🎶 Электронные
- Club, Dance, EDM, Synthwave, Deep House, Festival

### 🎸 Рок/Метал
- Rock, Metal, Hard Rock, Grunge

### 🎤 Вокал/Подкасты
- Vocal, Podcast, Speech, Rap

### 🎻 Акустика/Классика
- Acoustic, Piano, Orchestra, Classical, Jazz

### 🎧 Специальные
- Headphones, Car, Night, Bass Boost, Hip-Hop, Soul, Blues, Reggae, Chill, Lo-Fi, Sunset, Pop, K-Pop, World, Ambient, Clarity

### 🌊 Wave/Phonk
- Wave, Phonk

### ⚡ MAX BOOST
- Logitech G321, MAX BOOST

### 🎮 Игры/Кино
- Gaming, Movie, FPS

### 🌟 Премиум
- Hi-Fi, Studio, Premium, Master

---

## ⌨️ Горячие клавиши

| Комбинация | Действие |
|------------|----------|
| `Ctrl+Shift+U` | Открыть расширение |
| `Ctrl+Shift+E` | Вкл/Выкл эквалайзер |
| `Ctrl+Shift+Y` | Следующий пресет |
| `Ctrl+Shift+X` | Сброс всех настроек |

---

## 🔧 Установка

### Для Microsoft Edge / Google Chrome

1. Скачайте папку **Microsoft Edge**
2. Откройте `edge://extensions/` или `chrome://extensions/`
3. Включите **Режим разработчика**
4. Нажмите **Загрузить распакованное расширение**
5. Выберите папку **Microsoft Edge**

### Для Firefox

1. Скачайте папку **Firefox**
2. Откройте `about:debugging`
3. Нажмите **Загрузить временное дополнение**
4. Выберите `manifest.json` из папки **Firefox**

---

## 📁 Структура проекта

SoundForge-Equalizer/
├── 📁 Microsoft Edge/ # Версия для Edge/Chrome (Manifest V3)
│ ├── background.js # Фоновый сервис-воркер
│ ├── inject.js # Внедряемый скрипт для аудио
│ ├── manifest.json # Манифест расширения
│ ├── popup.html # Основной интерфейс
│ ├── popup.js # Логика popup
│ ├── style.css # Стили (темная/светлая/системная)
│ ├── window.html # Отдельное окно
│ ├── window.js # Логика окна
│ ├── window.css # Стили окна
│ ├── 📁 features/ # Дополнительные функции
│ ├── 📁 icons/ # Иконки расширения
│ ├── 📁 modules/ # Модули (audio, config, i18n...)
│ └── 📁 screenshots/ # Скриншоты
├── 📁 Firefox/ # Версия для Firefox
=======
<h1 align="center">SoundForge Equalizer v3.22.8</h1>

<p align="center">
  <a href="https://github.com/Maximka1993271/SoundForge-Equalizer/releases">
    <img src="https://img.shields.io/badge/version-3.22.8-blue.svg?style=for-the-badge&logo=github" alt="Version"/>
  </a>
  <a href="https://www.microsoft.com/edge">
    <img src="https://img.shields.io/badge/Edge-Chromium-0078D7.svg?style=for-the-badge&logo=microsoft-edge" alt="Edge"/>
  </a>
  <a href="https://www.mozilla.org/en-US/firefox/enterprise/">
    <img src="https://img.shields.io/badge/Firefox-ESR-FF7139.svg?style=for-the-badge&logo=firefox-browser" alt="Firefox"/>
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge" alt="License"/>
  </a>
  <a href="https://github.com/Maximka1993271/SoundForge-Equalizer/releases">
    <img src="https://img.shields.io/github/downloads/Maximka1993271/SoundForge-Equalizer/total.svg?style=for-the-badge&logo=github" alt="Downloads"/>
  </a>
  <a href="https://github.com/Maximka1993271/SoundForge-Equalizer">
    <img src="https://img.shields.io/badge/Open%20Source-✅-brightgreen.svg?style=for-the-badge" alt="Open Source"/>
  </a>
  <a href="https://github.com/Maximka1993271/SoundForge-Equalizer">
    <img src="https://img.shields.io/badge/Last%20Commit-2026--07--29-blue.svg?style=for-the-badge&logo=github" alt="Last Commit"/>
  </a>
  <a href="https://github.com/Maximka1993271/SoundForge-Equalizer">
    <img src="https://img.shields.io/badge/Code%20Style-ES2020-yellow.svg?style=for-the-badge&logo=javascript" alt="Code Style"/>
  </a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API">
    <img src="https://img.shields.io/badge/Web%20Audio%20API-Supported-orange.svg?style=for-the-badge&logo=web-audio" alt="Web Audio API"/>
  </a>
  <a href="https://github.com/Maximka1993271/SoundForge-Equalizer/wiki">
    <img src="https://img.shields.io/badge/Wiki-📖-0078D7.svg?style=for-the-badge" alt="Wiki"/>
  </a>
</p>

<p align="center">
  <img src="https://github.com/Maximka1993271/SoundForge-Equalizer/raw/main/Screenshots/Full%20Equalizer.png" alt="SoundForge Equalizer" width="600"/>
</p>

<p align="center">
  <b>Professional 10-Band Browser Equalizer</b><br/>
  Professional real-time audio processing for YouTube and other supported websites.<br/>
  <b>Free • Open Source • Privacy First • Cross-Browser</b>
</p>

---

## ⚠️ Official Source Warning

> **🚨 IMPORTANT: This is the ONLY official distribution channel for SoundForge Equalizer.**
>
> This extension is **only published on GitHub** under this repository:
> **[https://github.com/Maximka1993271/SoundForge-Equalizer](https://github.com/Maximka1993271/SoundForge-Equalizer)**
>
> **I DO NOT upload this extension to:**
> - ❌ Chrome Web Store
> - ❌ Firefox Add-ons Store (AMO)
> - ❌ Microsoft Edge Add-ons Store
> - ❌ Telegram
> - ❌ Any other websites, file hosting services, or social media platforms
>
> **If you find this extension anywhere else, it is NOT the original version and may contain malware, spyware, or modified code.**
>
> **Always download from the official GitHub repository only!**

---

## ⭐ Project Highlights

- ✅ Free & Open Source
- ✅ Microsoft Edge, Google Chrome and Mozilla Firefox
- ✅ 10-Band Equalizer
- ✅ 50 Built-in Presets
- ✅ Real-Time Audio Processing
- ✅ Spectrum Analyzer, VU Meter & Frequency Response Graph
- ✅ Volume Boost (0% – 800%)
- ✅ Import / Export Presets
- ✅ Per-Site Settings
- ✅ Keyboard Shortcuts
- ✅ Dark / Light / System Themes
- ✅ Separate Window Mode
- ✅ No Ads • No Tracking • No Telemetry
- ✅ 100% Local Audio Processing
- ✅ Night Mode (Auto 22:00 – 07:00)
- ✅ Power Save Mode
- ✅ History & Statistics
- ✅ Clipping Detection
- ✅ 3 Languages (English, Русский, Українська)
- ✅ Web Audio API-based processing
- ✅ Modular Architecture (ES Modules)
- ✅ Memory Management & Leak Prevention

---

## 🔒 Privacy

All audio processing is performed locally using the Web Audio API.
No advertisements, tracking, telemetry, analytics or user data collection.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎚️ **10-Band EQ** | 31Hz – 16kHz, 0.5 dB steps, ±12 dB |
| 📊 **Visualization** | Spectrum, VU Meter, Frequency Response Graph with grid |
| 🎛️ **50+ Presets** | For all music genres with ideal gain staging |
| 🔊 **Volume 0–800%** | From silence to maximum boost with hard mute at 0% |
| 🎚️ **Bass Boost** | ±12 dB Low-shelf filter at 100Hz |
| 🎨 **Three Themes** | Light, Dark, System (auto-sync with OS) |
| 💾 **Export/Import** | Save your settings as JSON backup |
| 🔀 **A/B Comparison** | Compare sound between two presets |
| 🌐 **3 Languages** | Русский, Українська, English |
| 🌙 **Night Mode** | Auto-enabled 22:00–07:00, 30% volume reduction |
| ⚡ **Power Save Mode** | Reduces update frequency to save CPU |
| 📜 **History** | Tracks all changes with timestamps (up to 1000 entries) |
| 📊 **Statistics** | Usage stats, most used presets, daily activity |
| 🎯 **Clipping Detection** | Visual warning when audio clips or volume is critical |
| 💾 **Per-Site Settings** | Settings saved per domain, auto-applied |
| ⌨️ **Keyboard Shortcuts** | 4 shortcuts for quick control |
| 🪟 **Separate Window** | Full equalizer in standalone window |
| 📦 **Manifest V3** | Modern Chrome Extension Architecture |
| 🔓 **Open Source** | Fully open source code with MIT License |

---

## 🎨 Visualization Effects

| Effect | Description |
|--------|-------------|
| 📊 **Spectrum** | Classic real-time frequency analyzer with colored bars |
| 🌊 **Waves** | Smooth flowing audio waves with dynamic amplitude response |
| 🔥 **Fire** | Animated flame effect that pulses with the music's energy |
| 💜 **Neon** | Glowing neon bars with particle effects and vibrant colors |

### How to Use

- Click the **🎨 Effect** button in the extension popup or standalone window
- Cycle through all 4 effects with each click
- The selected effect is saved and persists across sessions

🎨 Effect → 📊 Spectrum → 🌊 Waves → 🔥 Fire → 💜 Neon → 🔄

---

## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="https://github.com/Maximka1993271/SoundForge-Equalizer/raw/main/Screenshots/soundforge-full-interfac.png" alt="SoundForge Full Interface" width="400"/>
        <br/>
        <b>🌙 Full Interface</b>
      </td>
      <td align="center">
        <img src="https://github.com/Maximka1993271/SoundForge-Equalizer/raw/main/Screenshots/soundforge-light-ui.png" alt="SoundForge Light UI" width="400"/>
        <br/>
        <b>☀️ Light UI</b>
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://github.com/Maximka1993271/SoundForge-Equalizer/raw/main/Screenshots/Full%20Equalizer.png" alt="Full Equalizer" width="400"/>
        <br/>
        <b>🎛️ Full Equalizer</b>
      </td>
      <td align="center">
        <img src="https://github.com/Maximka1993271/SoundForge-Equalizer/raw/main/Screenshots/On%20Player.png" alt="On Player" width="400"/>
        <br/>
        <b>🎵 On Player</b>
      </td>
    </tr>
  </table>
</div>
---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+U` | Activate extension (open popup) |
| `Ctrl+Shift+E` | Toggle equalizer ON/OFF |
| `Ctrl+Shift+Y` | Next preset |
| `Ctrl+Shift+X` | Reset all settings |
| `Ctrl+Shift+L` | Open separate window (standalone mode) |

---

## 🎛️ Presets List (50+)

### 🎵 Main
- `flat` — Reference
- `natural` — Natural
- `universal` — Universal
- `balanced` — Balanced

### 🎶 Electronic
- `club` — Club
- `dance` — Dance
- `edm` — EDM
- `synthwave` — Synthwave
- `deephouse` — Deep House
- `festival` — Festival

### 🎸 Rock / Metal
- `rock` — Rock
- `metal` — Metal
- `hardrock` — Hard Rock
- `grunge` — Grunge

### 🎤 Vocal / Podcast
- `vocal` — Vocal
- `podcast` — Podcast
- `speech` — Speech
- `rap` — Rap

### 🎻 Acoustic / Classical
- `acoustic` — Acoustic
- `piano` — Piano
- `orchestra` — Orchestra
- `classical` — Classical
- `jazz` — Jazz

### 🎧 Special
- `headphones` — Headphones
- `car` — Car
- `night` — Night
- `bassboost` — Max Bass
- `hiphop` — Hip-Hop
- `soul` — Soul
- `blues` — Blues
- `reggae` — Reggae
- `chill` — Chill
- `lofi` — Lo-Fi
- `sunset` — Sunset
- `pop` — Pop
- `kpop` — K-Pop
- `world` — World
- `ambient` — Ambient
- `clarity` — Clarity

### 🌊 Wave / Phonk
- `wave` — Wave
- `phonk` — Phonk/Drift

### ⚡ MAX BOOST
- `logitech` — Logitech G321
- `maxboost` — MAX BOOST ⚡

### 🎮 Gaming / Movie
- `gaming` — Gaming
- `movie` — Movie
- `fps` — FPS

### 🌟 Premium
- `hifi` — Hi-Fi
- `studio` — Studio
- `premium` — Premium
- `master` — Master

---

## 🔧 Installation

### 🔹 Microsoft Edge (Chromium)

1. Download the archive: **SoundForge_EQ_Edge_v3.22.8.zip**
2. Extract to any folder
3. Open Edge → `edge://extensions/`
4. Enable **"Developer mode"**
5. Click **"Load unpacked"** → select the folder

### 🔹 Firefox ESR

1. Download the archive: **SoundForge_EQ_Firefox_v3.22.8.zip**
2. Extract to any folder
3. Open Firefox → `about:debugging#/runtime/this-firefox`
4. Click **"Load Temporary Add-on"**

---

## 📁 Structure

SoundForge-Equalizer/
├── 📁 Microsoft Edge/ # Edge/Chromium version
>>>>>>> ed88635764da01708c8e421bf76005872f576c8c
│ ├── background.js
│ ├── inject.js
│ ├── manifest.json
│ ├── popup.html
│ ├── popup.js
│ ├── style.css
│ ├── window.html
│ ├── window.js
│ ├── window.css
│ ├── 📁 features/
│ ├── 📁 icons/
│ └── 📁 modules/
<<<<<<< HEAD
└── 📁 Screenshots/ # Общие скриншоты
=======
├── 📁 Firefox/ # Firefox version
│ ├── background.js
│ ├── inject.js
│ ├── manifest.json
│ ├── popup.html
│ ├── popup.js
│ ├── style.css
│ ├── window.html
│ ├── window.js
│ ├── window.css
│ ├── 📁 features/
│ ├── 📁 icons/
│ └── 📁 modules/
└── 📁 Screenshots/ # Screenshots
>>>>>>> ed88635764da01708c8e421bf76005872f576c8c
├── Full Equalizer.png
├── soundforge-full-interfac.png
└── soundforge-light-ui.png

<<<<<<< HEAD
---

## 🛠️ Технологии

| Технология | Описание |
|------------|----------|
| **Manifest V3** | Современный стандарт расширений |
| **Web Audio API** | Обработка аудио |
| **Chrome Extensions API** | Работа с браузером |
| **CSS3** | Тёмная/светлая/системная темы |
| **JavaScript (ES Modules)** | Модульная архитектура |

---

## 📊 Статистика

- **10** полос эквалайзера
- **50** встроенных пресетов
- **4** эффекта визуализации
- **3** языка интерфейса (RU, UA, EN)
- **63** файла в репозитории
- **37 614** строк кода

---

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для вашей функции
3. Внесите изменения
4. Создайте Pull Request

---

## 📝 Лицензия
=======

---

## 🛠️ Technologies

| Technology | Description |
|------------|-------------|
| **Manifest V3** | Modern extension standard |
| **Web Audio API** | Audio processing |
| **Chrome Extensions API** | Browser integration |
| **CSS3** | Dark/Light/System themes |
| **JavaScript (ES Modules)** | Modular architecture |

---

## 📊 Statistics

- **10** EQ bands
- **50** built-in presets
- **4** visualization effects
- **3** languages (RU, UA, EN)
- **63** files in repository

---

## 📝 License
>>>>>>> ed88635764da01708c8e421bf76005872f576c8c

MIT License

---

<<<<<<< HEAD
## 👤 Автор
=======
## 👤 Author
>>>>>>> ed88635764da01708c8e421bf76005872f576c8c

**Maxim Melnikov**

[GitHub](https://github.com/Maximka1993271)

---

<<<<<<< HEAD
## ⭐ Поддержка

Если вам понравилось расширение:
- Поставьте ⭐ звезду на GitHub
- Поделитесь с друзьями
- Сообщите об ошибках в Issues

---

> **SoundForge Equalizer v3.22.8** — Сделайте звук таким, каким он должен быть! 🎵
=======
<p align="center">
  <b>Made with ❤️</b><br/>
  <b>Maxim Melnikov</b> — <a href="https://github.com/Maximka1993271">@Maximka1993271</a>
</p>

<p align="center">
  <sub>SoundForge Equalizer v3.22.8 — 2026</sub><br/>
  <sub>🔓 Open Source — fully open source code</sub>
</p>
>>>>>>> ed88635764da01708c8e421bf76005872f576c8c
