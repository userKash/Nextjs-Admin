"use client"

import React, { useState } from 'react';
import { Search, Filter, ChevronRight, X, AlertTriangle, RefreshCw, CheckCircle, Clock } from 'lucide-react';

export default function UsersManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedQuizSet, setSelectedQuizSet] = useState(null);
  const [regenerateNotes, setRegenerateNotes] = useState('');
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const users = [
    { 
      id: 1, 
      name: 'Maria Santos', 
      email: 'maria@example.com', 
      interests: ['Adventure Stories', 'Filipino Culture', 'Nature & Animals'], 
      quizSets: 30,
      approved: 30,
      pending: 0,
      lastActive: '2 hours ago', 
      status: 'approved',
      createdAt: '2024-10-15'
    },
    { 
      id: 2, 
      name: 'Juan Dela Cruz', 
      email: 'juan@example.com', 
      interests: ['Sports & Games', 'Friendship', 'Music & Arts'], 
      quizSets: 30,
      approved: 0,
      pending: 30,
      lastActive: '1 day ago', 
      status: 'pending',
      createdAt: '2024-11-04'
    },
    { 
      id: 3, 
      name: 'Sofia Reyes', 
      email: 'sofia@example.com', 
      interests: ['Fantasy & Magic', 'Family Values', 'Adventure Stories'], 
      quizSets: 30,
      approved: 15,
      pending: 15,
      lastActive: '3 days ago', 
      status: 'partial',
      createdAt: '2024-11-01'
    },
    { 
      id: 4, 
      name: 'Carlos Rivera', 
      email: 'carlos@example.com', 
      interests: ['Nature & Animals', 'Sports & Games', 'Filipino Culture'], 
      quizSets: 30,
      approved: 30,
      pending: 0,
      lastActive: '5 hours ago', 
      status: 'approved',
      createdAt: '2024-10-28'
    },
  ];

  // Mock quiz sets data
  const generateQuizSets = (userId) => {
    const gameModes = ['Fill in the Blanks', 'Multiple Choice', 'Identification'];
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const difficulties = ['Easy', 'Medium', 'Hard'];
    
    const sets = [];
    let setNumber = 1;
    
    gameModes.forEach(mode => {
      levels.forEach(level => {
        difficulties.forEach(difficulty => {
          const isApproved = userId === 1 || userId === 4 ? true : 
                           userId === 3 ? setNumber <= 15 : false;
          sets.push({
            id: `${userId}-set-${setNumber}`,
            setNumber,
            gameMode: mode,
            level,
            difficulty,
            questionsCount: 15,
            status: isApproved ? 'approved' : 'pending',
            approvedAt: isApproved ? '2024-11-03' : null,
          });
          setNumber++;
        });
      });
    });
    
    return sets;
  };

  // Mock questions for a quiz set
  const generateQuestions = (setId) => {
    const questions = [];
    for (let i = 1; i <= 15; i++) {
      questions.push({
        id: `${setId}-q${i}`,
        questionNumber: i,
        type: 'multiple-choice',
        question: `This is sample question ${i} for the quiz set. What is the correct answer to demonstrate the concept?`,
        options: [
          'Option A - This is the first possible answer',
          'Option B - This is the second possible answer',
          'Option C - This is the third possible answer',
          'Option D - This is the fourth possible answer'
        ],
        correctAnswer: 'Option B - This is the second possible answer',
        explanation: 'This is a detailed explanation of why Option B is correct and how it relates to the learning objectives.',
        difficulty: 'Medium',
        topic: 'Grammar - Present Tense'
      });
    }
    return questions;
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setSelectedQuizSet(null);
  };

  const handleViewQuizSet = (set) => {
    setSelectedQuizSet(set);
    setRegenerateNotes('');
    setShowRegenerateConfirm(false);
  };

  const handleApproveQuizSet = () => {
    alert(`Quiz Set #${selectedQuizSet.setNumber} approved successfully!`);
    setSelectedQuizSet(null);
    // Update user data here
  };

  const handleRegenerateQuizSet = () => {
    if (!regenerateNotes.trim()) {
      alert('Please provide regeneration notes to help improve the questions');
      return;
    }
    alert(`Regenerating Quiz Set #${selectedQuizSet.setNumber} with notes: ${regenerateNotes}`);
    setShowRegenerateConfirm(false);
    setSelectedQuizSet(null);
    // Trigger regeneration API here
  };

  const handleApproveAllPending = (userId) => {
    const pendingCount = quizSets.filter(set => set.status === 'pending').length;
    if (confirm(`Approve all ${pendingCount} pending quiz sets for this user?`)) {
      alert('All pending quiz sets approved!');
      setSelectedUser(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const quizSets = selectedUser ? generateQuizSets(selectedUser.id) : [];
  const questions = selectedQuizSet ? generateQuestions(selectedQuizSet.id) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Users & Quiz Management</h1>
              <p className="text-sm text-gray-500">Manage users and approve quiz sets</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              {['all', 'pending', 'partial', 'approved'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterStatus === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">User</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Interests</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Quiz Sets</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Created</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {user.interests.slice(0, 2).map(interest => (
                          <span key={interest} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                            {interest}
                          </span>
                        ))}
                        {user.interests.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{user.interests.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {user.approved}/{user.quizSets}
                            </span>
                            <span className="text-xs text-gray-500">approved</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-green-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${(user.approved / user.quizSets) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        user.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : user.status === 'pending'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {user.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                        {user.status === 'pending' && <Clock className="w-4 h-4" />}
                        {user.status === 'partial' && <AlertTriangle className="w-4 h-4" />}
                        {user.status === 'approved' ? 'All Approved' : user.status === 'pending' ? 'Pending Review' : 'Partially Approved'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{user.createdAt}</td>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => handleViewUser(user)}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                      >
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Detail Modal - Quiz Sets */}
      {selectedUser && !selectedQuizSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full my-8">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedUser.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedUser.interests.map(interest => (
                      <span key={interest} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Progress Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedUser.approved}/{selectedUser.quizSets} approved ({Math.round((selectedUser.approved / selectedUser.quizSets) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${(selectedUser.approved / selectedUser.quizSets) * 100}%` }}
                  ></div>
                </div>
                
                {selectedUser.pending > 0 && (
                  <button
                    onClick={() => handleApproveAllPending(selectedUser.id)}
                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve All {selectedUser.pending} Pending Quiz Sets
                  </button>
                )}
              </div>
            </div>

            {/* Quiz Sets Grid */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quiz Sets (30 total, 15 questions each)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizSets.map(set => (
                  <div 
                    key={set.id}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition ${
                      set.status === 'approved'
                        ? 'border-green-200 bg-green-50 hover:border-green-300'
                        : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                    }`}
                    onClick={() => handleViewQuizSet(set)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-gray-900">#{set.setNumber}</span>
                        {set.status === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      <div className="text-sm font-semibold text-gray-900">{set.gameMode}</div>
                      <div className="text-sm text-gray-600">{set.level} - {set.difficulty}</div>
                      <div className="text-xs text-gray-500">{set.questionsCount} questions</div>
                    </div>
                    
                    {set.status === 'approved' && (
                      <div className="text-xs text-green-700 font-medium">
                        Approved on {set.approvedAt}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Set Detail Modal - All 15 Questions */}
      {selectedQuizSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">Quiz Set #{selectedQuizSet.setNumber}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedQuizSet.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {selectedQuizSet.status === 'approved' ? 'Approved' : 'Pending Review'}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    {selectedQuizSet.gameMode} • {selectedQuizSet.level} • {selectedQuizSet.difficulty} • {questions.length} Questions
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedQuizSet(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Questions Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-8">
                {questions.map((question, idx) => (
                  <div key={question.id} className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">Question {idx + 1}</h3>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          {question.difficulty}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {question.topic}
                        </span>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="mb-4">
                      <p className="text-gray-900 font-medium">{question.question}</p>
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optIdx) => (
                        <div 
                          key={optIdx}
                          className={`p-3 rounded-lg border-2 ${
                            option === question.correctAnswer
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-700 flex-shrink-0">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span className="text-gray-900">{option}</span>
                            {option === question.correctAnswer && (
                              <CheckCircle className="w-5 h-5 text-green-600 ml-auto flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Explanation */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Explanation</p>
                      <p className="text-gray-900 text-sm">{question.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer - Action Buttons */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0 bg-white">
              {selectedQuizSet.status === 'pending' && !showRegenerateConfirm && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRegenerateConfirm(true)}
                    className="flex-1 px-4 py-3 border-2 border-orange-300 text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Regenerate Quiz Set
                  </button>
                  <button
                    onClick={handleApproveQuizSet}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Quiz Set
                  </button>
                </div>
              )}

              {selectedQuizSet.status === 'pending' && showRegenerateConfirm && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Regeneration Instructions <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={regenerateNotes}
                      onChange={(e) => setRegenerateNotes(e.target.value)}
                      placeholder="Provide specific feedback on what should be improved (e.g., 'Make questions more challenging', 'Focus more on vocabulary', 'Add more cultural context')..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={4}
                    ></textarea>
                    <p className="text-xs text-gray-500 mt-1">
                      Your feedback will help generate better questions tailored to the user's needs.
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRegenerateConfirm(false)}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRegenerateQuizSet}
                      className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Confirm Regeneration
                    </button>
                  </div>
                </div>
              )}

              {selectedQuizSet.status === 'approved' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg border border-green-200">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">This quiz set has been approved on {selectedQuizSet.approvedAt}</span>
                  </div>
                  <button
                    onClick={() => setShowRegenerateConfirm(true)}
                    className="w-full px-4 py-3 border-2 border-orange-300 text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Regenerate Quiz Set Anyway
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}