"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuizTemplateQuestions, useQuizTemplateBatches } from '@/app/hooks/useQuizTemplates';
import { QuizTemplateQuestion } from '@/types/quiz-templates';

function QuestionReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interest = searchParams.get('interest') || '';
  const level = searchParams.get('level') || '';
  const gameMode = searchParams.get('gameMode') || undefined;

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const questionsPerPage = 30;

  const { batches, loading: batchesLoading, error: batchesError } = useQuizTemplateBatches(interest, level, gameMode);
  const { questions, loading, error: questionsError } = useQuizTemplateQuestions(
    selectedBatch === 'all' ? undefined : selectedBatch,
    statusFilter === 'all' ? undefined : statusFilter,
    interest,
    level,
    gameMode
  );

  // Debug logging
  useEffect(() => {
    console.log('Review Page State:', {
      interest,
      level,
      gameMode,
      statusFilter,
      selectedBatch,
      questionsCount: questions.length,
      batchesCount: batches.length,
      questionsError,
      batchesError
    });
  }, [interest, level, gameMode, statusFilter, selectedBatch, questions, batches, questionsError, batchesError]);

  // Pagination
  const startIndex = (page - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const paginatedQuestions = questions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  const toggleSelection = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAll = () => {
    const allIds = paginatedQuestions.map(q => q.id);
    setSelectedQuestions(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const selectFirst30Pending = () => {
    const pendingQuestions = questions.filter(q => q.status === 'pending');
    const first30 = pendingQuestions.slice(0, 30).map(q => q.id);
    setSelectedQuestions(new Set(first30));
  };

  const handleApprove = async () => {
    if (selectedQuestions.size === 0) {
      alert('Please select at least one question');
      return;
    }

    try {
      const response = await fetch('/api/quiz-templates/approve-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: Array.from(selectedQuestions),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully approved ${data.approvedCount} questions!`);
        setSelectedQuestions(new Set());
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleReject = async () => {
    if (selectedQuestions.size === 0) {
      alert('Please select at least one question');
      return;
    }

    const reason = prompt('Rejection reason (optional):');

    try {
      const response = await fetch('/api/quiz-templates/reject-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: Array.from(selectedQuestions),
          reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully rejected ${data.rejectedCount} questions!`);
        setSelectedQuestions(new Set());
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleApproveSingle = async (questionId: string) => {
    try {
      const response = await fetch('/api/quiz-templates/approve-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: [questionId],
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleRejectSingle = async (questionId: string) => {
    const reason = prompt('Rejection reason (optional):');

    try {
      const response = await fetch('/api/quiz-templates/reject-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: [questionId],
          reason,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Template Manager
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Question Review: {interest} - {level} - {gameMode || 'All Game Modes'}
          </h1>
        </div>

        {/* Stats */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Generated</p>
              <p className="text-2xl font-bold">{questions.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {questions.filter(q => q.status === 'approved').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {questions.filter(q => q.status === 'pending').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {questions.filter(q => q.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Batches</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    Batch {batch.batchNumber} | {batch.level} | {batch.gameMode} ({batch.pendingCount} pending)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Questions per page
              </label>
              <p className="text-2xl font-bold text-gray-900">{questionsPerPage}</p>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Select All on Page
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Deselect All
              </button>
              <button
                onClick={selectFirst30Pending}
                className="px-4 py-2 bg-yellow-200 text-yellow-800 rounded-md hover:bg-yellow-300"
              >
                Quick Select: First 30 Pending
              </button>
            </div>

            <div className="flex gap-2">
              <p className="text-gray-600 px-4 py-2">Selected: {selectedQuestions.size}</p>
              <button
                onClick={handleApprove}
                disabled={selectedQuestions.size === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                Approve Selected ({selectedQuestions.size})
              </button>
              <button
                onClick={handleReject}
                disabled={selectedQuestions.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                Reject Selected ({selectedQuestions.size})
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(questionsError || batchesError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">Error Loading Data</h3>
            {questionsError && <p className="text-red-600 text-sm mb-2">Questions Error: {questionsError}</p>}
            {batchesError && <p className="text-red-600 text-sm">Batches Error: {batchesError}</p>}
            <p className="text-red-700 text-sm mt-4">
              This might be due to missing Firestore indexes. Check the browser console for details.
            </p>
          </div>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading questions...</p>
          </div>
        ) : paginatedQuestions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-2">No questions found with current filters.</p>
            <p className="text-sm text-gray-400">
              Total questions loaded: {questions.length} |
              Filter: {statusFilter} |
              Batch: {selectedBatch}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={startIndex + index}
                isSelected={selectedQuestions.has(question.id)}
                onToggle={() => toggleSelection(question.id)}
                onApproveSingle={() => handleApproveSingle(question.id)}
                onRejectSingle={() => handleRejectSingle(question.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-200 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  isSelected,
  onToggle,
  onApproveSingle,
  onRejectSingle,
}: {
  question: QuizTemplateQuestion;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
  onApproveSingle: () => void;
  onRejectSingle: () => void;
}) {
  const statusColors = {
    pending: 'bg-yellow-100 border-yellow-300',
    approved: 'bg-green-100 border-green-300',
    rejected: 'bg-red-100 border-red-300',
    needs_revision: 'bg-orange-100 border-orange-300',
  };

  return (
    <div className={`bg-white border-2 rounded-lg p-6 ${statusColors[question.status]} ${isSelected ? 'ring-4 ring-blue-500' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 h-5 w-5"
        />

        {/* Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">
                Q{index + 1}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                Batch {question.batchNumber}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                question.status === 'approved' ? 'bg-green-200 text-green-800' :
                question.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                'bg-red-200 text-red-800'
              }`}>
                {question.status}
              </span>
            </div>

            {/* Actions */}
            {question.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={onApproveSingle}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={onRejectSingle}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </div>

          {/* Passage (if exists) */}
          {question.passage && (
            <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-1">Passage:</p>
              <p className="text-sm text-blue-800">{question.passage}</p>
            </div>
          )}

          {/* Question */}
          <p className="text-lg font-semibold text-gray-900 mb-4">
            {question.question}
          </p>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {question.options.map((option, i) => (
              <div
                key={i}
                className={`p-3 rounded border-2 ${
                  i === question.correctIndex
                    ? 'bg-green-50 border-green-500'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span className="text-gray-900">{option}</span>
                  {i === question.correctIndex && (
                    <span className="ml-auto text-green-600 font-bold">✓ Correct</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Explanation & Clue */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">Explanation:</p>
              <p className="text-gray-600">{question.explanation}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Clue:</p>
              <p className="text-gray-600">{question.clue}</p>
            </div>
          </div>

          {/* Rejection reason if exists */}
          {question.rejectionReason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-800">{question.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuestionReviewPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <QuestionReviewContent />
    </Suspense>
  );
}
