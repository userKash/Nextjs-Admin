import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { generateQuestionBatch } from '@/lib/geminiService';
import { CEFRLevel } from '@/lib/geminiService';
import { GenerateBatchRequest, GenerateBatchResponse } from '@/types/quiz-templates';

// Set max duration for batch generation (5 minutes)
export const maxDuration = 300;

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

function getDifficultyFromLevel(level: CEFRLevel): string {
  if (level === 'A1' || level === 'A2') return 'easy';
  if (level === 'B1' || level === 'B2') return 'medium';
  return 'hard';  // C1, C2
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateBatchRequest = await request.json();
    const { interest, level, gameMode, questionsPerBatch = 50 } = body;

    // Validation
    if (!interest || !level || !gameMode) {
      return NextResponse.json<GenerateBatchResponse>(
        { success: false, error: 'Interest, level, and gameMode are required' },
        { status: 400 }
      );
    }

    console.log(`Starting batch generation for: ${interest} - ${level} - ${gameMode}`);

    // Get existing batches to determine next batch number
    const existingBatchesSnapshot = await adminDb
      .collection('quiz_template_batches')
      .where('interest', '==', interest)
      .where('level', '==', level)
      .where('gameMode', '==', gameMode)
      .get();

    const batchNumber = existingBatchesSnapshot.size + 1;
    const batchId = `${interest}_${level}_${gameMode}_batch${batchNumber}`;

    console.log(`Attempting to create batch ${batchNumber} with ID: ${batchId}`);

    // Generate questions FIRST (single attempt)
    const questions = await generateQuestionBatch(
      interest,
      level as CEFRLevel,
      gameMode,
      getDifficultyFromLevel(level as CEFRLevel),
      questionsPerBatch,
      (completed, total) => {
        console.log(`Generation progress: ${completed}/${total}`);
      }
    );

    console.log(`Generated ${questions.length}/${questionsPerBatch} valid questions from single attempt`);

    // Only save if we got at least some valid questions
    if (questions.length === 0) {
      console.warn(`⚠️ No valid questions generated for ${batchId}. Skipping batch creation.`);
      return NextResponse.json<GenerateBatchResponse>({
        success: false,
        error: `No valid questions generated in single attempt. Please try again.`,
      }, { status: 400 });
    }

    // Create batch metadata document with actual question count
    const batchRef = adminDb.collection('quiz_template_batches').doc(batchId);
    await batchRef.set({
      id: batchId,
      interest,
      level,
      gameMode,
      difficulty: getDifficultyFromLevel(level as CEFRLevel),
      batchNumber,
      totalQuestions: questions.length, // Actual count, not requested count
      approvedCount: 0,
      pendingCount: questions.length, // Actual count
      rejectedCount: 0,
      status: 'all_pending',
      requestedQuestions: questionsPerBatch, // Track what was requested
      createdAt: Timestamp.now(),
    });

    console.log(`Saving ${questions.length} questions to Firestore...`);

    // Check if we're hitting batch write limits (max 500 operations)
    if (questions.length > 500) {
      throw new Error(`Cannot save ${questions.length} questions in a single batch (max 500)`);
    }

    // Save each question as a separate document
    const batch = adminDb.batch();
    let writeCount = 0;

    questions.forEach((question, index) => {
      writeCount++;
      const questionId = `${batchId}_q${index}`;
      const questionRef = adminDb.collection('quiz_template_questions').doc(questionId);

      batch.set(questionRef, {
        id: questionId,
        interest,
        level,
        gameMode,
        difficulty: getDifficultyFromLevel(level as CEFRLevel),
        batchId,
        batchNumber,
        questionIndex: index,

        // Question content
        passage: question.passage || null,
        question: question.question,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        clue: question.clue,

        // Status
        status: 'pending',

        // Metadata
        createdAt: Timestamp.now(),
      });
    });

    console.log(`Attempting to commit ${writeCount} write operations...`);

    try {
      await batch.commit();
      console.log(`✅ Successfully committed ${writeCount} questions to Firestore`);
    } catch (batchError: any) {
      console.error(`❌ Failed to commit questions batch:`, batchError);
      console.error(`Error details:`, {
        code: batchError.code,
        message: batchError.message,
        details: batchError.details,
        writeCount
      });
      // Delete the batch metadata if questions failed to save
      try {
        await batchRef.delete();
        console.log(`Cleaned up batch metadata after failure`);
      } catch (deleteError) {
        console.error(`Failed to clean up batch metadata:`, deleteError);
      }
      throw new Error(`Failed to save questions: ${batchError.message}`);
    }

    // Verify questions were saved
    const savedQuestionsSnapshot = await adminDb
      .collection('quiz_template_questions')
      .where('batchId', '==', batchId)
      .get();

    console.log(`✅ Verified: ${savedQuestionsSnapshot.size} questions saved in Firestore for batch ${batchId}`);

    return NextResponse.json<GenerateBatchResponse>({
      success: true,
      batchId,
      questionsGenerated: questions.length,
    });

  } catch (error: any) {
    console.error('Error in batch generation API:', error);
    return NextResponse.json<GenerateBatchResponse>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
