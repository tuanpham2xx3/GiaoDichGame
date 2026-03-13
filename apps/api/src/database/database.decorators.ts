import { Inject } from '@nestjs/common';
import { DRIZZLE } from './database.module';

/**
 * Shortcut decorator to inject the Drizzle database instance.
 * Usage: constructor(@InjectDrizzle() private db: DrizzleDb) {}
 */
export const InjectDrizzle = () => Inject(DRIZZLE);

// Re-export the token for direct use in providers
export { DRIZZLE };
