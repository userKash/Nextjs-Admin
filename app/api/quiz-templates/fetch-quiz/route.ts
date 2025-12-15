import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { CEFRLevel, Question } from '@/lib/geminiService';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminDb = getFirestore();

interface FetchQuizRequest {
  interests: string[]; // Array of 3 interests
  level: CEFRLevel;
  gameMode: string;
  questionsPerInterest?: number; // Default: 5
}

interface FetchQuizResponse {
  success: boolean;
  questions?: Question[];
  error?: string;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(request: NextRequest) {
  try {
    const body: FetchQuizRequest = await request.json();
    const { interests, level, gameMode, questionsPerInterest = 5 } = body;

    // Validation
    if (!interests || !Array.isArray(interests) || interests.length !== 3) {
      return NextResponse.json<FetchQuizResponse>(
        { success: false, error: 'Exactly 3 interests are required' },
        { status: 400 }
      );
    }

    if (!level || !gameMode) {
      return NextResponse.json<FetchQuizResponse>(
        { success: false, error: 'Level and gameMode are required' },
        { status: 400 }
      );
    }

    console.log(`Fetching ${questionsPerInterest} questions per interest for ${level} ${gameMode}`);
    console.log(`Interests: ${interests.join(', ')}`);

    const allQuestions: Question[] = [];

    // Fetch questions for each interest
    for (const interest of interests) {
      // Query approved questions for this specific interest, level, and gameMode
      const questionsSnapshot = await adminDb
        .collection('quiz_template_questions')
        .where('interest', '==', interest)
        .where('level', '==', level)
        .where('gameMode', '==', gameMode)
        .where('status', '==', 'approved')
        .get();

      const availableQuestions = questionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          passage: data.passage || undefined,
          question: data.question,
          options: data.options,
          correctIndex: data.correctIndex,
          explanation: data.explanation,
          clue: data.clue,
        } as Question;
      });

      console.log(`Found ${availableQuestions.length} approved questions for ${interest}`);

      if (availableQuestions.length === 0) {
        console.warn(`⚠️ No approved questions found for ${interest} - ${level} - ${gameMode}`);
        continue;
      }

      // Randomly select questionsPerInterest questions
      const shuffled = shuffleArray(availableQuestions);
      const selected = shuffled.slice(0, questionsPerInterest);

      console.log(`Selected ${selected.length} questions for ${interest}`);
      allQuestions.push(...selected);
    }

    // Final shuffle to mix questions from different interests
    const finalQuestions = shuffleArray(allQuestions);

    console.log(`✅ Total questions fetched: ${finalQuestions.length}`);

    return NextResponse.json<FetchQuizResponse>({
      success: true,
      questions: finalQuestions,
    });

  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json<FetchQuizResponse>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
