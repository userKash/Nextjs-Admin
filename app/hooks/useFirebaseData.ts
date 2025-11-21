import { useState, useEffect } from 'react';
import { db } from '@/service/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';

export interface UserData {
  id: string;
  name: string;
  email: string;
  interests: string[];
  createdAt: any;
}

export interface QuizGeneration {
  userId: string;
  interests: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  total?: number;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
  error?: string;
}

export interface QuizSet {
  id: string;
  quizId: string;
  userId: string;
  level: string;
  gameMode: string;
  difficulty: string;
  questions: any[];
  createdAt: any;
  status?: 'approved' | 'pending' | 'regenerating';  
  approvedAt?: any;
  regeneratedAt?: any;        
  regenerationNotes?: string;  
  regenerationError?: string;  
}

export interface UserQuizCounts {
  total: number;
  approved: number;
  pending: number;
}

// Hook to fetch unique users from quizzes collection
export function useUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to all quizzes to extract unique users
    const unsubscribe = onSnapshot(
      collection(db, 'quizzes'),
      async (snapshot) => {
        try {
          // Extract unique user IDs from quizzes
          const userMap = new Map<string, { interests: string[], createdAt: any }>();
          
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const userId = data.userId;
            
            if (userId && !userMap.has(userId)) {
              // Store the earliest createdAt for this user
              userMap.set(userId, {
                interests: data.interests || [],
                createdAt: data.createdAt
              });
            } else if (userId) {
              // Update interests if not already set
              const existing = userMap.get(userId);
              if (existing && (!existing.interests || existing.interests.length === 0)) {
                existing.interests = data.interests || [];
              }
            }
          });

          if (userMap.size === 0) {
            setUsers([]);
            setLoading(false);
            return;
          }

          // Fetch user details from users collection for each unique userId
          const usersData: UserData[] = [];
          
          for (const [userId, quizData] of userMap.entries()) {
            try {
              // Try to get user data from users collection
              const userQuery = query(
                collection(db, 'users'),
                where('__name__', '==', userId)
              );
              const userSnapshot = await getDocs(userQuery);
              
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                usersData.push({
                  id: userId,
                  name: userData.name || 'Unknown User',
                  email: userData.email || 'No email',
                  interests: userData.interests || quizData.interests || [],
                  createdAt: userData.createdAt || quizData.createdAt,
                });
              } else {
                // If user doesn't exist in users collection, create from quiz data
                usersData.push({
                  id: userId,
                  name: 'User ' + userId.substring(0, 8),
                  email: 'user@example.com',
                  interests: quizData.interests || [],
                  createdAt: quizData.createdAt,
                });
              }
            } catch (err) {
              console.error(`Error fetching user ${userId}:`, err);
              // Add user with minimal data if fetch fails
              usersData.push({
                id: userId,
                name: 'User ' + userId.substring(0, 8),
                email: 'user@example.com',
                interests: quizData.interests || [],
                createdAt: quizData.createdAt,
              });
            }
          }
          
          setUsers(usersData);
          setLoading(false);
        } catch (err: any) {
          console.error('Error processing users:', err);
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in quizzes snapshot:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { users, loading, error };
}

// Hook to fetch quiz generation status for all users
export function useQuizGenerations() {
  const [generations, setGenerations] = useState<Record<string, QuizGeneration>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'quiz_generations'),
      (snapshot) => {
        const generationsData: Record<string, QuizGeneration> = {};
        snapshot.docs.forEach((doc) => {
          generationsData[doc.id] = {
            userId: doc.id,
            ...doc.data(),
          } as QuizGeneration;
        });
        setGenerations(generationsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching quiz generations:', err);
        setGenerations({});
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { generations, loading, error };
}

// Hook to fetch quiz counts for all users (optimized for table display)
export function useAllUserQuizCounts() {
  const [counts, setCounts] = useState<Record<string, UserQuizCounts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'quizzes'),
      (snapshot) => {
        const countsData: Record<string, UserQuizCounts> = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const userId = data.userId;

          if (!userId) return;

          if (!countsData[userId]) {
            countsData[userId] = {
              total: 0,
              approved: 0,
              pending: 0,
            };
          }

          countsData[userId].total++;

          if (data.status === 'approved') {
            countsData[userId].approved++;
          } else if (data.status === 'pending' || !data.status) {
            // Only count explicitly pending or missing status as pending
            // Don't count 'regenerating' status
            countsData[userId].pending++;
          }
        });

        setCounts(countsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching quiz counts:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { counts, loading, error };
}

// Hook to fetch quiz sets for a specific user
export function useUserQuizSets(userId: string | null) {
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setQuizSets([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'quizzes'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const quizSetsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as QuizSet[];
        
        // Sort by createdAt if available
        quizSetsData.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt;
            const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt;
            return aTime - bTime;
          }
          return 0;
        });
        
        setQuizSets(quizSetsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching quiz sets:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { quizSets, loading, error };
}