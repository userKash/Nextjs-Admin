import { db } from '@/service/firebase';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, writeBatch, setDoc, getDoc } from 'firebase/firestore';

// Approve a single quiz set
export async function approveQuizSet(quizSetId: string) {
  try {
    const quizRef = doc(db, 'quizzes', quizSetId);
    await updateDoc(quizRef, {
      status: 'approved',
      approvedAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error approving quiz set:', error);
    return { success: false, error: error.message };
  }
}

// Approve all pending quiz sets for a user
export async function approveAllPendingQuizSets(userId: string) {
  try {
    const q = query(
      collection(db, 'quizzes'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: true, message: 'No pending quiz sets found', approved: 0 };
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        status: 'approved',
        approvedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    
    return { success: true, approved: snapshot.size };
  } catch (error: any) {
    console.error('Error approving all quiz sets:', error);
    return { success: false, error: error.message };
  }
}

// Regenerate a quiz set (NO NOTES REQUIRED)
export async function regenerateQuizSet(quizSetId: string) {
  try {
    // Get the quiz set to retrieve its metadata
    const quizRef = doc(db, 'quizzes', quizSetId);
    const quizSnap = await getDoc(quizRef);

    if (!quizSnap.exists()) {
      throw new Error('Quiz set not found');
    }

    const quizData = quizSnap.data();
    const { userId, level, gameMode, difficulty, interests } = quizData;

    // Mark quiz as regenerating
    await updateDoc(quizRef, {
      status: 'regenerating',
      regenerationRequestedAt: serverTimestamp(),
    });

    // Call the API to regenerate this specific quiz
    const response = await fetch('/api/gemini/regenerate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quizSetId,
        userId,
        level,
        gameMode,
        difficulty,
        interests: interests || [],
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to regenerate quiz');
    }

    return { success: true, message: result.message };
  } catch (error: any) {
    console.error('Error regenerating quiz set:', error);

    // Revert status back to pending
    try {
      const quizRef = doc(db, 'quizzes', quizSetId);
      await updateDoc(quizRef, {
        status: 'pending',
        regenerationError: error.message,
      });
    } catch (updateError) {
      console.error('Error reverting status:', updateError);
    }

    return { success: false, error: error.message };
  }
}

// Trigger quiz generation for a user with batch processing
export async function triggerQuizGeneration(userId: string) {
  try {
    // Check if user already has quiz_generations document
    const generationRef = doc(db, 'quiz_generations', userId);
    const genSnap = await getDoc(generationRef);

    // Get user interests
    let interests: string[] = [];

    // Try to get from users collection first
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      interests = userSnap.data().interests || [];
    } else if (genSnap.exists()) {
      // Fallback to quiz_generations if user doc doesn't exist
      interests = genSnap.data().interests || [];
    }

    if (interests.length === 0) {
      throw new Error('User has no interests selected');
    }

    // Initialize quiz_generations document
    await setDoc(generationRef, {
      userId,
      interests,
      status: 'pending',
      progress: 0,
      total: 30,
      currentBatch: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Initialize generation
    const initResponse = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const initResult = await initResponse.json();

    if (!initResponse.ok || !initResult.success) {
      throw new Error(initResult.error || 'Failed to initialize quiz generation');
    }

    // Start batch processing
    await processBatches(userId);

    return { success: true, message: 'Quiz generation completed successfully' };
  } catch (error: any) {
    console.error('Error triggering quiz generation:', error);

    // Update status to failed
    try {
      const generationRef = doc(db, 'quiz_generations', userId);
      await updateDoc(generationRef, {
        status: 'failed',
        error: error.message,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      console.error('Error updating generation status:', updateError);
    }

    return { success: false, error: error.message };
  }
}

// Process quiz generation in batches to avoid Vercel timeout
async function processBatches(userId: string): Promise<void> {
  let batchIndex = 0;
  let completed = false;

  while (!completed) {
    console.log(`Processing batch ${batchIndex}...`);

    const response = await fetch('/api/gemini/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, batchIndex }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Failed to process batch ${batchIndex}`);
    }

    console.log(`Batch ${batchIndex} completed: ${result.progress}/${result.total}`);

    completed = result.completed;
    batchIndex = result.batchIndex;

    // Add a small delay between batches to avoid rate limits
    if (!completed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('All batches completed successfully');
}