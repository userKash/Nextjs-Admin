"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../service/firebase";

import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
} from "lucide-react";

const COLORS = [
  "#FAA030",
  "#F59E0B",
  "#8B5CF6",
  "#22C55E",
  "#3B82F6",
  "#EC4899",
  "#10B981",
  "#EF4444",
];

interface UserData {
  id: string;
  name?: string;
  email?: string;
  createdAt?: Timestamp;
  interests?: string[];
}

interface QuizData {
  id: string;
  userId?: string;
  status?: string;
  difficulty?: string;
  level?: string;
  gameMode?: string;
  questions?: any[];
  updatedAt?: Timestamp;
}

interface ScoreData {
  id: string;
  score?: number;
  status?: string;
}

interface ActivityItem {
  id: string;
  user?: string;
  action: string;
  type: string;
  time: string | undefined;
  status?: string;
}

interface QuizDistribution {
  level: string;
  easy: number;
  medium: number;
  hard: number;
}

interface InterestStat {
  name: string;
  count: number;
  color: string;
}

interface ReQuestRequest {
  id: string;
  userId: string;
  requestStatus: string;
  createdAt?: Timestamp;
}


export default function DashboardAnalytics() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    newUsers: number;
    userGrowthPercentage: string;
    activeQuizzes: number;
    pendingApproval: number;
    avgScore: string;
    approvedQuizzes: number;
    totalQuestions: number;
  } | null>(null);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [quizDistribution, setQuizDistribution] = useState<QuizDistribution[]>([]);
  const [interestPopularity, setInterestPopularity] = useState<InterestStat[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const usersSnap = await getDocs(collection(db, "users"));
      const users: UserData[] = usersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Calculate new users (last 30 days) and previous period users (31-60 days ago)
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 86400000);
      const sixtyDaysAgo = now - (60 * 86400000);

      //NEW RE QUEST FEAURE
      const reQuestSnap = await getDocs(collection(db, "RequestQUEST"));
      const RequestQUEST: ReQuestRequest[] = reQuestSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as ReQuestRequest));

      // Convert Re-Quest requests into activity items for admin dashboard
    const reQuestActivity: ActivityItem[] = RequestQUEST.map((req) => {
      const user = users.find(u => u.id === req.userId);
      return {
        id: req.id,
        user: user?.name || req.userId,
        action: "Requested New Quiz Set",
        type: "reQuest",
        status: req.requestStatus,
        time: req.createdAt?.toDate()?.toLocaleString(),
      };
    });


      const newUsers = users.filter((u) => {
        const created = u.createdAt?.toDate?.();
        if (!created) return false;
        return created.getTime() >= thirtyDaysAgo;
      }).length;

      const previousPeriodUsers = users.filter((u) => {
        const created = u.createdAt?.toDate?.();
        if (!created) return false;
        const createdTime = created.getTime();
        return createdTime >= sixtyDaysAgo && createdTime < thirtyDaysAgo;
      }).length;

      // Calculate percentage growth
      let userGrowthPercentage = "+0.0";
      if (previousPeriodUsers > 0) {
        const percentageChange = ((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100;
        const sign = percentageChange >= 0 ? "+" : "";
        userGrowthPercentage = `${sign}${percentageChange.toFixed(1)}`;
      } else if (newUsers > 0) {
        userGrowthPercentage = "+100.0";
      }

      const interestCount: Record<string, number> = {};
      users.forEach((u) => {
        (u.interests || []).forEach((i) => {
          interestCount[i] = (interestCount[i] || 0) + 1;
        });
      });

      const interestPopularityArr =
        Object.keys(interestCount).length === 0
          ? []
          : Object.entries(interestCount)
              .map(([name, count], i) => ({
                name,
                count,
                color: COLORS[i % COLORS.length],
              }))
              .sort((a, b) => b.count - a.count);

      const quizSnap = await getDocs(collection(db, "quizzes"));
      const quizzes: QuizData[] = quizSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const pendingApproval = 
      quizzes.filter((q) => q.status === "pending").length +
      RequestQUEST.filter((r) => r.requestStatus === "pending").length;

      const approvedQuizzes = quizzes.filter((q) => q.status === "approved").length;

      // Count all active quiz sets (all game modes across all levels)
      const activeQuizSets = quizzes.length;

      // Calculate total questions from all quiz sets
      const totalQuestions = quizzes.reduce((sum, quiz) => {
        const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
        return sum + questionCount;
      }, 0);

      const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
      const dist = levels.map((level) => {
        // Case-insensitive level filtering
        const sets = quizzes.filter((q) =>
          q.level && q.level.toUpperCase() === level.toUpperCase()
        );

        // Debug logging
        console.log(`Level ${level}: ${sets.length} quiz sets`, {
          easy: sets.filter((q) => q.difficulty === "easy").length,
          medium: sets.filter((q) => q.difficulty === "medium").length,
          hard: sets.filter((q) => q.difficulty === "hard").length,
        });

        return {
          level,
          easy: sets.filter((q) => q.difficulty === "easy").length,
          medium: sets.filter((q) => q.difficulty === "medium").length,
          hard: sets.filter((q) => q.difficulty === "hard").length,
        };
      });

      const scoreSnap = await getDocs(collection(db, "scores"));
      const scores: ScoreData[] = scoreSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const avgScore =
        scores.length > 0
          ? (
              scores.reduce((s, e) => s + (e.score ?? 0), 0) / scores.length
            ).toFixed(2)
          : "0.00";

      const genSnap = await getDocs(
        query(collection(db, "quiz_generations"), orderBy("updatedAt", "desc"))
      );

      const gens: ActivityItem[] = genSnap.docs.map((d) => {
        const genUserId = d.data().userId;
        const user = users.find(u => u.id === genUserId);
        return {
          id: d.id,
          user: user?.name || genUserId,
          action: `${d.data().total} quizzes generated`,
          type: "generation",
          time: d.data().updatedAt?.toDate()?.toLocaleString(),
        };
      });

      const quizActivity: ActivityItem[] = quizzes.slice(0, 15).map((q) => {
        const user = users.find(u => u.id === q.userId);
        return {
          id: q.id,
          user: user?.name || q.userId,
          action: `${q.status === "approved" ? "Approved" : "Updated"} Quiz Set`,
          type: q.status === "approved" ? "approval" : "update",
          time: q.updatedAt?.toDate()?.toLocaleString(),
          status: q.status,
        };
      });

      const combined = [
    ...reQuestActivity,  // NEW
    ...gens,
    ...quizActivity
  ].slice(0, 12);


      setStats({
        totalUsers: users.length,
        newUsers,
        userGrowthPercentage,
        activeQuizzes: activeQuizSets,
        pendingApproval,
        avgScore,
        approvedQuizzes,
        totalQuestions,
      });

      setInterestPopularity(interestPopularityArr);
      setQuizDistribution(dist);
      setRecentActivity(combined);
      setLoading(false);
    }

    loadData();
  }, []);

  const maxCount =
    interestPopularity.length > 0
      ? Math.max(...interestPopularity.map((i) => i.count))
      : 1;

  return (
    <div style={{ width: "100%", minHeight: "100%" }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard & Analytics
          </h1>
          <p className="text-gray-600 mt-2">Overview of your quiz platform</p>
        </div>

        {!stats ? (
          <div className="text-center py-20 text-gray-500 text-lg">
            Loading data…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total Users"
                value={stats.totalUsers || "No Data"}
                change={`${stats.userGrowthPercentage}%`}
                changeType={stats.userGrowthPercentage?.startsWith("+") || stats.userGrowthPercentage?.startsWith("-") === false ? "positive" : "negative"}
                icon={<Users className="w-5 h-5" />}
                color="bg-blue-500"
                subtitle={`+${stats.newUsers} new this month`}
              />

              <StatCard
                title="Active Quizzes"
                value={stats.activeQuizzes || "No Data"}
                icon={<BookOpen className="w-5 h-5" />}
                color="bg-purple-500"
                subtitle={`${stats.totalQuestions.toLocaleString()} total questions`}
              />

              <StatCard
                title="Pending Approval"
                value={stats.pendingApproval}
                icon={<Clock className="w-5 h-5" />}
                color="bg-orange-500"
                subtitle="Requires your review"
                alert
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Quiz Distribution by Level
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Active quizzes across difficulty levels
                      </p>
                    </div>
                    <BarChart3 className="w-6 h-6 text-gray-400" />
                  </div>
                  {quizDistribution.length === 0 ? (
                    <p className="text-gray-500 text-sm">No Data</p>
                  ) : (
                    <div className="space-y-5">
                      {quizDistribution.map((lvl) => {
                        const total =
                          lvl.easy + lvl.medium + lvl.hard || 1; 
                        return (
                          <div key={lvl.level}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900">
                                {lvl.level}
                              </span>
                              <span className="text-sm text-gray-600">
                                {total} quizzes
                              </span>
                            </div>
                            <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                              <div
                                className="bg-green-400 text-white text-xs flex justify-center items-center"
                                style={{ width: `${(lvl.easy / total) * 100}%` }}
                              >
                                {lvl.easy > 0 && "Easy"}
                              </div>
                              <div
                                className="bg-yellow-400 text-white text-xs flex justify-center items-center"
                                style={{
                                  width: `${(lvl.medium / total) * 100}%`,
                                }}
                              >
                                {lvl.medium > 0 && "Medium"}
                              </div>

                              <div
                                className="bg-red-400 text-white text-xs flex justify-center items-center"
                                style={{
                                  width: `${(lvl.hard / total) * 100}%`,
                                }}
                              >
                                {lvl.hard > 0 && "Hard"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-6">
                    Interest Popularity
                  </h2>
                  {interestPopularity.length === 0 ? (
                    <p className="text-gray-500 text-sm">No Data</p>
                  ) : (
                    <div className="space-y-4">
                      {interestPopularity.map((item, idx) => (
                        <div key={item.name}>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500 w-6">
                                #{idx + 1}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {item.count} users
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full"
                              style={{
                                width: `${(item.count / maxCount) * 100}%`,
                                backgroundColor: item.color,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-6">
                    Recent Activity
                  </h2>
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-500 text-sm">No Recent Activity</p>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              activity.status === "approved"
                                ? "bg-green-100"
                                : activity.status === "pending"
                                ? "bg-orange-100"
                                : "bg-blue-100"
                            }`}
                          >
                            {activity.status === "approved" ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : activity.status === "pending" ? (
                              <Clock className="w-5 h-5 text-orange-600" />
                            ) : (
                              <BookOpen className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">
                              {activity.user || "System"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {activity.action}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="w-full mt-6 pt-5 border-t border-gray-200 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    View All Activity
                  </button>
                </div>
                <div className="bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-bold mb-5">Platform Insights</h3>
                  {!stats ? (
                    <p>No Data</p>
                  ) : (
                    <div className="space-y-4">
                      <Insight label="Approved Quizzes" value={stats.approvedQuizzes} />
                      <Insight label="Total Questions" value={stats.totalQuestions} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-indigo-100 text-sm">{label}</span>
      <span className="text-2xl font-bold">{value ?? "No Data"}</span>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
  color,
  subtitle,
  alert,
}: {
  title: string;
  value: string | number;
  change?: string | null;
  changeType?: "positive" | "negative";
  icon: React.ReactNode;
  color: string;
  subtitle: string;
  alert?: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`${color} p-3 rounded-lg text-white`}>{icon}</div>

        {change && (
          <span
            className={`text-sm font-semibold px-2 py-1 rounded ${
              changeType === "positive"
                ? "text-green-600 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}
          >
            {change}
          </span>
        )}

        {alert && (
          <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
            Action Required
          </span>
        )}
      </div>

      <div className="text-3xl font-bold text-gray-900">
        {value || "No Data"}
      </div>
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      <div className="text-sm text-gray-500">{subtitle}</div>
    </div>
  );
}