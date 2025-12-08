import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete user from Firebase Authentication
    const auth = getAuth();
    await auth.deleteUser(userId);

    return NextResponse.json({
      success: true,
      message: 'User deleted from authentication successfully',
    });

  } catch (error: any) {
    console.error('Error deleting user from Auth:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete user from authentication',
      },
      { status: 500 }
    );
  }
}
