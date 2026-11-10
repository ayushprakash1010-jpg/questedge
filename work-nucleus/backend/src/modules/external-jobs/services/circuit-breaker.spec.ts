import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3, 30);
  });

  describe('isOpen()', () => {
    it('should return false for an unknown source (circuit closed)', () => {
      expect(breaker.isOpen('test-source')).toBe(false);
    });

    it('should return false after fewer than max failures', () => {
      breaker.recordFailure('api');
      breaker.recordFailure('api');
      expect(breaker.isOpen('api')).toBe(false);
    });

    it('should return true after reaching max failures', () => {
      breaker.recordFailure('api');
      breaker.recordFailure('api');
      breaker.recordFailure('api');
      expect(breaker.isOpen('api')).toBe(true);
    });

    it('should return false after cooldown expires', () => {
      // Use a 0-minute cooldown for instant expiry
      const fastBreaker = new CircuitBreaker(2, 0);
      fastBreaker.recordFailure('api');
      fastBreaker.recordFailure('api');
      // disabledUntil = Date.now() + 0 → already expired
      expect(fastBreaker.isOpen('api')).toBe(false);
    });
  });

  describe('recordSuccess()', () => {
    it('should reset failure count and close the circuit', () => {
      breaker.recordFailure('api');
      breaker.recordFailure('api');
      breaker.recordSuccess('api');
      expect(breaker.isOpen('api')).toBe(false);
    });

    it('should be a no-op for a source with no failures', () => {
      breaker.recordSuccess('api');
      expect(breaker.isOpen('api')).toBe(false);
    });

    it('should reset even an open circuit', () => {
      breaker.recordFailure('api');
      breaker.recordFailure('api');
      breaker.recordFailure('api');
      expect(breaker.isOpen('api')).toBe(true);
      breaker.recordSuccess('api');
      expect(breaker.isOpen('api')).toBe(false);
    });
  });

  describe('recordFailure()', () => {
    it('should accumulate failures per source independently', () => {
      breaker.recordFailure('a');
      breaker.recordFailure('a');
      breaker.recordFailure('a');
      breaker.recordFailure('b');
      expect(breaker.isOpen('a')).toBe(true);
      expect(breaker.isOpen('b')).toBe(false);
    });
  });

  describe('getStatus()', () => {
    it('should return empty for no failures', () => {
      expect(breaker.getStatus()).toEqual({});
    });

    it('should show failure count and open state', () => {
      breaker.recordFailure('api');
      breaker.recordFailure('api');
      breaker.recordFailure('api');
      const status = breaker.getStatus();
      expect(status['api']).toBeDefined();
      expect(status['api'].failures).toBe(3);
      expect(status['api'].isOpen).toBe(true);
      expect(status['api'].disabledUntilISO).toBeDefined();
    });

    it('should show closed state with partial failures', () => {
      breaker.recordFailure('api');
      const status = breaker.getStatus();
      expect(status['api'].failures).toBe(1);
      expect(status['api'].isOpen).toBe(false);
    });
  });

  describe('custom thresholds', () => {
    it('should respect custom maxFailures', () => {
      const custom = new CircuitBreaker(1, 30);
      custom.recordFailure('api');
      expect(custom.isOpen('api')).toBe(true);
    });

    it('should default to 3 failures and 30 min cooldown', () => {
      const defaults = new CircuitBreaker();
      defaults.recordFailure('api');
      defaults.recordFailure('api');
      expect(defaults.isOpen('api')).toBe(false);
      defaults.recordFailure('api');
      expect(defaults.isOpen('api')).toBe(true);
    });
  });
});
