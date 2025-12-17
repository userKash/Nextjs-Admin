import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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

export interface UpdateQuestionRequest {
  questionId: string;
  updates: {
    question?: string;
    passage?: string;
    options?: string[];
    correctIndex?: number;
    explanation?: string;
    clue?: string;
  };
}

export interface UpdateQuestionResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateQuestionRequest = await request.json();
    const { questionId, updates } = body;

    if (!questionId) {
      return NextResponse.json<UpdateQuestionResponse>(
        { success: false, error: 'questionId is required' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json<UpdateQuestionResponse>(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    console.log(`Updating question ${questionId}...`);

    const questionRef = adminDb.collection('quiz_template_questions').doc(questionId);
    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      return NextResponse.json<UpdateQuestionResponse>(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    // Validate correctIndex if options are being updated
    if (updates.correctIndex !== undefined && updates.options) {
      if (updates.correctIndex < 0 || updates.correctIndex >= updates.options.length) {
        return NextResponse.json<UpdateQuestionResponse>(
          { success: false, error: 'correctIndex must be within options array bounds' },
          { status: 400 }
        );
      }
    }

    // Update the question
    await questionRef.update({
      ...updates,
      updatedAt: Timestamp.now(),
    });

    console.log(`Successfully updated question ${questionId}`);

    return NextResponse.json<UpdateQuestionResponse>({
      success: true,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error updating question:', error);
    return NextResponse.json<UpdateQuestionResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
