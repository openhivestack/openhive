import { inspect } from 'util';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export class Logger {
  private static lastTimestamp?: number;
  private static instance?: Logger = new Logger();

  // Store original console methods into a static map for robust retrieval
  private static getOriginal(method: any): any {
      return (method as any).__original || method;
  }

  // Initialize with the true originals, resolving potentially existing wrappers
  private static originalLog = Logger.getOriginal(console.log);
  private static originalError = Logger.getOriginal(console.error);
  private static originalWarn = Logger.getOriginal(console.warn);
  private static originalDebug = Logger.getOriginal(console.debug);
  private static originalInfo = Logger.getOriginal(console.info);

  constructor(protected context?: string) {}

  public static overrideConsole() {
    const mkWrapper = (original: any, level: LogLevel) => {
        const wrapper = (...args: any[]) => {
            // If the message is already formatted (starts with color code), pass it through
            // This is a safety valve for recursion or double-processing
            if (args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('\x1b[3')) {
                original(...args);
                return;
            }
            if (level === 'log') Logger.log(Logger.formatArgs(args));
            else if (level === 'error') Logger.error(Logger.formatArgs(args));
            else if (level === 'warn') Logger.warn(Logger.formatArgs(args));
            else if (level === 'debug') Logger.debug(Logger.formatArgs(args));
        };
        (wrapper as any).__original = original;
        return wrapper;
    };

    console.log = mkWrapper(this.originalLog, 'log');
    console.info = mkWrapper(this.originalInfo, 'log');
    console.error = mkWrapper(this.originalError, 'error');
    console.warn = mkWrapper(this.originalWarn, 'warn');
    console.debug = mkWrapper(this.originalDebug, 'debug');
  }

  private static formatArgs(args: any[]): string {
    if (args.length === 0) return '';
    if (args.length === 1) {
        if (typeof args[0] === 'string') return args[0];
        return inspect(args[0], { colors: true, depth: null });
    }
    // Handle format strings if the first arg is a string (basic naive check, or just join)
    // For simplicity in this logger, we'll just join valid objects
    return args.map(arg => 
        typeof arg === 'string' ? arg : inspect(arg, { colors: true, depth: null })
    ).join(' ');
  }

  public static log(message: any, context?: string) {
    this.printMessage('log', message, context);
  }

  public static error(message: any, trace?: string, context?: string) {
    this.printMessage('error', message, context, trace);
  }

  public static warn(message: any, context?: string) {
    this.printMessage('warn', message, context);
  }

  public static debug(message: any, context?: string) {
    this.printMessage('debug', message, context);
  }

  public static verbose(message: any, context?: string) {
    this.printMessage('verbose', message, context);
  }

  private static printMessage(
    level: LogLevel,
    message: any,
    context?: string,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const pid = '';
    const contextMessage = context ? `[${context}] ` : '';
    const output = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    
    let color = '';
    switch (level) {
      case 'log': color = '\x1b[32m'; break; // Green
      case 'error': color = '\x1b[31m'; break; // Red
      case 'warn': color = '\x1b[33m'; break; // Yellow
      case 'debug': color = '\x1b[35m'; break; // Magenta
      case 'verbose': color = '\x1b[36m'; break; // Cyan
    }
    const resetColor = '\x1b[0m';
    const dimColor = '\x1b[2m';

    const formattedMessage = `${color}[${level.toUpperCase()}]${resetColor} ${dimColor}${timestamp} ${pid}${resetColor} - ${contextMessage}${output}`;

    if (trace) {
      Logger.originalError(formattedMessage);
      Logger.originalError(trace);
    } else {
        if (level === 'error') {
            Logger.originalError(formattedMessage);
        } else if (level === 'warn') {
            Logger.originalWarn(formattedMessage);
        } else {
            Logger.originalLog(formattedMessage);
        }
    }
  }
}
