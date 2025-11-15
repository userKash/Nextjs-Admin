import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { generateAllQuizzes } from '@/lib/geminiService';

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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`Starting quiz generation for user: ${userId}`);

    // Get user data to retrieve interests using Admin SDK
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const interests = userData?.interests || [];

    if (interests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User has no interests selected' },
        { status: 400 }
      );
    }

    console.log(`User interests: ${interests.join(', ')}`);

    // Update quiz_generations document to pending using Admin SDK
    const generationRef = adminDb.collection('quiz_generations').doc(userId);
    await generationRef.set({
      userId,
      interests,
      status: 'pending',
      progress: 0,
      total: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    console.log('Quiz generation document created, starting background process...');

    // Start quiz generation in background (don't await)
    generateQuizzesInBackground(userId, interests);

    return NextResponse.json({
      success: true,
      message: 'Quiz generation started. This will take 5-10 minutes.',
    });

  } catch (error: any) {
    console.error('Error in quiz generation API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateQuizzesInBackground(
  userId: string,
  interests: string[]
) {
  const generationRef = adminDb.collection('quiz_generations').doc(userId);
  
  try {
    console.log(`Starting quiz generation for user ${userId} with interests:`, interests);
    
    // Generate all 30 quizzes with progress tracking
    const quizResults = await generateAllQuizzes(
      userId,
      interests,
      async (completed: number, total: number) => {
        // Update progress in real-time using Admin SDK
        console.log(`Progress: ${completed}/${total} quizzes generated`);
        await generationRef.update({
          progress: completed,
          total: total,
          updatedAt: new Date(),
        });
      }
    );

    console.log(`Generated ${quizResults.length} quizzes, now saving to Firestore...`);

    // Save all quiz sets to Firestore using Admin SDK
    const batch = adminDb.batch();
    
    quizResults.forEach((quiz) => {
      const quizId = `${userId}_${quiz.metadata.level}_${quiz.metadata.gameMode.replace(/\s+/g, '')}_${quiz.metadata.difficulty}`;
      const quizRef = adminDb.collection('quizzes').doc(quizId);

      batch.set(quizRef, {
        userId,
        level: quiz.metadata.level,
        gameMode: quiz.metadata.gameMode,
        difficulty: quiz.metadata.difficulty,
        interests,
        questions: quiz.questions,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Queued quiz for save: ${quizId}`);
    });

    // Commit all quizzes at once
    await batch.commit();
    console.log('All quizzes saved successfully');

    // Mark generation as completed
    await generationRef.update({
      status: 'completed',
      progress: 30,
      total: 3,
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Successfully generated and saved 30 quiz sets for user ${userId}`);
  } catch (error: any) {
    console.error('Error in background quiz generation:', error);

    // Mark generation as failed
    try {
      await generationRef.update({
        status: 'failed',
        error: error.message,
        updatedAt: new Date(),
      });
    } catch (updateError) {
      console.error('Error updating generation status to failed:', updateError);
    }
  }
}