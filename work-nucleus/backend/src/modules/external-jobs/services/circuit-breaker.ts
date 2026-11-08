import { Logger } from '@nestjs/common';

/**
 * Simple circuit breaker for external API connectors.
 * If a source fails 3 consecutive times, it's disabled for 30 minutes.
 */
export class CircuitBreaker {
  private readonly logger = new Logger('CircuitBreaker');
  private failures: Map<string, { count: number; disabledUntil: number }> =
    new Map();

  private readonly maxFailures: number;
  private readonly cooldownMs: number;

  constructor(maxFailures = 3, cooldownMinutes = 30) {
    this.maxFailures = maxFailures;
    this.cooldownMs = cooldownMinutes * 60 * 1000;
  }

  /**
   * Check if a source is currently allowed to execute.
   */
  isOpen(sourceName: string): boolean {
    const state = this.failures.get(sourceName);
    if (!state) return false; // No failures — circuit closed (allowed)

    if (state.count >= this.maxFailures) {
      if (Date.now() < state.disabledUntil) {
        return true; // Circuit open — blocked
      }
      // Cooldown expired — reset and allow (half-open)
      this.logger.log(
        `Circuit breaker for ${sourceName} cooldown expired, resetting`,
      );
      this.failures.delete(sourceName);
      return false;
    }

    return false;
  }

  /**
   * Record a successful execution — resets failure count.
   */
  recordSuccess(sourceName: string): void {
    if (this.failures.has(sourceName)) {
      this.failures.delete(sourceName);
      this.logger.log(`Circuit breaker for ${sourceName} reset after success`);
    }
  }

  /**
   * Record a failure — may trip the circuit breaker.
   */
  recordFailure(sourceName: string): void {
    const state = this.failures.get(sourceName) || {
      count: 0,
      disabledUntil: 0,
    };
    state.count++;

    if (state.count >= this.maxFailures) {
      state.disabledUntil = Date.now() + this.cooldownMs;
      this.logger.warn(
        `Circuit breaker TRIPPED for ${sourceName} — disabled for ${this.cooldownMs / 60000} minutes (${state.count} consecutive failures)`,
      );
    }

    this.failures.set(sourceName, state);
  }

  /**
   * Get status summary for monitoring.
   */
  getStatus(): Record<string, { failures: number; isOpen: boolean; disabledUntilISO?: string }> {
    const result: Record<string, any> = {};
    for (const [name, state] of this.failures) {
      result[name] = {
        failures: state.count,
        isOpen: this.isOpen(name),
        ...(state.disabledUntil > Date.now()
          ? { disabledUntilISO: new Date(state.disabledUntil).toISOString() }
          : {}),
      };
    }
    return result;
  }
}

