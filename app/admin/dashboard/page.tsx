"use client"

import React from 'react';
import { BarChart3, TrendingUp, Users, BookOpen, CheckCircle, Clock } from 'lucide-react';

export default function DashboardAnalytics() {
  const stats = {
    totalUsers: 1247,
    newUsers: 156,
    activeQuizzes: 37410,
    pendingApproval: 8,
    completionRate: 78.4,
    avgScore: 82.3,
    totalQuestions: 561750,
    approvedQuizzes: 37402
  };

  const recentActivity = [
    { id: 1, type: 'approval', user: 'Maria Santos', action: '30 quizzes approved', time: '2 hours ago', status: 'approved' },
    { id: 2, type: 'generation', user: 'Juan Dela Cruz', action: '30 quizzes generated', time: '5 hours ago', status: 'pending' },
    { id: 3, type: 'completion', user: 'Sofia Reyes', action: 'Completed Level A1-Easy', time: '1 day ago', status: 'completed' },
    { id: 4, type: 'approval', user: 'Carlos Rivera', action: '30 quizzes approved', time: '1 day ago', status: 'approved' },
    { id: 5, type: 'generation', user: 'Ana Lopez', action: '30 quizzes generated', time: '2 days ago', status: 'pending' },
  ];

  const quizDistribution = [
    { level: 'A1', easy: 3245, medium: 3120, hard: 2980 },
    { level: 'A2', easy: 3180, medium: 3050, hard: 2890 },
    { level: 'B1', easy: 3100, medium: 2980, hard: 2850 },
    { level: 'B2', easy: 2950, medium: 2820, hard: 2700 },
    { level: 'C1', easy: 2780, medium: 2650, hard: 2520 },
    { level: 'C2', easy: 2600, medium: 2480, hard: 2350 },
  ];

  const interestPopularity = [
    { name: 'Adventure Stories', count: 487, color: '#FAA030' },
    { name: 'Friendship', count: 445, color: '#F59E0B' },
    { name: 'Fantasy & Magic', count: 398, color: '#8B5CF6' },
    { name: 'Nature & Animals', count: 376, color: '#22C55E' },
    { name: 'Sports & Games', count: 352, color: '#3B82F6' },
    { name: 'Filipino Culture', count: 334, color: '#EC4899' },
    { name: 'Music & Arts', count: 312, color: '#10B981' },
    { name: 'Family Values', count: 289, color: '#EF4444' },
  ];

  const maxCount = Math.max(...interestPopularity.map(i => i.count));

  return (
    <div style={{ width: '100%', minHeight: '100%', height: 'auto' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard & Analytics</h1>
          <p className="text-gray-600 mt-2">Overview of your quiz platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" style={{ gridAutoRows: 'auto' }}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            change="+12.5%"
            changeType="positive"
            icon={<Users className="w-5 h-5" />}
            color="bg-blue-500"
            subtitle={`+${stats.newUsers} new this month`}
          />
          <StatCard
            title="Active Quizzes"
            value={stats.activeQuizzes.toLocaleString()}
            change="+8.3%"
            changeType="positive"
            icon={<BookOpen className="w-5 h-5" />}
            color="bg-purple-500"
            subtitle={`${stats.totalQuestions.toLocaleString()} questions`}
          />
          <StatCard
            title="Pending Approval"
            value={stats.pendingApproval}
            change={null}
            icon={<Clock className="w-5 h-5" />}
            color="bg-orange-500"
            subtitle="Requires your review"
            alert={true}
          />
          <StatCard
            title="Completion Rate"
            value={`${stats.completionRate}%`}
            change="+2.1%"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-green-500"
            subtitle={`Avg score: ${stats.avgScore}%`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8" style={{ gridAutoRows: 'auto' }}>
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6" style={{ minHeight: 0, height: 'auto' }}>
            {/* Quiz Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ minHeight: 0, height: 'auto' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Quiz Distribution by Level</h2>
                  <p className="text-sm text-gray-500 mt-1">Active quizzes across difficulty levels</p>
                </div>
                <BarChart3 className="w-6 h-6 text-gray-400" />
              </div>

              <div className="space-y-5">
                {quizDistribution.map(level => {
                  const total = level.easy + level.medium + level.hard;
                  return (
                    <div key={level.level}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{level.level}</span>
                        <span className="text-sm text-gray-600">{total.toLocaleString()} quizzes</span>
                      </div>
                      <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                        <div 
                          className="bg-green-400 flex items-center justify-center text-xs font-medium text-white transition-all"
                          style={{ width: `${(level.easy / total) * 100}%` }}
                        >
                          {level.easy > 500 && 'Easy'}
                        </div>
                        <div 
                          className="bg-yellow-400 flex items-center justify-center text-xs font-medium text-white transition-all"
                          style={{ width: `${(level.medium / total) * 100}%` }}
                        >
                          {level.medium > 500 && 'Medium'}
                        </div>
                        <div 
                          className="bg-red-400 flex items-center justify-center text-xs font-medium text-white transition-all"
                          style={{ width: `${(level.hard / total) * 100}%` }}
                        >
                          {level.hard > 500 && 'Hard'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-6 mt-6 pt-5 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-400 rounded"></div>
                  <span className="text-sm text-gray-600">Easy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span className="text-sm text-gray-600">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-400 rounded"></div>
                  <span className="text-sm text-gray-600">Hard</span>
                </div>
              </div>
            </div>

            {/* Interest Popularity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ minHeight: 0, height: 'auto' }}>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">Interest Popularity</h2>
                <p className="text-sm text-gray-500 mt-1">Most selected topics by users</p>
              </div>

              <div className="space-y-4">
                {interestPopularity.map((interest, idx) => (
                  <div key={interest.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 w-6">#{idx + 1}</span>
                        <span className="font-semibold text-gray-900">{interest.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{interest.count} users</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div 
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(interest.count / maxCount) * 100}%`,
                          backgroundColor: interest.color 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Activity */}
          <div className="space-y-6" style={{ minHeight: 0, height: 'auto' }}>
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ minHeight: 0, height: 'auto' }}>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-500 mt-1">Latest updates</p>
              </div>

              <div className="space-y-4">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex gap-3">
                    <div className={`flex-shrink:0 w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.status === 'approved' ? 'bg-green-100' :
                      activity.status === 'pending' ? 'bg-orange-100' :
                      'bg-blue-100'
                    }`}>
                      {activity.status === 'approved' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                       activity.status === 'pending' ? <Clock className="w-5 h-5 text-orange-600" /> :
                       <BookOpen className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{activity.user}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{activity.action}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-6 pt-5 border-t border-gray-200 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                View All Activity
              </button>
            </div>

            {/* Quick Stats */}
            <div className=".bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white" style={{ minHeight: 0, height: 'auto' }}>
              <h3 className="text-lg font-bold mb-5">Platform Insights</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-100">Approved Quizzes</span>
                  <span className="text-2xl font-bold">{stats.approvedQuizzes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-100">Total Questions</span>
                  <span className="text-2xl font-bold">{stats.totalQuestions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-100">Approval Rate</span>
                  <span className="text-2xl font-bold">99.8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, changeType, icon, color, subtitle, alert }: {
  title: string;
  value: string | number;
  change?: string | null;
  changeType?: 'positive' | 'negative';
  icon: React.ReactNode;
  color: string;
  subtitle: string;
  alert?: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow" style={{ minHeight: 0, height: 'auto' }}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${color} p-3 rounded-lg text-white`}>
          {icon}
        </div>
        {change && (
          <span className={`text-sm font-semibold px-2 py-1 rounded ${
            changeType === 'positive' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
          }`}>
            {change}
          </span>
        )}
        {alert && (
          <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
            Action Required
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mb-1">{title}</div>
      <div className="text-sm text-gray-500">{subtitle}</div>
    </div>
  );
}