import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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
    const { questionIds } = await request.json();

    if (!questionIds || questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'questionIds array is required' },
        { status: 400 }
      );
    }

    console.log(`Unapproving ${questionIds.length} questions...`);

    // Fetch all questions to unapprove
    const questionRefs = questionIds.map((id: string) => adminDb.collection('quiz_template_questions').doc(id));
    const questionDocs = await adminDb.getAll(...questionRefs);

    const questionsData = questionDocs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data?.status,
        interest: data?.interest,
        level: data?.level,
        gameMode: data?.gameMode,
        batchId: data?.batchId,
      };
    });

    // Filter only approved questions
    const approvedQuestions = questionsData.filter((q: any) => q.status === 'approved');

    if (approvedQuestions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No approved questions found in the provided IDs'
      }, { status: 400 });
    }

    // Group by pool and batch
    const poolUpdates = new Map<string, Set<string>>();
    const batchUpdates = new Map<string, number>();

    approvedQuestions.forEach((question: any) => {
      const poolId = `${question.interest}_${question.level}_${question.gameMode}`;

      if (!poolUpdates.has(poolId)) {
        poolUpdates.set(poolId, new Set());
      }
      poolUpdates.get(poolId)!.add(question.batchId);

      batchUpdates.set(question.batchId, (batchUpdates.get(question.batchId) || 0) + 1);
    });

    // Start batch write
    const batch = adminDb.batch();

    // Update each question status back to pending
    approvedQuestions.forEach((question: any) => {
      const questionRef = adminDb.collection('quiz_template_questions').doc(question.id);
      batch.update(questionRef, {
        status: 'pending',
        approvedAt: FieldValue.delete(),
        approvedBy: FieldValue.delete(),
      });
    });

    // Update approved question pools (decrement count)
    for (const poolId of poolUpdates.keys()) {
      const poolRef = adminDb.collection('approved_question_pool').doc(poolId);
      batch.update(poolRef, {
        totalQuestions: FieldValue.increment(-approvedQuestions.length),
        lastUpdated: Timestamp.now(),
      });
    }

    // Update batch metadata (counts)
    for (const [batchId, count] of batchUpdates) {
      const batchRef = adminDb.collection('quiz_template_batches').doc(batchId);
      batch.update(batchRef, {
        approvedCount: FieldValue.increment(-count),
        pendingCount: FieldValue.increment(count),
        lastReviewedAt: Timestamp.now(),
      });
    }

    await batch.commit();

    // Update batch status if needed
    for (const batchId of batchUpdates.keys()) {
      const batchDoc = await adminDb.collection('quiz_template_batches').doc(batchId).get();
      const batchData = batchDoc.data();

      if (batchData) {
        let newStatus = 'partially_approved';
        if (batchData.approvedCount === 0) {
          newStatus = 'all_pending';
        } else if (batchData.approvedCount === batchData.totalQuestions) {
          newStatus = 'all_approved';
        }

        if (batchData.status !== newStatus) {
          await batchDoc.ref.update({ status: newStatus });
        }
      }
    }

    console.log(`Successfully unapproved ${approvedQuestions.length} questions`);

    return NextResponse.json({
      success: true,
      unapprovedCount: approvedQuestions.length,
    });

  } catch (error: any) {
    console.error('Error unapproving questions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
