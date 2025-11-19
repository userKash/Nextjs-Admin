/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, X, AlertTriangle, RefreshCw, CheckCircle, Clock, Loader2, PlayCircle, Sparkles } from 'lucide-react';
import { approveQuizSet, approveAllPendingQuizSets, regenerateQuizSet, triggerQuizGeneration } from '@/lib/quizActions';
import { useUsers, useQuizGenerations, useUserQuizSets, useAllUserQuizCounts, type QuizSet } from '@/app/hooks/useFirebaseData';
import { enhanceUserWithQuizCounts, enhanceUserWithQuizData, formatDate, organizeQuizSets, getQuizSetNumber, type EnhancedUser } from '@/lib/userHelpers';
import ConfirmModal from "./components/ConfirmModal";


type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface LevelGroup {
  level: CEFRLevel;
  quizSets: (QuizSet & { setNumber: number })[];
  pending: number;
  approved: number;
  total: number;
}

export default function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<CEFRLevel>>(new Set());
  const [selectedQuizSet, setSelectedQuizSet] = useState<(QuizSet & { setNumber: number }) | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAllApprovedNotification, setShowAllApprovedNotification] = useState(false);

  // Fetch data from Firebase
  const { users, loading: usersLoading } = useUsers();
  const { generations, loading: generationsLoading } = useQuizGenerations();
  const { counts, loading: countsLoading } = useAllUserQuizCounts(); 
  const { quizSets: selectedUserQuizSets, loading: quizSetsLoading } = useUserQuizSets(selectedUser?.id || null);

  //custom modals
