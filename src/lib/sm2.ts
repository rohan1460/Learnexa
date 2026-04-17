/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * Quality ratings:
 * 0 - Complete blackout
 * 1 - Incorrect, but upon seeing the answer, remembered
 * 2 - Incorrect, but the answer seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct with some hesitation
 * 5 - Perfect response
 */

export interface SM2Input {
  quality: number;       // 0-5 rating
  easeFactor: number;    // Current ease factor (>= 1.3)
  interval: number;      // Current interval in days
  repetitions: number;   // Number of successful repetitions
}

export interface SM2Output {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
}

export function calculateNextReview(input: SM2Input): SM2Output {
  let { quality, easeFactor, interval, repetitions } = input;

  // Clamp quality to [0, 5]
  quality = Math.max(0, Math.min(5, quality));

  if (quality < 3) {
    // Failed — reset repetitions but keep current (possibly lowered) ease factor
    repetitions = 0;
    interval = 1;
  } else {
    // Successful recall
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor using SM-2 formula
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ease factor must not go below 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Calculate the next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReview,
  };
}

/**
 * Map user button choices to quality ratings.
 */
export function qualityFromButton(button: "again" | "hard" | "good" | "easy"): number {
  switch (button) {
    case "again": return 1;
    case "hard": return 3;
    case "good": return 4;
    case "easy": return 5;
  }
}
