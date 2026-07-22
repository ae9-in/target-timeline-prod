import { calculateRagStatus } from './rag.util';

describe('RAG Status Calculations', () => {
  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const deadline = new Date('2026-01-11T00:00:00.000Z'); // 10 days duration
  const baseline = 0;
  const targetValue = 100;

  it('should calculate GREEN status when actual progress meets or exceeds expected progress', () => {
    // 5 days elapsed (50% expected progress)
    const asOfDate = new Date('2026-01-06T00:00:00.000Z');
    const currentValue = 50; // 50% actual progress

    const result = calculateRagStatus(startDate, deadline, baseline, targetValue, currentValue, 'up', asOfDate);
    expect(result.expectedProgress).toBe(0.5);
    expect(result.actualProgress).toBe(0.5);
    expect(result.gap).toBe(0);
    expect(result.ragStatus).toBe('GREEN');
  });

  it('should calculate AMBER status when actual progress is behind expected by 5% to 20%', () => {
    // 5 days elapsed (50% expected progress)
    const asOfDate = new Date('2026-01-06T00:00:00.000Z');
    const currentValue = 40; // 40% actual progress (10% gap)

    const result = calculateRagStatus(startDate, deadline, baseline, targetValue, currentValue, 'up', asOfDate);
    expect(result.ragStatus).toBe('AMBER');
    expect(result.gap).toBeCloseTo(0.1);
  });

  it('should calculate RED status when actual progress is behind expected by more than 20%', () => {
    // 5 days elapsed (50% expected progress)
    const asOfDate = new Date('2026-01-06T00:00:00.000Z');
    const currentValue = 25; // 25% actual progress (25% gap)

    const result = calculateRagStatus(startDate, deadline, baseline, targetValue, currentValue, 'up', asOfDate);
    expect(result.ragStatus).toBe('RED');
    expect(result.gap).toBeCloseTo(0.25);
  });

  it('should calculate RED status if deadline has passed and target is not met', () => {
    // 12 days elapsed (past 10 days deadline)
    const asOfDate = new Date('2026-01-13T00:00:00.000Z');
    const currentValue = 95; // 95% actual progress

    const result = calculateRagStatus(startDate, deadline, baseline, targetValue, currentValue, 'up', asOfDate);
    expect(result.ragStatus).toBe('RED');
  });

  it('should calculate GREEN status if deadline has passed and target is met', () => {
    const asOfDate = new Date('2026-01-13T00:00:00.000Z');
    const currentValue = 100;

    const result = calculateRagStatus(startDate, deadline, baseline, targetValue, currentValue, 'up', asOfDate);
    expect(result.ragStatus).toBe('GREEN');
  });

  it('should calculate correct RAG status for downward targets', () => {
    // Downward target: lower is better (e.g., incidents from 10 to 0)
    const downBaseline = 10;
    const downTarget = 0;
    const asOfDate = new Date('2026-01-06T00:00:00.000Z'); // 50% expected

    // 50% expected progress means target is 5.
    // If current is 5, we are on track.
    const resultGood = calculateRagStatus(startDate, deadline, downBaseline, downTarget, 5, 'down', asOfDate);
    expect(resultGood.ragStatus).toBe('GREEN');

    // If current is 8, we have progress of (10-8)/(10-0) = 20%. Expected is 50%. Gap is 30% -> RED.
    const resultBad = calculateRagStatus(startDate, deadline, downBaseline, downTarget, 8, 'down', asOfDate);
    expect(resultBad.ragStatus).toBe('RED');
  });
});