//custom modals
const [confirmOpen, setConfirmOpen] = useState(false);
const [confirmMode, setConfirmMode] = useState<"confirm" | "result">("confirm");
const [confirmTitle, setConfirmTitle] = useState<string>("Are you sure?");
const [confirmMessage, setConfirmMessage] = useState<string>("");
const [confirmLabel, setConfirmLabel] = useState<string>("Confirm");
const [cancelLabel, setCancelLabel] = useState<string>("Cancel");
const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const askConfirm = (
    message: string,
    onConfirm: () => void,
    {
      title = "Are you sure?",
      mode = "confirm",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
    }: {
      title?: string;
      mode?: "confirm" | "result";
      confirmLabel?: string;
      cancelLabel?: string;
    } = {}
  ) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmMode(mode);
    setConfirmLabel(confirmLabel);
    setCancelLabel(cancelLabel);
    setConfirmAction(() => onConfirm);
    setConfirmOpen(true);
  };
  const enhancedUsers = useMemo(() => {
    return users.map(user => {
      const generation = generations[user.id];
      const userCounts = counts[user.id]; 
      return enhanceUserWithQuizCounts(user, generation, userCounts); 
    });
  }, [users, generations, counts]);

  const filteredUsers = useMemo(() => {
    return enhancedUsers
      .filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;
        if (filterStatus === 'all') return true;
        
        return user.status === filterStatus;
      })
      .sort((a, b) => {
        // Sort by createdAt - newest first (descending)
        if (!a.createdAt || !b.createdAt) return 0;
        
        const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : 
                      (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
        const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : 
                      (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
        
        return bTime - aTime; // Descending order (newest first)
      });
  }, [enhancedUsers, searchQuery, filterStatus]);

  // Organize quiz sets with numbers
  const organizedQuizSets = useMemo(() => {
    const organized = organizeQuizSets(selectedUserQuizSets);
    return organized.map((quiz) => ({
      ...quiz,
      setNumber: getQuizSetNumber(quiz.gameMode, quiz.level, quiz.difficulty),
    }));
  }, [selectedUserQuizSets]);

  // Group quizzes by level
  const levelGroups = useMemo((): LevelGroup[] => {
    const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
    
    return levels.map(level => {
      const levelQuizzes = organizedQuizSets.filter(q => q.level === level);
      const pending = levelQuizzes.filter(q => q.status === 'pending' || !q.status).length;
      const approved = levelQuizzes.filter(q => q.status === 'approved').length;
      
      return {
        level,
        quizSets: levelQuizzes,
        pending,
        approved,
        total: levelQuizzes.length
      };
    });
  }, [organizedQuizSets]);

  // Update selected user with actual quiz counts from loaded quiz sets
  const updatedSelectedUser = useMemo(() => {
    if (!selectedUser) return null;
    
    const generation = generations[selectedUser.id];
    return enhanceUserWithQuizData(selectedUser, generation, selectedUserQuizSets);
  }, [selectedUser, generations, selectedUserQuizSets]);

  // Check if all quizzes are approved (30/30) and show notification
  useEffect(() => {
    if (updatedSelectedUser && updatedSelectedUser.approved === 30 && updatedSelectedUser.total === 30) {
      setShowAllApprovedNotification(true);
      const timer = setTimeout(() => setShowAllApprovedNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [updatedSelectedUser]);

  const handleViewUser = (user: EnhancedUser) => {
    setSelectedUser(user);
    setSelectedQuizSet(null);
    setExpandedLevels(new Set());
    setShowAllApprovedNotification(false);
  };

  const toggleLevel = (level: CEFRLevel) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const handleViewQuizSet = (set: QuizSet & { setNumber: number }) => {
    setSelectedQuizSet(set);
  };

const handleApproveQuizSet = async () => {
  if (!selectedQuizSet) return;

  askConfirm(
    `Approve Quiz Set #${selectedQuizSet.setNumber}?`,
    async () => {
      setConfirmOpen(false);

      try {
        setActionLoading(true);
        const result = await approveQuizSet(selectedQuizSet.id);

        askConfirm(
          result.success
            ? `Quiz Set #${selectedQuizSet.setNumber} approved successfully!`
            : `Error: ${result.error}`,
          () => {
            setConfirmOpen(false);
            if (result.success) setSelectedQuizSet(null);
          },
          { mode: "result", confirmLabel: "OK", cancelLabel: "" }
        );
      } catch (error) {
        askConfirm(
          `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
          () => {
            setConfirmOpen(false);
          },
          { mode: "result", confirmLabel: "OK", cancelLabel: "" }
        );
      } finally {
        setActionLoading(false);
      }
    }
  );
};



const handleRegenerateQuizSet = async () => {
  if (!selectedQuizSet) return;

  askConfirm(
    `Regenerate Quiz Set #${selectedQuizSet.setNumber}? This will overwrite existing questions.`,
    async () => {
      try {
        setActionLoading(true);
        const result = await regenerateQuizSet(selectedQuizSet.id);

        // Update modal result message
        setConfirmMessage(
          result.success
            ? `Quiz Set #${selectedQuizSet.setNumber} regenerated successfully!`
            : `Error: ${result.error}`
        );

        return result.success; // triggers success mode in modal
      } catch (error) {
        setConfirmMessage(
          `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
        );
        return false;
      } finally {
        setActionLoading(false);
      }
    }
  );
};



const handleApproveAllPending = (userId: string) => {
  const pendingCount = organizedQuizSets.filter(
    set => set.status === "pending" || !set.status
  ).length;

  askConfirm(
    `Approve all ${pendingCount} pending quiz sets for this user?`,
    async () => {
      try {
        setActionLoading(true);
        const result = await approveAllPendingQuizSets(userId);

        setConfirmMessage(
          result.success
            ? `All pending quiz sets approved! (${result.approved || pendingCount})`
            : `Error: ${result.error}`
        );

        return result.success;
      } catch (error) {
        setConfirmMessage(
          `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
        );
        return false;
      } finally {
        setActionLoading(false);
      }
    }
  );
};




const handleApproveLevelQuizzes = async (userId: string, level: CEFRLevel) => {
  const levelGroup = levelGroups.find(g => g.level === level);
  if (!levelGroup || levelGroup.pending === 0) return;

  const pendingQuizzes = levelGroup.quizSets.filter(
    q => q.status === "pending" || !q.status
  );

  askConfirm(
    `Approve all ${levelGroup.pending} pending quiz sets for ${level}?`,
    async () => {
      try {
        setActionLoading(true);

        const results = await Promise.all(
          pendingQuizzes.map(q => approveQuizSet(q.id))
        );

        const successCount = results.filter(r => r.success).length;

        setConfirmMessage(
          successCount === pendingQuizzes.length
            ? `All ${level} quiz sets approved successfully!`
            : `Approved ${successCount} of ${pendingQuizzes.length}.`
        );

        return successCount === pendingQuizzes.length;
      } catch (error) {
        setConfirmMessage(
          `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
        );
        return false;
      } finally {
        setActionLoading(false);
      }
    }
  );
};



const handleTriggerGeneration = async (userId: string) => {
  askConfirm(
    "Trigger quiz generation for this user? This will create 30 quiz sets and may take 1–2 minutes.",
    async () => {
      try {
        setActionLoading(true);
        const result = await triggerQuizGeneration(userId);

        setConfirmMessage(
          result.success
            ? "Quiz generation triggered successfully!"
            : `Error: ${result.error}`
        );

        return result.success;
      } catch (error) {
        setConfirmMessage(
          `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
        );
        return false;
      } finally {
        setActionLoading(false);
      }
    }
  );
};



  const getStatusBadge = (user: EnhancedUser) => {
    if (user.status === 'no-generation' || user.generationStatus?.status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
          <Clock className="w-4 h-4" />
          {user.status === 'no-generation' ? 'No Generation' : 'Generation Pending'}
        </span>
      );
    }

    if (user.status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-4 h-4" />
          All Approved
        </span>
      );
    }

    if (user.status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
          <AlertTriangle className="w-4 h-4" />
          Partially Approved
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
        <Clock className="w-4 h-4" />
        Pending Review
      </span>
    );
  };

  // Helper to show quiz progress in table
  const getQuizProgressDisplay = (user: EnhancedUser) => {
    if (user.generationStatus?.status === 'pending') {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
          <span className="text-sm text-orange-600">
            {user.generationStatus.progress || 0}/{user.generationStatus.total || 30}
          </span>
        </div>
      );
    }

    if (user.generationStatus?.status === 'completed') {
      // Show completion message if fully approved
      if (user.status === 'approved') {
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">30/30 Complete ✓</span>
          </div>
        );
      }
      return <span className="text-sm text-gray-600 italic">View details to see progress</span>;
    }

    return <span className="text-sm text-gray-500 italic">Not started</span>;
  };

  if (usersLoading || generationsLoading || countsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#5E67CC] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Users & Quiz Management</h1>
          <p className="text-gray-600 mt-2">Manage users and approve quiz sets</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E67CC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'partial', 'approved', 'no-generation'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterStatus === status
                      ? 'bg-[#5E67CC] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'no-generation' ? 'No Generation' : status.charAt(0).toUpperCase() + status.slice(1)}
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
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Quiz Progress</th>
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
                      <div className="flex flex-wrap gap-2">
                        {user.interests.map(interest => (
                          <span key={interest} className="px-3 py-1 bg-[#5E67CC]/10 text-[#5E67CC] text-xs font-medium rounded-full">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {getQuizProgressDisplay(user)}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(user)}
                    </td>
                    <td className="py-4 px-6 text-gray-600">{formatDate(user.createdAt)}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {user.status === 'no-generation' && user.generationStatus?.status !== 'pending' ? (
                          <button 
                            onClick={() => handleTriggerGeneration(user.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-2 min-w\[160px] px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                            Generate Quizzes
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleViewUser(user)}
                            className="inline-flex items-center justify-center gap-2 min-w\[160px] px-4 py-2.5 bg-[#5E67CC] text-white rounded-lg font-medium hover:bg-[#4A52A3] transition"
                          >
                            View Details
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
  {selectedUser && !selectedQuizSet && updatedSelectedUser && (
    <UserDetailModal
      user={updatedSelectedUser}
      levelGroups={levelGroups}
      expandedLevels={expandedLevels}
      loading={quizSetsLoading}
      onClose={() => setSelectedUser(null)}
      onToggleLevel={toggleLevel}
      onViewQuizSet={handleViewQuizSet}
      onApproveLevelQuizzes={handleApproveLevelQuizzes}
      onApproveAll={handleApproveAllPending}
      actionLoading={actionLoading}
      showAllApprovedNotification={showAllApprovedNotification}
    />
  )}

  {/* Quiz Set Detail Modal */}
  {selectedQuizSet && (
    <QuizSetDetailModal
      quizSet={selectedQuizSet}
      onClose={() => setSelectedQuizSet(null)}
      onApprove={handleApproveQuizSet}
      onRegenerate={handleRegenerateQuizSet}
      actionLoading={actionLoading}
    />
  )}
  {/*Confirm Modal Implementation */}
<ConfirmModal
  open={confirmOpen}
  mode={confirmMode}
  title={confirmTitle}
  message={confirmMessage}
  confirmLabel={confirmLabel}
  cancelLabel={cancelLabel}
  onConfirm={async () => {
    const result = await confirmAction();
    setConfirmMode("result");
    setConfirmLabel("OK");
    setCancelLabel("");
    return result; 
  }}
  onCancel={() => {
    setConfirmOpen(false);
  }}
/>
    </div>
  );
}
function UserDetailModal({
  user,
  levelGroups,
  expandedLevels,
  loading,
  onClose,
  onToggleLevel,
  onViewQuizSet,
  onApproveLevelQuizzes,
  onApproveAll,
  actionLoading,
  showAllApprovedNotification,
}: {
  user: EnhancedUser;
  levelGroups: LevelGroup[];
  expandedLevels: Set<CEFRLevel>;
  loading: boolean;
  onClose: () => void;
  onToggleLevel: (level: CEFRLevel) => void;
  onViewQuizSet: (set: QuizSet & { setNumber: number }) => void;
  onApproveLevelQuizzes: (userId: string, level: CEFRLevel) => void;
  onApproveAll: (userId: string) => void;
  actionLoading: boolean;
  showAllApprovedNotification: boolean;
}) {
  const totalQuizzes = levelGroups.reduce((sum, g) => sum + g.total, 0);
  const totalApproved = levelGroups.reduce((sum, g) => sum + g.approved, 0);
  const totalPending = levelGroups.reduce((sum, g) => sum + g.pending, 0);
  const isFullyApproved = totalApproved === 30 && totalQuizzes === 30;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl my-8 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink:0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-600 mt-1">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {user.interests.map(interest => (
                  <span key={interest} className="px-4 py-2 bg-[#5E67CC]/10 text-[#5E67CC] rounded-lg text-sm font-medium">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink:0"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* All Approved Notification */}
          {showAllApprovedNotification && isFullyApproved && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-200 animate-pulse">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-green-900 text-lg">🎉 All Quizzes Approved!</p>
                  <p className="text-sm text-green-700 mt-1">
                    Congratulations! All 30 quiz sets have been approved for this user.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generation Status */}
          {user.generationStatus?.status === 'pending' && (
            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900">Quiz Generation in Progress</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Progress: {user.generationStatus.progress || 0}/{user.generationStatus.total || 30} quiz sets generated
                  </p>
                </div>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2.5 mt-3">
                <div 
                  className="bg-orange-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${((user.generationStatus.progress || 0) / (user.generationStatus.total || 30)) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Progress Summary */}
          {user.generationStatus?.status === 'completed' && totalQuizzes > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                <span className="text-sm font-bold text-gray-900">
                  {totalApproved}/{totalQuizzes} approved ({Math.round((totalApproved / totalQuizzes) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${isFullyApproved ? 'bg-green-500' : 'bg-[#5E67CC]'}`}
                  style={{ width: `${(totalApproved / totalQuizzes) * 100}%` }}
                ></div>
              </div>
              
              {totalPending > 0 && !isFullyApproved && (
                <button
                  onClick={() => onApproveAll(user.id)}
                  disabled={actionLoading}
                  className="w-full mt-4 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Approve All {totalPending} Pending Quiz Sets
                </button>
              )}

              {isFullyApproved && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                  <p className="text-green-800 font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    All quiz sets have been approved!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Level Groups - Expandable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-[#5E67CC] animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading quiz sets...</p>
            </div>
          ) : totalQuizzes > 0 ? (
            <div className="space-y-4">
              {levelGroups.map(group => (
                <div key={group.level} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Level Header */}
                  <button
                    onClick={() => onToggleLevel(group.level)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {expandedLevels.has(group.level) ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      )}
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-gray-900">Level {group.level}</h3>
                        <p className="text-sm text-gray-600">
                          {group.approved}/{group.total} approved • {group.pending} pending
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {group.pending > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onApproveLevelQuizzes(user.id, group.level);
                          }}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                        >
                          Approve All {group.level}
                        </button>
                      )}
                      <div className="w-32 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full transition-all"
                          style={{ width: `${(group.approved / group.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Quiz Sets */}
                  {expandedLevels.has(group.level) && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.quizSets.map(set => (
                        <div 
                          key={set.id}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                            set.status === 'approved'
                              ? 'border-green-200 bg-green-50 hover:border-green-300'
                              : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                          }`}
                          onClick={() => onViewQuizSet(set)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">#{set.setNumber}</span>
                              {set.status === 'approved' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-orange-600" />
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                          
                          <div className="text-sm font-semibold text-gray-900 mb-1">{set.gameMode}</div>
                          <div className="text-xs text-gray-600">{set.difficulty} • {set.questions?.length || 15} questions</div>
                          
                          {set.status === 'approved' && set.approvedAt && (
                            <div className="text-xs text-green-700 font-medium mt-2">
                              ✓ Approved
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No quiz sets found for this user</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex-shrink:0">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Quiz Set Detail Modal Component
function QuizSetDetailModal({
  quizSet,
  onClose,
  onApprove,
  onRegenerate,
  actionLoading,
}: {
  quizSet: QuizSet & { setNumber: number };
  onClose: () => void;
  onApprove: () => void;
  onRegenerate: () => void;
  actionLoading: boolean;
}) {
  const questions = quizSet.questions || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl my-8 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink:0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Quiz Set #{quizSet.setNumber}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  quizSet.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {quizSet.status === 'approved' ? 'Approved' : 'Pending Review'}
                </span>
              </div>
              <p className="text-gray-600">
                {quizSet.gameMode} • {quizSet.level} • {quizSet.difficulty} • {questions.length} Questions
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Questions Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {questions.length > 0 ? (
            <div className="space-y-6">
              {questions.map((question: any, idx: number) => (
                <div key={idx} className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                  {/* Question Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex-shrink:0 w-8 h-8 bg-[#5E67CC] text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">Question {idx + 1}</h3>
                  </div>

                  {/* Passage (if exists) */}
                  {question.passage && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Reading Passage:</p>
                      <p className="text-gray-900 text-sm italic leading-relaxed">{question.passage}</p>
                    </div>
                  )}

                  {/* Question Text */}
                  <div className="mb-4">
                    <p className="text-gray-900 font-medium text-base">{question.question}</p>
                  </div>

                  {/* Answer Options */}
                  {question.options && question.options.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {question.options.map((option: string, optIdx: number) => {
                        const isCorrect = optIdx === question.correctIndex || option === question.correctAnswer;
                        return (
                          <div 
                            key={optIdx}
                            className={`p-3 rounded-lg border-2 transition ${
                              isCorrect
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-700 flex-shrink:0 text-sm">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="text-gray-900 text-sm flex-1">{option}</span>
                              {isCorrect && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink:0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Explanation</p>
                      <p className="text-gray-900 text-sm leading-relaxed">{question.explanation}</p>
                      <p className="text-gray-900 text-sm leading-relaxed">{question.clue}</p>
                    </div>
                  )}

                  {/* Clue */}
                  {question.clue && (
                    <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm font-semibold text-amber-900 mb-1">💡 Hint</p>
                      <p className="text-gray-900 text-sm leading-relaxed">{question.clue}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No questions available for this quiz set</p>
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="p-6 border-t border-gray-200 flex-shrink:0 bg-white">
          <div className="flex gap-3">
            {/* Only show Regenerate button if quiz is NOT approved */}
            {quizSet.status !== 'approved' && (
              <button
                onClick={onRegenerate}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 border-2 border-orange-300 text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                Regenerate Quiz
              </button>
            )}
            
            {quizSet.status !== 'approved' && (
              <button
                onClick={onApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Approve Quiz
              </button>
            )}
            
            {quizSet.status === 'approved' && (
              <div className="flex-1 flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 justify-center">
                <CheckCircle className="w-5 h-5 flex-shrink:0" />
                <span className="font-medium text-sm">Approved on {formatDate(quizSet.approvedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}