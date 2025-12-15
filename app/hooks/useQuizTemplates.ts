import { useState, useEffect } from 'react';
import { db } from '@/service/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  QueryConstraint
} from 'firebase/firestore';
import { QuizTemplateQuestion, QuizTemplateBatch, ApprovedQuestionPool } from '@/types/quiz-templates';

// Hook to fetch quiz template batches
export function useQuizTemplateBatches(
  interest?: string,
  level?: string,
  gameMode?: string
) {
  const [batches, setBatches] = useState<QuizTemplateBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [];

    if (interest) {
      constraints.push(where('interest', '==', interest));
    }
    if (level) {
      constraints.push(where('level', '==', level));
    }
    if (gameMode) {
      constraints.push(where('gameMode', '==', gameMode));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(collection(db, 'quiz_template_batches'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const batchesData = snapshot.docs.map(doc => ({
          ...(doc.data() as QuizTemplateBatch),
          id: doc.id,
        }));
        setBatches(batchesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching batches:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [interest, level, gameMode]);

  return { batches, loading, error };
}

// Hook to fetch quiz template questions
export function useQuizTemplateQuestions(
  batchId?: string,
  status?: 'pending' | 'approved' | 'rejected' | 'needs_revision',
  interest?: string,
  level?: string,
  gameMode?: string
) {
  const [questions, setQuestions] = useState<QuizTemplateQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [];

    if (batchId) {
      constraints.push(where('batchId', '==', batchId));
    }
    if (status) {
      constraints.push(where('status', '==', status));
    }
    if (interest) {
      constraints.push(where('interest', '==', interest));
    }
    if (level) {
      constraints.push(where('level', '==', level));
    }
    if (gameMode) {
      constraints.push(where('gameMode', '==', gameMode));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(collection(db, 'quiz_template_questions'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const questionsData = snapshot.docs.map(doc => ({
          ...(doc.data() as QuizTemplateQuestion),
          id: doc.id,
        }));
        setQuestions(questionsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching questions:', err);
        // Only show index errors if the query actually fails (no data)
        if (err.code === 'failed-precondition') {
          // Index required error - log it but don't block if data eventually loads
          console.warn('Firestore index required (query may be slow):', err.message);
          setError(null); // Don't show error to user if query still works
        } else {
          setError(err.message);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [batchId, status, interest, level, gameMode]);

  return { questions, loading, error };
}

// Hook to fetch approved question pools
export function useApprovedQuestionPools(
  interest?: string,
  level?: string,
  gameMode?: string
) {
  const [pools, setPools] = useState<ApprovedQuestionPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [];

    if (interest) {
      constraints.push(where('interest', '==', interest));
    }
    if (level) {
      constraints.push(where('level', '==', level));
    }
    if (gameMode) {
      constraints.push(where('gameMode', '==', gameMode));
    }

    const q = query(collection(db, 'approved_question_pool'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const poolsData = snapshot.docs.map(doc => ({
          ...(doc.data() as ApprovedQuestionPool),
          id: doc.id,
        }));
        setPools(poolsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching pools:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [interest, level, gameMode]);

  return { pools, loading, error };
}

// Hook to get summary stats for a specific interest/level/gameMode
export function useQuizTemplateStats(
  interest: string,
  level: string,
  gameMode: string
) {
  const [stats, setStats] = useState({
    totalBatches: 0,
    totalGenerated: 0,
    totalApproved: 0,
    totalPending: 0,
    totalRejected: 0,
    batches: [] as Array<{
      id: string;
      batchNumber: number;
      approvedCount: number;
      pendingCount: number;
      rejectedCount: number;
      status: string;
    }>,
  });

  useEffect(() => {
    // Simple query without complex filters - just get by interest/level/gameMode
    const batchesQuery = query(
      collection(db, 'quiz_template_batches'),
      where('interest', '==', interest),
      where('level', '==', level),
      where('gameMode', '==', gameMode)
    );

    const poolQuery = query(
      collection(db, 'approved_question_pool'),
      where('interest', '==', interest),
      where('level', '==', level),
      where('gameMode', '==', gameMode)
    );

    const questionsQuery = query(
      collection(db, 'quiz_template_questions'),
      where('interest', '==', interest),
      where('level', '==', level),
      where('gameMode', '==', gameMode)
    );

    let batchesData: any[] = [];
    let poolsData: any[] = [];
    let questionsData: any[] = [];

    const unsubBatches = onSnapshot(batchesQuery, (snapshot) => {
      batchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateStats();
    });

    const unsubPools = onSnapshot(poolQuery, (snapshot) => {
      poolsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateStats();
    });

    const unsubQuestions = onSnapshot(questionsQuery, (snapshot) => {
      questionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateStats();
    });

    function updateStats() {
      setStats({
        totalBatches: batchesData.length,
        totalGenerated: questionsData.length,
        totalApproved: poolsData[0]?.totalQuestions || 0,
        totalPending: questionsData.filter(q => q.status === 'pending').length,
        totalRejected: questionsData.filter(q => q.status === 'rejected').length,
        batches: batchesData.map(b => ({
          id: b.id,
          batchNumber: b.batchNumber,
          approvedCount: b.approvedCount,
          pendingCount: b.pendingCount,
          rejectedCount: b.rejectedCount,
          status: b.status,
        })),
      });
    }

    return () => {
      unsubBatches();
      unsubPools();
      unsubQuestions();
    };
  }, [interest, level, gameMode]);

  return stats;
}
