import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { ApproveQuestionsRequest, ApproveQuestionsResponse } from '@/types/quiz-templates';

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
    const body: ApproveQuestionsRequest = await request.json();
    const { questionIds, adminId } = body;

    if (!questionIds || questionIds.length === 0) {
      return NextResponse.json<ApproveQuestionsResponse>(
        { success: false, error: 'questionIds array is required' },
        { status: 400 }
      );
    }

    console.log(`Approving ${questionIds.length} questions...`);

    // Fetch all questions to approve
    const questionRefs = questionIds.map(id => adminDb.collection('quiz_template_questions').doc(id));
    const questionDocs = await adminDb.getAll(...questionRefs);

    const questionsData = questionDocs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        interest: data?.interest,
        level: data?.level,
        gameMode: data?.gameMode,
        difficulty: data?.difficulty,
        batchId: data?.batchId,
      };
    });

    // Group by pool (interest_level_gameMode)
    const poolUpdates = new Map<string, any>();
    const batchUpdates = new Map<string, number>();

    questionsData.forEach(question => {
      const poolId = `${question.interest}_${question.level}_${question.gameMode}`;

      if (!poolUpdates.has(poolId)) {
        poolUpdates.set(poolId, {
          interest: question.interest,
          level: question.level,
          gameMode: question.gameMode,
          difficulty: question.difficulty,
          batchIds: new Set<string>(),
        });
      }

      poolUpdates.get(poolId).batchIds.add(question.batchId);

      // Count questions per batch
      batchUpdates.set(question.batchId, (batchUpdates.get(question.batchId) || 0) + 1);
    });

    // Start batch write
    const batch = adminDb.batch();

    // Update each question status
    questionDocs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'approved',
        approvedAt: Timestamp.now(),
        ...(adminId && { approvedBy: adminId })
      });
    });

    // Update approved question pools
    for (const [poolId, data] of poolUpdates) {
      const poolRef = adminDb.collection('approved_question_pool').doc(poolId);

      batch.set(poolRef, {
        id: poolId,
        interest: data.interest,
        level: data.level,
        gameMode: data.gameMode,
        difficulty: data.difficulty,
        totalQuestions: FieldValue.increment(questionIds.length),
        sourceBatches: FieldValue.arrayUnion(...Array.from(data.batchIds)),
        lastUpdated: Timestamp.now(),
      }, { merge: true });
    }

    // Update batch metadata (counts)
    for (const [batchId, count] of batchUpdates) {
      const batchRef = adminDb.collection('quiz_template_batches').doc(batchId);
      batch.update(batchRef, {
        approvedCount: FieldValue.increment(count),
        pendingCount: FieldValue.increment(-count),
        lastReviewedAt: Timestamp.now(),
      });
    }

    await batch.commit();

    // Update batch status if needed (check if all approved)
    for (const batchId of batchUpdates.keys()) {
      const batchDoc = await adminDb.collection('quiz_template_batches').doc(batchId).get();
      const batchData = batchDoc.data();

      if (batchData) {
        let newStatus = 'partially_approved';
        if (batchData.approvedCount === batchData.totalQuestions) {
          newStatus = 'all_approved';
        } else if (batchData.approvedCount === 0) {
          newStatus = 'all_pending';
        }

        if (batchData.status !== newStatus) {
          await batchDoc.ref.update({ status: newStatus });
        }
      }
    }

    console.log(`Successfully approved ${questionIds.length} questions`);

    return NextResponse.json<ApproveQuestionsResponse>({
      success: true,
      approvedCount: questionIds.length,
    });

  } catch (error: any) {
    console.error('Error approving questions:', error);
    return NextResponse.json<ApproveQuestionsResponse>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
