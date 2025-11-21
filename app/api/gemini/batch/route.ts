import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { CEFRLevel, createPersonalizedQuizClient } from '@/lib/geminiService';

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

// Define all 30 quiz combinations
const QUIZ_PLAN = [
  { level: "A1", difficulty: "easy", gameMode: "Vocabulary" },
  { level: "A2", difficulty: "easy", gameMode: "Vocabulary" },
  { level: "B1", difficulty: "medium", gameMode: "Vocabulary" },
  { level: "B2", difficulty: "medium", gameMode: "Vocabulary" },
  { level: "C1", difficulty: "hard", gameMode: "Vocabulary" },
  { level: "C2", difficulty: "hard", gameMode: "Vocabulary" },
  { level: "A1", difficulty: "easy", gameMode: "Grammar" },
  { level: "A2", difficulty: "easy", gameMode: "Grammar" },
  { level: "B1", difficulty: "medium", gameMode: "Grammar" },
  { level: "B2", difficulty: "medium", gameMode: "Grammar" },
  { level: "C1", difficulty: "hard", gameMode: "Grammar" },
  { level: "C2", difficulty: "hard", gameMode: "Grammar" },
  { level: "A1", difficulty: "easy", gameMode: "Translation" },
  { level: "A2", difficulty: "easy", gameMode: "Translation" },
  { level: "B1", difficulty: "medium", gameMode: "Translation" },
  { level: "B2", difficulty: "medium", gameMode: "Translation" },
  { level: "C1", difficulty: "hard", gameMode: "Translation" },
  { level: "C2", difficulty: "hard", gameMode: "Translation" },
  { level: "A1", difficulty: "easy", gameMode: "Sentence Construction" },
  { level: "A2", difficulty: "easy", gameMode: "Sentence Construction" },
  { level: "B1", difficulty: "medium", gameMode: "Sentence Construction" },
  { level: "B2", difficulty: "medium", gameMode: "Sentence Construction" },
  { level: "C1", difficulty: "hard", gameMode: "Sentence Construction" },
  { level: "C2", difficulty: "hard", gameMode: "Sentence Construction" },
  { level: "A1", difficulty: "easy", gameMode: "Reading Comprehension" },
  { level: "A2", difficulty: "easy", gameMode: "Reading Comprehension" },
  { level: "B1", difficulty: "medium", gameMode: "Reading Comprehension" },
  { level: "B2", difficulty: "medium", gameMode: "Reading Comprehension" },
  { level: "C1", difficulty: "hard", gameMode: "Reading Comprehension" },
  { level: "C2", difficulty: "hard", gameMode: "Reading Comprehension" },
];

const BATCH_SIZE = 5; // Generate 5 quizzes per request

export async function POST(request: NextRequest) {
  try {
    const { userId, batchIndex = 0 } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`Processing batch ${batchIndex} for user: ${userId}`);

    // Get user data
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

    // Get generation document
    const generationRef = adminDb.collection('quiz_generations').doc(userId);
    let generationDoc = await generationRef.get();

    // Initialize or get existing generation state
    if (!generationDoc.exists || batchIndex === 0) {
      await generationRef.set({
        userId,
        interests,
        status: 'in_progress',
        progress: 0,
        total: QUIZ_PLAN.length,
        currentBatch: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Calculate batch range
    const startIdx = batchIndex * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, QUIZ_PLAN.length);
    const batchPlans = QUIZ_PLAN.slice(startIdx, endIdx);

    if (batchPlans.length === 0) {
      return NextResponse.json({
        success: true,
        completed: true,
        progress: QUIZ_PLAN.length,
        total: QUIZ_PLAN.length,
      });
    }

    console.log(`Generating quizzes ${startIdx} to ${endIdx - 1}`);

    // Generate quizzes for this batch
    const batchResults = await Promise.all(
      batchPlans.map(async ({ level, difficulty, gameMode }) => {
        try {
          const result = await createPersonalizedQuizClient(
            userId,
            level as CEFRLevel,
            interests,
            gameMode,
            difficulty
          );
          return {
            ...result,
            metadata: { level, difficulty, gameMode },
            success: true,
          };
        } catch (error: any) {
          console.error(`Failed to generate ${level} ${gameMode} ${difficulty}:`, error);
          return {
            success: false,
            error: error.message,
            metadata: { level, difficulty, gameMode },
          };
        }
      })
    );

    // Save successful quizzes to Firestore
    const batch = adminDb.batch();
    let successCount = 0;

    batchResults.forEach((result) => {
      if (result.success && 'questions' in result) {
        const { level, gameMode, difficulty } = result.metadata;
        const quizId = `${userId}_${level}_${gameMode.replace(/\s+/g, '')}_${difficulty}`;
        const quizRef = adminDb.collection('quizzes').doc(quizId);

        batch.set(quizRef, {
          userId,
          level,
          gameMode,
          difficulty,
          interests,
          questions: result.questions,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        successCount++;
        console.log(`Queued quiz for save: ${quizId}`);
      }
    });

    await batch.commit();
    console.log(`Saved ${successCount} quizzes from batch ${batchIndex}`);

    // Update progress
    const newProgress = endIdx;
    const isCompleted = endIdx >= QUIZ_PLAN.length;

    await generationRef.update({
      progress: newProgress,
      currentBatch: batchIndex + 1,
      status: isCompleted ? 'completed' : 'in_progress',
      updatedAt: new Date(),
      ...(isCompleted && { completedAt: new Date() }),
    });

    return NextResponse.json({
      success: true,
      completed: isCompleted,
      progress: newProgress,
      total: QUIZ_PLAN.length,
      batchIndex: batchIndex + 1,
      generatedInBatch: successCount,
    });

  } catch (error: any) {
    console.error('Error in batch quiz generation:', error);

    // Try to update status to failed
    try {
      const { userId } = await request.json();
      if (userId) {
        const generationRef = adminDb.collection('quiz_generations').doc(userId);
        await generationRef.update({
          status: 'failed',
          error: error.message,
          updatedAt: new Date(),
        });
      }
    } catch (updateError) {
      console.error('Error updating generation status:', updateError);
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
