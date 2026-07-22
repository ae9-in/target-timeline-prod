export interface RagResult {
  expectedProgress: number; // 0 to 1
  actualProgress: number;
  gap: number;
  ragStatus: 'GREEN' | 'AMBER' | 'RED';
}

export function calculateRagStatus(
  startDate: Date,
  deadline: Date,
  baseline: number,
  targetValue: number,
  currentValue: number,
  direction: 'up' | 'down',
  asOfDate: Date = new Date(),
): RagResult {
  const totalTime = deadline.getTime() - startDate.getTime();
  const timeElapsed = asOfDate.getTime() - startDate.getTime();

  let expectedProgress = 0;
  if (totalTime > 0) {
    expectedProgress = Math.max(0, Math.min(1, timeElapsed / totalTime));
  }

  // Avoid division by zero
  const targetDiff = direction === 'up' ? targetValue - baseline : baseline - targetValue;
  let actualProgress = 0;

  if (targetDiff !== 0) {
    if (direction === 'up') {
      actualProgress = (currentValue - baseline) / targetDiff;
    } else {
      actualProgress = (baseline - currentValue) / targetDiff;
    }
  } else {
    actualProgress = currentValue === targetValue ? 1 : 0;
  }

  // If deadline has passed
  const isDeadlinePassed = asOfDate > deadline;
  let ragStatus: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';

  if (isDeadlinePassed) {
    // If deadline passed and target is not fully met
    ragStatus = actualProgress >= 1 ? 'GREEN' : 'RED';
  } else {
    const gap = expectedProgress - actualProgress;
    if (gap > 0.20) {
      ragStatus = 'RED';
    } else if (gap > 0.05) {
      ragStatus = 'AMBER';
    } else {
      ragStatus = 'GREEN';
    }
  }

  return {
    expectedProgress,
    actualProgress,
    gap: expectedProgress - actualProgress,
    ragStatus,
  };
}
