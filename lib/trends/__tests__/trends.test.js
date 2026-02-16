// lib/trends/__tests__/trends.test.js - Tests for trend analysis module

const {
  calculateLinearRegression,
  predictFutureValues,
  determineTrend,
  validateTimeWindow,
  calculateDowntimePareto,
  TIME_WINDOWS
} = require('../index');
const { schemaCache } = require('../../state');

describe('Trend Analysis Module', () => {
  describe('calculateLinearRegression', () => {
    it('should calculate correct slope and intercept for linear data', () => {
      const data = [
        { timestamp: '2026-02-03T10:00:00Z', value: 80 },
        { timestamp: '2026-02-03T11:00:00Z', value: 82 },
        { timestamp: '2026-02-03T12:00:00Z', value: 84 },
        { timestamp: '2026-02-03T13:00:00Z', value: 86 }
      ];

      const regression = calculateLinearRegression(data);

      expect(regression.slope).toBeCloseTo(2, 1);
      expect(regression.intercept).toBeCloseTo(80, 1);
      expect(regression.r2).toBeGreaterThan(0.95); // Very high R² for linear data
      expect(regression.count).toBe(4);
    });

    it('should handle empty data gracefully', () => {
      const regression = calculateLinearRegression([]);

      expect(regression.slope).toBe(0);
      expect(regression.intercept).toBe(0);
      expect(regression.r2).toBe(0);
      expect(regression.count).toBe(0);
    });

    it('should handle single data point', () => {
      const data = [{ timestamp: '2026-02-03T10:00:00Z', value: 50 }];
      const regression = calculateLinearRegression(data);

      expect(regression.slope).toBe(0);
      expect(regression.count).toBe(0); // Returns 0 because denominator is 0 (insufficient data for regression)
    });

    it('should calculate low R² for scattered data', () => {
      const data = [
        { timestamp: '2026-02-03T10:00:00Z', value: 10 },
        { timestamp: '2026-02-03T11:00:00Z', value: 50 },
        { timestamp: '2026-02-03T12:00:00Z', value: 20 },
        { timestamp: '2026-02-03T13:00:00Z', value: 60 }
      ];

      const regression = calculateLinearRegression(data);

      expect(regression.r2).toBeLessThan(0.5); // Low R² for scattered data
    });
  });

  describe('predictFutureValues', () => {
    it('should predict future values correctly', () => {
      const regression = { slope: 2, intercept: 80, r2: 0.95 };
      const predictions = predictFutureValues(regression, 3, 2);

      expect(predictions).toHaveLength(2);
      expect(predictions[0].value).toBeCloseTo(86, 1); // 2*3 + 80 = 86
      expect(predictions[1].value).toBeCloseTo(88, 1); // 2*4 + 80 = 88
      expect(predictions[0].confidence).toBeCloseTo(0.95, 2);
    });

    it('should not predict negative values', () => {
      const regression = { slope: -10, intercept: 5, r2: 0.8 };
      const predictions = predictFutureValues(regression, 1, 2);

      predictions.forEach(pred => {
        expect(pred.value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return confidence equal to R²', () => {
      const regression = { slope: 1, intercept: 50, r2: 0.75 };
      const predictions = predictFutureValues(regression, 2, 1);

      expect(predictions[0].confidence).toBe(0.75);
    });
  });

  describe('determineTrend', () => {
    it('should identify rising trend', () => {
      expect(determineTrend(0.1)).toBe('rising');
      expect(determineTrend(5)).toBe('rising');
    });

    it('should identify falling trend', () => {
      expect(determineTrend(-0.1)).toBe('falling');
      expect(determineTrend(-5)).toBe('falling');
    });

    it('should identify stable trend', () => {
      expect(determineTrend(0)).toBe('stable');
      expect(determineTrend(0.02)).toBe('stable');
      expect(determineTrend(-0.02)).toBe('stable');
    });

    it('should use custom threshold', () => {
      expect(determineTrend(0.03, 0.1)).toBe('stable'); // Below 0.1 threshold
      expect(determineTrend(0.15, 0.1)).toBe('rising'); // Above 0.1 threshold
    });
  });

  describe('validateTimeWindow', () => {
    it('should accept valid time windows', () => {
      expect(validateTimeWindow('hourly')).toBe('hourly');
      expect(validateTimeWindow('shift')).toBe('shift');
      expect(validateTimeWindow('daily')).toBe('daily');
      expect(validateTimeWindow('weekly')).toBe('weekly');
    });

    it('should return default for invalid window', () => {
      expect(validateTimeWindow('invalid')).toBe('shift');
      expect(validateTimeWindow(null)).toBe('shift');
      expect(validateTimeWindow(undefined)).toBe('shift');
    });
  });

  describe('TIME_WINDOWS configuration', () => {
    it('should have all required window types', () => {
      expect(TIME_WINDOWS).toHaveProperty('hourly');
      expect(TIME_WINDOWS).toHaveProperty('shift');
      expect(TIME_WINDOWS).toHaveProperty('daily');
      expect(TIME_WINDOWS).toHaveProperty('weekly');
    });

    it('should have required properties for each window', () => {
      Object.values(TIME_WINDOWS).forEach(window => {
        expect(window).toHaveProperty('range');
        expect(window).toHaveProperty('aggregation');
        expect(window).toHaveProperty('buckets');
        expect(window).toHaveProperty('futureWindow');
        expect(window).toHaveProperty('futureBuckets');
      });
    });

    it('should have correct bucket counts', () => {
      expect(TIME_WINDOWS.hourly.buckets).toBe(12);
      expect(TIME_WINDOWS.shift.buckets).toBe(16);
      expect(TIME_WINDOWS.daily.buckets).toBe(24);
      expect(TIME_WINDOWS.weekly.buckets).toBe(28);
    });
  });

  describe('calculateDowntimePareto', () => {
    beforeEach(() => {
      // Clear schema cache before each test
      schemaCache.measurements.clear();
      schemaCache.lastRefresh = null;
    });

    it('should use schema cache to discover state measurements for Enterprise A', async () => {
      // Mock schema cache with Enterprise A state measurements
      schemaCache.measurements.set('machine_state', {
        name: 'machine_state',
        count: 100,
        valueType: 'string',
        sampleValues: ['RUNNING', 'DOWN', 'IDLE'],
        enterprises: ['Enterprise A'],
        sites: ['Dallas Line 1'],
        classification: 'state_status'
      });
      schemaCache.measurements.set('equipment_status', {
        name: 'equipment_status',
        count: 50,
        valueType: 'numeric',
        sampleValues: [1, 2, 3],
        enterprises: ['Enterprise A'],
        sites: ['Dallas Line 1'],
        classification: 'state_status'
      });

      // Mock queryApi to verify the filter was built correctly
      const mockQueryRows = jest.spyOn(require('../../influx/client').queryApi, 'queryRows')
        .mockImplementation((query, handlers) => {
          // Verify query contains exact measurement filters (not suffix matching)
          expect(query).toContain('r._measurement == "machine_state"');
          expect(query).toContain('r._measurement == "equipment_status"');
          expect(query).not.toContain('strings.hasSuffix');
          handlers.complete();
        });

      await calculateDowntimePareto('Enterprise A', 'daily', 10);

      expect(mockQueryRows).toHaveBeenCalled();
      mockQueryRows.mockRestore();
    });

    it('should use schema cache to discover state measurements for Enterprise B', async () => {
      // Mock schema cache with Enterprise B state measurements
      schemaCache.measurements.set('line_status', {
        name: 'line_status',
        count: 200,
        valueType: 'string',
        sampleValues: ['running', 'stopped', 'fault'],
        enterprises: ['Enterprise B'],
        sites: ['Site3'],
        classification: 'state_status'
      });

      const mockQueryRows = jest.spyOn(require('../../influx/client').queryApi, 'queryRows')
        .mockImplementation((query, handlers) => {
          expect(query).toContain('r._measurement == "line_status"');
          expect(query).not.toContain('strings.hasSuffix');
          handlers.complete();
        });

      await calculateDowntimePareto('Enterprise B', 'daily', 10);

      expect(mockQueryRows).toHaveBeenCalled();
      mockQueryRows.mockRestore();
    });

    it('should use schema cache to discover state measurements for Enterprise C', async () => {
      // Mock schema cache with Enterprise C state measurements (existing _STATE suffix pattern)
      schemaCache.measurements.set('CHR01_STATE', {
        name: 'CHR01_STATE',
        count: 150,
        valueType: 'numeric',
        sampleValues: [1, 2, 3],
        enterprises: ['Enterprise C'],
        sites: ['Main'],
        classification: 'state_status'
      });
      schemaCache.measurements.set('SUM500_STATUS', {
        name: 'SUM500_STATUS',
        count: 120,
        valueType: 'numeric',
        sampleValues: [1, 2, 3],
        enterprises: ['Enterprise C'],
        sites: ['Main'],
        classification: 'state_status'
      });

      const mockQueryRows = jest.spyOn(require('../../influx/client').queryApi, 'queryRows')
        .mockImplementation((query, handlers) => {
          expect(query).toContain('r._measurement == "CHR01_STATE"');
          expect(query).toContain('r._measurement == "SUM500_STATUS"');
          expect(query).not.toContain('strings.hasSuffix');
          handlers.complete();
        });

      await calculateDowntimePareto('Enterprise C', 'daily', 10);

      expect(mockQueryRows).toHaveBeenCalled();
      mockQueryRows.mockRestore();
    });

    it('should fall back to suffix matching when schema cache is empty', async () => {
      // Leave schema cache empty to trigger fallback
      const mockQueryRows = jest.spyOn(require('../../influx/client').queryApi, 'queryRows')
        .mockImplementation((query, handlers) => {
          expect(query).toContain('strings.hasSuffix');
          expect(query).toContain('suffix: "_state"');
          expect(query).toContain('suffix: "_STATUS"');
          handlers.complete();
        });

      await calculateDowntimePareto('Enterprise A', 'daily', 10);

      expect(mockQueryRows).toHaveBeenCalled();
      mockQueryRows.mockRestore();
    });

    it('should filter measurements by enterprise when enterprise is specified', async () => {
      // Add measurements for multiple enterprises
      schemaCache.measurements.set('machine_state_a', {
        name: 'machine_state_a',
        count: 100,
        valueType: 'string',
        sampleValues: ['RUNNING', 'DOWN'],
        enterprises: ['Enterprise A'],
        classification: 'state_status'
      });
      schemaCache.measurements.set('machine_state_b', {
        name: 'machine_state_b',
        count: 200,
        valueType: 'string',
        sampleValues: ['running', 'stopped'],
        enterprises: ['Enterprise B'],
        classification: 'state_status'
      });

      const mockQueryRows = jest.spyOn(require('../../influx/client').queryApi, 'queryRows')
        .mockImplementation((query, handlers) => {
          // Should only include Enterprise A measurements
          expect(query).toContain('r._measurement == "machine_state_a"');
          expect(query).not.toContain('machine_state_b');
          handlers.complete();
        });

      await calculateDowntimePareto('Enterprise A', 'daily', 10);

      expect(mockQueryRows).toHaveBeenCalled();
      mockQueryRows.mockRestore();
    });

    it('should include all enterprises when enterprise is ALL', async () => {
      schemaCache.measurements.set('state_a', {
        name: 'state_a',
        enterprises: ['Enterprise A'],
        classification: 'state_status'
      });
      schemaCache.measurements.set('state_b', {
        name: 'state_b',
        enterprises: ['Enterprise B'],
        classification: 'state_status'
      });
      schemaCache.measurements.set('state_c', {
        name: 'state_c',
        enterprises: ['Enterprise C'],
        classification: 'state_status'
      });

      const mockQueryRows = jest.spyOn(require('../../influx/client').queryApi, 'queryRows')
        .mockImplementation((query, handlers) => {
          expect(query).toContain('state_a');
          expect(query).toContain('state_b');
          expect(query).toContain('state_c');
          handlers.complete();
        });

      await calculateDowntimePareto('ALL', 'daily', 10);

      expect(mockQueryRows).toHaveBeenCalled();
      mockQueryRows.mockRestore();
    });
  });
});
