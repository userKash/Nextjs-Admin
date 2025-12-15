import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { RejectQuestionsRequest, RejectQuestionsResponse } from '@/types/quiz-templates';

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
    const body: RejectQuestionsRequest = await request.json();
    const { questionIds, reason } = body;

    if (!questionIds || questionIds.length === 0) {
      return NextResponse.json<RejectQuestionsResponse>(
        { success: false, error: 'questionIds array is required' },
        { status: 400 }
      );
    }

    console.log(`Rejecting ${questionIds.length} questions...`);

    // Fetch all questions to reject
    const questionRefs = questionIds.map(id => adminDb.collection('quiz_template_questions').doc(id));
    const questionDocs = await adminDb.getAll(...questionRefs);

    const questionsData = questionDocs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Group by batch for counting
    const batchUpdates = new Map<string, number>();

    questionsData.forEach(question => {
      batchUpdates.set(question.batchId, (batchUpdates.get(question.batchId) || 0) + 1);
    });

    // Start batch write
    const batch = adminDb.batch();

    // Update each question status to rejected
    questionDocs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        ...(reason && { rejectionReason: reason })
      });
    });

    // Update batch metadata (counts)
    for (const [batchId, count] of batchUpdates) {
      const batchRef = adminDb.collection('quiz_template_batches').doc(batchId);
      batch.update(batchRef, {
        rejectedCount: FieldValue.increment(count),
        pendingCount: FieldValue.increment(-count),
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
        if (batchData.approvedCount === batchData.totalQuestions) {
          newStatus = 'all_approved';
        } else if (batchData.pendingCount === 0 && batchData.approvedCount === 0) {
          newStatus = 'all_pending';  // Actually all rejected, but use this for now
        }

        if (batchData.status !== newStatus) {
          await batchDoc.ref.update({ status: newStatus });
        }
      }
    }

    console.log(`Successfully rejected ${questionIds.length} questions`);

    return NextResponse.json<RejectQuestionsResponse>({
      success: true,
      rejectedCount: questionIds.length,
    });

  } catch (error: any) {
    console.error('Error rejecting questions:', error);
    return NextResponse.json<RejectQuestionsResponse>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
