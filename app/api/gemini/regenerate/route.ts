import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { createPersonalizedQuizClient, CEFRLevel } from '@/lib/geminiService';

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

export async function POST(request: NextRequest) {
  try {
    const { quizSetId, userId, level, gameMode, difficulty, interests } = await request.json();

    if (!quizSetId || !userId || !level || !gameMode || !difficulty) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`Regenerating quiz: ${quizSetId} for user ${userId}`);
    console.log(`Level: ${level}, Game Mode: ${gameMode}, Difficulty: ${difficulty}`);

    // Get the existing quiz to preserve createdAt
    const quizRef = adminDb.collection('quizzes').doc(quizSetId);
    const quizDoc = await quizRef.get();
    const existingData = quizDoc.data();

    // Mark quiz as regenerating using Admin SDK
    await quizRef.update({
      status: 'regenerating',
      regenerationRequestedAt: new Date(),
    });

    // Generate new quiz
    try {
      const result = await createPersonalizedQuizClient(
        userId,
        level as CEFRLevel,
        interests || [],
        gameMode,
        difficulty
      );

      console.log(`Generated ${result.questions.length} new questions`);

      // Overwrite the quiz set with new questions using Admin SDK
      await quizRef.set({
        userId,
        level,
        gameMode,
        difficulty,
        interests: interests || [],
        questions: result.questions,
        status: 'pending',
        regeneratedAt: new Date(),
        updatedAt: new Date(),
        createdAt: existingData?.createdAt || new Date(), // Preserve original createdAt
      }, { merge: false }); // merge: false to completely overwrite (except we're setting all fields)

      console.log(`Successfully regenerated quiz: ${quizSetId}`);

      return NextResponse.json({
        success: true,
        message: 'Quiz regenerated successfully',
      });

    } catch (genError: any) {
      console.error('Error generating new quiz:', genError);
      
      // Revert status if generation fails
      await quizRef.update({
        status: 'pending',
        regenerationError: genError.message,
        updatedAt: new Date(),
      });

      throw genError;
    }

  } catch (error: any) {
    console.error('Error in quiz regeneration API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to regenerate quiz' },
      { status: 500 }
    );
  }
}
