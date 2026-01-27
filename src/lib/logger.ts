type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  debug(message: string, meta?: LogMeta) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: LogMeta) {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: LogMeta) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: unknown) {
    // Always log errors, but sanitize sensitive data
    const sanitizedError = this.sanitizeError(error);
    console.error(this.formatMessage('error', message, sanitizedError));
  }

  private sanitizeError(error: unknown): unknown {
    if (!error) return error;

    // Remove sensitive information from error objects
    const sanitized = { ...error };

    // Remove tokens, passwords, secrets from error messages
    if (typeof error === 'object') {
      delete sanitized.token;
      delete sanitized.password;
      delete sanitized.secret;
      delete sanitized.Authorization;

      // Sanitize message if it contains sensitive data
      if (sanitized.message && typeof sanitized.message === 'string') {
        sanitized.message = sanitized.message.replace(/Bearer\s+[^\s]+/g, 'Bearer [REDACTED]');
        sanitized.message = sanitized.message.replace(/session_[^\s]+/g, 'session_[REDACTED]');
      }
    }

    return sanitized;
  }
}

export const logger = new Logger();