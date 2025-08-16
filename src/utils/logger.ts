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

class BasicLogger implements Logger {
  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    console.debug(this.formatMessage('debug', message, ...args));
  }

  info(message: string, ...args: any[]): void {
    console.info(this.formatMessage('info', message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message, ...args));
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message, ...args));
  }

  fatal(message: string, ...args: any[]): void {
    console.error(this.formatMessage('fatal', message, ...args));
  }
}

// Export both the interface and a default instance
export const Logger = BasicLogger;
export const logger = new BasicLogger();
export default logger;