/**
 * Basic Logger implementation for Claudette
 */

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  fatal(message: string, ...args: any[]): void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

class BasicLogger implements Logger {
  private logLevel: LogLevel = 'info';
  private enableConsoleOutput: boolean = true;

  constructor(level: LogLevel = 'info', enableConsole: boolean = true) {
    this.logLevel = level;
    this.enableConsoleOutput = enableConsole;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    // Format timestamp in local timezone
    const now = new Date();
    const timestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + 'T' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0') + '.' +
      String(now.getMilliseconds()).padStart(3, '0') + 
      (now.getTimezoneOffset() >= 0 ? '-' : '+') +
      String(Math.abs(Math.floor(now.getTimezoneOffset() / 60))).padStart(2, '0') + 
      String(Math.abs(now.getTimezoneOffset() % 60)).padStart(2, '0');
    
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] [CLAUDETTE] ${level.toUpperCase()}: ${message}${formattedArgs}`;
  }

  private writeLog(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level) || !this.enableConsoleOutput) return;

    const formatted = this.formatMessage(level, message, ...args);
    
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setConsoleOutput(enabled: boolean): void {
    this.enableConsoleOutput = enabled;
  }

  debug(message: string, ...args: any[]): void {
    this.writeLog('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.writeLog('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.writeLog('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.writeLog('error', message, ...args);
  }

  fatal(message: string, ...args: any[]): void {
    this.writeLog('fatal', message, ...args);
  }
}

// Export both the interface and a default instance
export const Logger = BasicLogger;
export const logger = new BasicLogger();
export default logger;