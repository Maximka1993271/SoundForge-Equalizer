// ============================================
//  LOGGER.JS - Система структурированного логирования
//  Модуль для использования во всех компонентах
//  Версия: 1.0.0
//  ИСПРАВЛЕНО: обработка ошибок localStorage
// ============================================

/**
 * Уровни логирования
 */
export const LOG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
};

/**
 * Имена уровней для вывода
 */
const LEVEL_NAMES = {
  0: 'NONE',
  1: 'ERROR',
  2: 'WARN',
  3: 'INFO',
  4: 'DEBUG',
  5: 'TRACE'
};

/**
 * Цвета для консоли
 */
const COLORS = {
  ERROR: '#ff6b6b',
  WARN: '#ffd93d',
  INFO: '#4ecdc4',
  DEBUG: '#4a9eff',
  TRACE: '#a29bfe',
  RESET: '#ffffff'
};

/**
 * Конфигурация по умолчанию
 */
const DEFAULT_CONFIG = {
  level: LOG_LEVELS.INFO,
  showTimestamp: true,
  showModule: true,
  showLevel: true,
  colors: true,
  persistToStorage: true,
  maxStoredLogs: 100
};

/**
 * Класс Logger
 */
class Logger {
  constructor(moduleName, config = {}) {
    this.moduleName = moduleName;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logs = [];
    this._logCount = 0;
    this._loadConfig();
  }

  /**
   * Загрузка конфигурации из localStorage
   */
  _loadConfig() {
    try {
      const saved = localStorage.getItem('soundforge_logger_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      }
    } catch (e) {
      // Игнорируем ошибки при загрузке
    }
  }

  /**
   * Сохранение конфигурации в localStorage
   */
  _saveConfig() {
    try {
      localStorage.setItem('soundforge_logger_config', JSON.stringify(this.config));
    } catch (e) {
      // Игнорируем ошибки при сохранении
    }
  }

  /**
   * Установка уровня логирования
   */
  setLevel(level) {
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase();
      if (LOG_LEVELS[upperLevel] !== undefined) {
        this.config.level = LOG_LEVELS[upperLevel];
      } else {
        console.warn(`⚠️ Неизвестный уровень логирования: ${level}`);
        return;
      }
    } else if (typeof level === 'number') {
      this.config.level = Math.max(0, Math.min(5, level));
    } else {
      return;
    }
    this._saveConfig();
  }

  /**
   * Получение текущего уровня
   */
  getLevel() {
    return this.config.level;
  }

  /**
   * Получение имени текущего уровня
   */
  getLevelName() {
    return LEVEL_NAMES[this.config.level] || 'INFO';
  }

  /**
   * Основной метод логирования
   */
  _log(level, message, data = null) {
    if (level > this.config.level) return;
    if (level === LOG_LEVELS.NONE) return;

    const levelName = LEVEL_NAMES[level] || 'UNKNOWN';
    this._logCount++;

    const entry = {
      id: this._logCount,
      timestamp: new Date().toISOString(),
      level: level,
      levelName: levelName,
      module: this.moduleName,
      message: message,
      data: data !== undefined && data !== null ? data : null
    };

    if (this.config.persistToStorage) {
      this.logs.push(entry);
      if (this.logs.length > this.config.maxStoredLogs) {
        this.logs.shift();
      }
      try {
        localStorage.setItem(
          `soundforge_logs_${this.moduleName}`,
          JSON.stringify(this.logs.slice(-this.config.maxStoredLogs))
        );
      } catch (e) {
        // Игнорируем ошибки
      }
    }

    this._printToConsole(entry);
  }

  /**
   * Вывод в консоль с форматированием
   */
  _printToConsole(entry) {
    const { timestamp, levelName, module, message, data } = entry;

    let label = '';
    if (this.config.showTimestamp) {
      const time = timestamp.split('T')[1].slice(0, 12);
      label += `[${time}] `;
    }
    if (this.config.showLevel) {
      label += `[${levelName}] `;
    }
    if (this.config.showModule) {
      label += `[${module}] `;
    }
    label += message;

    const consoleMethod = {
      [LOG_LEVELS.ERROR]: 'error',
      [LOG_LEVELS.WARN]: 'warn',
      [LOG_LEVELS.INFO]: 'log',
      [LOG_LEVELS.DEBUG]: 'log',
      [LOG_LEVELS.TRACE]: 'log'
    };

    const method = consoleMethod[entry.level] || 'log';

    if (this.config.colors && entry.level <= LOG_LEVELS.INFO) {
      const color = COLORS[levelName] || COLORS.RESET;
      console[method](
        `%c${label}%c`,
        `color: ${color}; font-weight: bold;`,
        'color: ' + COLORS.RESET,
        data !== null ? data : ''
      );
    } else {
      console[method](label, data !== null ? data : '');
    }
  }

