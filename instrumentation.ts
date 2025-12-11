
import { Logger } from '@/lib/logger';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
      Logger.overrideConsole();
      Logger.log('Global console overridden with Custom Logger', 'Instrumentation');
  }
}
