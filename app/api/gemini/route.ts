import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
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

    // Initialize quiz_generations document
    const generationRef = adminDb.collection('quiz_generations').doc(userId);
    await generationRef.set({
      userId,
      interests,
      status: 'pending',
      progress: 0,
      total: 30,
      currentBatch: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    console.log('Quiz generation initialized. Use batch API to generate quizzes.');

    return NextResponse.json({
      success: true,
      message: 'Quiz generation initialized. Client will process in batches.',
      useBatchAPI: true, // Signal to client to use batch processing
    });

  } catch (error: any) {
    console.error('Error in quiz generation API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const generationRef = adminDb.collection('quiz_generations').doc(userId);
    const generationDoc = await generationRef.get();

    if (!generationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'No generation found for this user' },
        { status: 404 }
      );
    }

    const data = generationDoc.data();

    return NextResponse.json({
      success: true,
      ...data,
    });

  } catch (error: any) {
    console.error('Error fetching generation status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}