/**
 * Shared constants for EngliQuest
 * These constants are used across the application for quiz generation and user interests
 */

/**
 * Available interests for quiz generation
 * These interests are used to contextualize quiz questions based on user preferences
 */
export const INTERESTS = [
  'Adventure Stories',
  'Friendship',
  'Fantasy & Magic',
  'Music & Arts',
  'Sports & Games',
  'Nature & Animals',
  'Filipino Culture',
  'Family Values',
] as const;

/**
 * Available game modes for quizzes
 * Each game mode tests different aspects of English language learning
 */
export const GAME_MODES = [
  'Vocabulary',
  'Grammar',
  'Translation',
  'Sentence Construction',
  'Reading Comprehension',
] as const;

/**
 * CEFR levels for language proficiency
 */
export const CEFR_LEVELS = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
] as const;

/**
 * Difficulty levels mapped to CEFR levels
 */
export const DIFFICULTY_BY_LEVEL: Record<string, string> = {
  'A1': 'easy',
  'A2': 'easy',
  'B1': 'medium',
  'B2': 'medium',
  'C1': 'hard',
  'C2': 'hard',
};

// Type exports for TypeScript
export type Interest = typeof INTERESTS[number];
export type GameMode = typeof GAME_MODES[number];
export type CEFRLevel = typeof CEFR_LEVELS[number];
