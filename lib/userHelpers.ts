import type { UserData, QuizGeneration, QuizSet, UserQuizCounts } from '@/app/hooks/useFirebaseData';

export interface EnhancedUser extends UserData {
  status: 'approved' | 'pending' | 'partial' | 'no-generation';
  quizSets: number;
  total: number;
  approved: number;
  pending: number;
  generationStatus?: QuizGeneration;
}

// Enhance user with quiz data from counts (for table display)
export function enhanceUserWithQuizCounts(
  user: UserData,
  generation: QuizGeneration | undefined,
  counts: UserQuizCounts | undefined
): EnhancedUser {
  // Check if generation exists
  if (!generation) {
    return {
      ...user,
      status: 'no-generation',
      quizSets: 0,
      total: 0,
      approved: 0,
      pending: 0,
    };
  }

  // If generation is pending, show that
  if (generation.status === 'pending') {
    return {
      ...user,
      status: 'no-generation',
      quizSets: 0,
      total: 0,
      approved: 0,
      pending: 0,
      generationStatus: generation,
    };
  }

  // If no counts yet, default to pending
  if (!counts || counts.total === 0) {
    return {
      ...user,
      status: 'pending',
      quizSets: 0,
      total: 0,
      approved: 0,
      pending: 0,
      generationStatus: generation,
    };
  }

  // Use actual counts from Firebase
  const { total, approved, pending } = counts;

  let status: 'approved' | 'pending' | 'partial';
  
  // Check if all 30 quizzes are approved
  if (approved === 30 && total === 30) {
    status = 'approved';
  } else if (approved === total && total > 0) {
    status = 'approved';
  } else if (approved === 0) {
    status = 'pending';
  } else {
    status = 'partial';
  }

  return {
    ...user,
    status,
    quizSets: total,
    total,
    approved,
    pending,
    generationStatus: generation,
  };
}

// Enhance user with quiz data from full quiz sets (for detail view)
export function enhanceUserWithQuizData(
  user: UserData,
  generation: QuizGeneration | undefined,
  quizSets: QuizSet[]
): EnhancedUser {
  // Check if generation exists
  if (!generation) {
    return {
      ...user,
      status: 'no-generation',
      quizSets: 0,
      total: 0,
      approved: 0,
      pending: 0,
    };
  }

  // If generation is pending, show that
  if (generation.status === 'pending') {
    return {
      ...user,
      status: 'no-generation',
      quizSets: 0,
      total: 0,
      approved: 0,
      pending: 0,
      generationStatus: generation,
    };
  }

  // Count approved and pending quiz sets
  const approved = quizSets.filter(set => set.status === 'approved').length;
  const pending = quizSets.filter(set => set.status === 'pending' || !set.status).length;
  const total = quizSets.length;

  let status: 'approved' | 'pending' | 'partial';
  
  // Check if all 30 quizzes are approved
  if (approved === 30 && total === 30) {
    status = 'approved';
  } else if (approved === total && total > 0) {
    status = 'approved';
  } else if (approved === 0) {
    status = 'pending';
  } else {
    status = 'partial';
  }

  return {
    ...user,
    status,
    quizSets: total,
    total,
    approved,
    pending,
    generationStatus: generation,
  };
}

// Format date for display
export function formatDate(date: any): string {
  if (!date) return 'N/A';
  
  // Handle Firestore Timestamp
  if (date.toDate) {
    return date.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  
  // Handle regular Date
  if (date instanceof Date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  
  return 'N/A';
}

// Organize quiz sets by game mode, level, and difficulty
export function organizeQuizSets(quizSets: QuizSet[]): QuizSet[] {
  const gameModes = ['Vocabulary', 'Grammar', 'Translation', 'Sentence Construction', 'Reading Comprehension'];
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Create a map for quick lookup
  const quizMap = new Map<string, QuizSet>();
  quizSets.forEach(quiz => {
    const key = `${quiz.gameMode}-${quiz.level}-${quiz.difficulty}`;
    quizMap.set(key, quiz);
  });

  // Create organized array following the exact pattern
  const organized: QuizSet[] = [];
  
  // A1, A2 = easy
  // B1, B2 = medium  
  // C1, C2 = hard
  const levelDifficultyMap: Record<string, string> = {
    'A1': 'easy',
    'A2': 'easy',
    'B1': 'medium',
    'B2': 'medium',
    'C1': 'hard',
    'C2': 'hard',
  };

  gameModes.forEach(mode => {
    levels.forEach(level => {
      const difficulty = levelDifficultyMap[level];
      const key = `${mode}-${level}-${difficulty}`;
      const quiz = quizMap.get(key);
      if (quiz) {
        organized.push(quiz);
      }
    });
  });

  return organized;
}

// Get quiz set number (1-30) based on the generation order
export function getQuizSetNumber(gameMode: string, level: string, difficulty: string): number {
  const gameModes = ['Vocabulary', 'Grammar', 'Translation', 'Sentence Construction', 'Reading Comprehension'];
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const gameModeIndex = gameModes.indexOf(gameMode);
  const levelIndex = levels.indexOf(level);

  if (gameModeIndex === -1 || levelIndex === -1) {
    return 0;
  }

  // Calculate set number (1-30)
  // Each game mode has 6 levels (A1-C2)
  return (gameModeIndex * 6) + levelIndex + 1;
}