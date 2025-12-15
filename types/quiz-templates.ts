import { Timestamp } from "firebase/firestore";
import { Question, CEFRLevel } from "@/lib/geminiService";

export type QuestionStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';
export type BatchStatus = 'all_pending' | 'partially_approved' | 'all_approved' | 'failed';

export interface QuizTemplateQuestion {
  id: string;

  // Classification
  interest: string;
  level: CEFRLevel;
  gameMode: string;
  difficulty: string;

  // Batch tracking
  batchId: string;
  batchNumber: number;
  questionIndex: number;  // 0-49 (position in original batch)

  // Question content (from Question interface)
  passage?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  clue: string;

  // Status tracking
  status: QuestionStatus;

  // Metadata
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
}

export interface QuizTemplateBatch {
  id: string;  // "Technology_A1_Vocabulary_batch1"

  // Classification
  interest: string;
  level: CEFRLevel;
  gameMode: string;
  difficulty: string;
  batchNumber: number;

  // Question counts
  totalQuestions: number;     // 50
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;

  // Status (overall batch status)
  status: BatchStatus;

  // Timestamps
  createdAt: Timestamp;
  lastReviewedAt?: Timestamp;
  generatedBy?: string;
}

export interface ApprovedQuestionPool {
  id: string;  // "Technology_A1_Vocabulary"

  interest: string;
  level: CEFRLevel;
  gameMode: string;
  difficulty: string;

  // Stats
  totalQuestions: number;    // Total approved from all batches
  sourceBatches: string[];   // ["batch1", "batch2", "batch3"]

  lastUpdated: Timestamp;
}

// Helper type for generating batches
export interface GenerateBatchRequest {
  interest: string;
  level: CEFRLevel;
  gameMode: string;
  questionsPerBatch?: number;  // Default 50
}

export interface GenerateBatchResponse {
  success: boolean;
  batchId?: string;
  questionsGenerated?: number;
  error?: string;
}

// Helper type for approving questions
export interface ApproveQuestionsRequest {
  questionIds: string[];
  adminId?: string;
}

export interface ApproveQuestionsResponse {
  success: boolean;
  approvedCount?: number;
  error?: string;
}

// Helper type for rejecting questions
export interface RejectQuestionsRequest {
  questionIds: string[];
  reason?: string;
}

export interface RejectQuestionsResponse {
  success: boolean;
  rejectedCount?: number;
  error?: string;
}
