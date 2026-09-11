import { secretStore } from './store.js';

export class SecretPruner {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(intervalMs: number = 60000) {
    this.intervalMs = intervalMs;
  }

  public start() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      try {
        const deleted = secretStore.pruneExpiredSecrets();
        if (deleted > 0) {
          console.log(`[Pruner] Purged ${deleted} expired ephemeral secrets from database.`);
        }
      } catch (err) {
        console.error('[Pruner] Error during expired secrets cleanup:', err);
      }
    }, this.intervalMs);

    // Unref timer so it doesn't prevent Node process termination
    this.timer.unref();
    console.log(`[Pruner] Ephemeral secret sweeper active (interval: ${this.intervalMs / 1000}s).`);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Pruner] Secret sweeper stopped.');
    }
  }
}

export const secretPruner = new SecretPruner();