  /**
   * Логирование ошибок
   */
  error(message, data = null) {
    this._log(LOG_LEVELS.ERROR, '❌ ' + message, data);
  }

  /**
   * Логирование предупреждений
   */
  warn(message, data = null) {
    this._log(LOG_LEVELS.WARN, '⚠️ ' + message, data);
  }

  /**
   * Логирование информации
   */
  info(message, data = null) {
    this._log(LOG_LEVELS.INFO, 'ℹ️ ' + message, data);
  }

  /**
   * Логирование для отладки
   */
  debug(message, data = null) {
    this._log(LOG_LEVELS.DEBUG, '🐛 ' + message, data);
  }

  /**
   * Детальное логирование
   */
  trace(message, data = null) {
    this._log(LOG_LEVELS.TRACE, '🔍 ' + message, data);
  }

  /**
   * Логирование начала операции
   */
  start(operation, data = null) {
    this.debug(`▶️ НАЧАЛО: ${operation}`, data);
  }

  /**
   * Логирование завершения операции
   */
  end(operation, data = null) {
    this.debug(`✅ КОНЕЦ: ${operation}`, data);
  }

  /**
   * Логирование шага операции
   */
  step(step, data = null) {
    this.trace(`  ➜ ${step}`, data);
  }

  /**
   * Получение сохраненных логов
   */
  getLogs(limit = 100) {
    try {
      const saved = localStorage.getItem(`soundforge_logs_${this.moduleName}`);
      if (saved) {
        const logs = JSON.parse(saved);
        return logs.slice(-limit);
      }
    } catch (e) {
      // Игнорируем
    }
    return [];
  }

  /**
   * Очистка сохраненных логов
   */
  clearLogs() {
    this.logs = [];
    try {
      localStorage.removeItem(`soundforge_logs_${this.moduleName}`);
    } catch (e) {
      // Игнорируем
    }
  }

  /**
   * Группировка логов
   */
  group(name, fn) {
    console.group(`📁 ${name} (${this.moduleName})`);
    try {
      fn();
    } catch (e) {
      this.error('Ошибка в группе', { error: e.message });
    }
    console.groupEnd();
  }
}

/**
 * Фабрика логгеров
 */
export function createLogger(moduleName, config = {}) {
  return new Logger(moduleName, config);
}

/**
 * Глобальная настройка уровня логирования
 */
export function setGlobalLogLevel(level) {
  try {
    const config = JSON.parse(localStorage.getItem('soundforge_logger_config') || '{}');
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase();
      if (LOG_LEVELS[upperLevel] !== undefined) {
        config.level = LOG_LEVELS[upperLevel];
      } else {
        console.warn(`⚠️ Неизвестный уровень логирования: ${level}`);
        return;
      }
    } else if (typeof level === 'number') {
      config.level = Math.max(0, Math.min(5, level));
    } else {
      return;
    }
    localStorage.setItem('soundforge_logger_config', JSON.stringify(config));
    console.log(`🔊 SoundForge: Уровень логирования установлен на ${LEVEL_NAMES[config.level]}`);
  } catch (e) {
    console.warn('Ошибка установки уровня логирования', e);
  }
}

/**
 * Получение текущего глобального уровня
 */
export function getGlobalLogLevel() {
  try {
    const config = JSON.parse(localStorage.getItem('soundforge_logger_config') || '{}');
    return config.level !== undefined ? config.level : LOG_LEVELS.INFO;
  } catch (e) {
    return LOG_LEVELS.INFO;
  }
}

/**
 * Получение имени глобального уровня
 */
export function getGlobalLogLevelName() {
  return LEVEL_NAMES[getGlobalLogLevel()] || 'INFO';
}

/**
 * Очистка всех логов
 */
export function clearAllLogs() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('soundforge_logs_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('🧹 Все логи SoundForge очищены');
  } catch (e) {
    console.warn('Ошибка очистки логов', e);
  }
}

// ============================================
//  ПОДДЕРЖКА КОНСОЛЬНЫХ КОМАНД
// ============================================

if (typeof window !== 'undefined') {
  window.SoundForgeLogger = {
    setLevel: setGlobalLogLevel,
    getLevel: getGlobalLogLevel,
    getLevelName: getGlobalLogLevelName,
    clearAllLogs: clearAllLogs,
    LOG_LEVELS: LOG_LEVELS
  };

  console.log('🔊 SoundForge Logger готов');
  console.log(`📊 Текущий уровень: ${getGlobalLogLevelName()}`);
  console.log('💡 Используйте: SoundForgeLogger.setLevel("DEBUG") для отладки');
}

// ============================================
//  ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
  createLogger,
  setGlobalLogLevel,
  getGlobalLogLevel,
  getGlobalLogLevelName,
  clearAllLogs,
  LOG_LEVELS
};