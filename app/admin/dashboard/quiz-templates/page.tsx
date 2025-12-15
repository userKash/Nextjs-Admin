"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CEFRLevel } from '@/lib/geminiService';
import { useQuizTemplateStats } from '@/app/hooks/useQuizTemplates';
import { INTERESTS, GAME_MODES, CEFR_LEVELS } from '@/lib/constants';

const LEVELS: CEFRLevel[] = CEFR_LEVELS;
const STORAGE_KEY_INTEREST = 'quiz-templates-selected-interest';
const STORAGE_KEY_LEVEL = 'quiz-templates-selected-level';

export default function QuizTemplatesPage() {
  const router = useRouter();
  const [selectedInterest, setSelectedInterest] = useState<string>(INTERESTS[0]);
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');

  // Load saved selections from localStorage on mount
  useEffect(() => {
    const savedInterest = localStorage.getItem(STORAGE_KEY_INTEREST);
    const savedLevel = localStorage.getItem(STORAGE_KEY_LEVEL);

    if (savedInterest && INTERESTS.includes(savedInterest as any)) {
      setSelectedInterest(savedInterest);
    }
    if (savedLevel && LEVELS.includes(savedLevel as CEFRLevel)) {
      setSelectedLevel(savedLevel as CEFRLevel);
    }
  }, []);

  // Save selections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INTEREST, selectedInterest);
  }, [selectedInterest]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEVEL, selectedLevel);
  }, [selectedLevel]);

  const handleGenerateBatch = async (gameMode: string) => {
    // Start generation (non-blocking)
    fetch('/api/quiz-templates/generate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interest: selectedInterest,
        level: selectedLevel,
        gameMode,
        questionsPerBatch: 50,
      }),
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log(`✅ Generated ${data.questionsGenerated} questions for ${selectedInterest} ${selectedLevel} ${gameMode}`);
        } else {
          console.error(`❌ Error: ${data.error}`);
          alert(`Generation failed: ${data.error}`);
        }
      })
      .catch(error => {
        console.error('Error generating batch:', error);
        alert(`Error: ${error.message}`);
      });

    // Show brief notification and return
    alert(`Generation started for ${selectedInterest} ${selectedLevel} ${gameMode}.\n\nThis will take 2-3 minutes. You can continue working - the stats will update automatically when complete.`);
  };

  const handleReviewQuestions = (gameMode: string) => {
    router.push(`/admin/dashboard/quiz-templates/review?interest=${encodeURIComponent(selectedInterest)}&level=${selectedLevel}&gameMode=${encodeURIComponent(gameMode)}`);
  };

  const handleApproveAll = () => {
    router.push(`/admin/dashboard/quiz-templates/review?interest=${encodeURIComponent(selectedInterest)}&level=${selectedLevel}`);
  };

  const handleGenerateAll = () => {
    const confirmed = confirm(
      `Generate all 5 game modes for ${selectedInterest} ${selectedLevel}?\n\n` +
      `This will create 250 questions total (50 per mode).\n` +
      `Generation will run in background and take ~10-15 minutes.`
    );

    if (!confirmed) return;

    // Start all 5 generations in parallel
    GAME_MODES.forEach(gameMode => {
      handleGenerateBatch(gameMode);
    });

    alert(`Started generating all 5 game modes for ${selectedInterest} ${selectedLevel}!\n\nCheck the console for progress updates.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quiz Template Manager</h1>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateAll}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg flex items-center gap-2"
            >
              <span>⚡</span>
              Generate All (5 modes)
            </button>
            <button
              onClick={handleApproveAll}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-lg flex items-center gap-2"
            >
              <span>✓</span>
              Approve Questions
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interest
              </label>
              <select
                value={selectedInterest}
                onChange={(e) => setSelectedInterest(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {INTERESTS.map(interest => (
                  <option key={interest} value={interest}>{interest}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as CEFRLevel)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Game Modes */}
        <div className="space-y-4">
          {GAME_MODES.map(gameMode => (
            <GameModeCard
              key={gameMode}
              gameMode={gameMode}
              interest={selectedInterest}
              level={selectedLevel}
              onGenerate={() => handleGenerateBatch(gameMode)}
              onReview={() => handleReviewQuestions(gameMode)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GameModeCard({
  gameMode,
  interest,
  level,
  onGenerate,
  onReview,
}: {
  gameMode: string;
  interest: string;
  level: CEFRLevel;
  onGenerate: () => void;
  onReview: () => void;
}) {
  const stats = useQuizTemplateStats(interest, level, gameMode);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{gameMode}</h3>
        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generate New Batch (50 questions)
          </button>
          {stats.totalGenerated > 0 && (
            <button
              onClick={onReview}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Review Questions
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Approved Pool</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalApproved}</p>
        </div>
        <div>
          <p className="text-gray-500">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.totalPending}</p>
        </div>
        <div>
          <p className="text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.totalRejected}</p>
        </div>
        <div>
          <p className="text-gray-500">Total Batches</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalBatches}</p>
        </div>
      </div>

      {stats.batches.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Batches:</p>
          <div className="space-y-1">
            {stats.batches.map(batch => (
              <div key={batch.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Batch {batch.batchNumber}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-green-600">{batch.approvedCount} ✓</span>
                  <span className="text-yellow-600">{batch.pendingCount} ⏳</span>
                  <span className="text-red-600">{batch.rejectedCount} ✗</span>
                  <span className={`px-2 py-1 rounded ${
                    batch.status === 'all_approved' ? 'bg-green-100 text-green-800' :
                    batch.status === 'partially_approved' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {batch.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
