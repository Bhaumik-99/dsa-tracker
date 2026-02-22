import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
  Flame,
  Target,
  Trophy,
  Clock,
  ExternalLink,
  Check,
  BookOpen,
} from "lucide-react";
import { Button } from "../components/ui/button";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getRevisionBadgeClass = (stage) => {
  const classes = {
    day1: "badge-day1",
    day3: "badge-day3",
    day7: "badge-day7",
    day14: "badge-day14",
    day30: "badge-day30",
  };
  return classes[stage] || "bg-zinc-800 text-zinc-400 border-zinc-700";
};

const getRevisionLabel = (stage) => {
  const labels = {
    day1: "Day 1",
    day3: "Day 3",
    day7: "Day 7",
    day14: "Day 14",
    day30: "Day 30",
  };
  return labels[stage] || stage;
};

const getDifficultyClass = (difficulty) => {
  const classes = {
    Easy: "badge-easy",
    Medium: "badge-medium",
    Hard: "badge-hard",
  };
  return classes[difficulty] || "";
};

const Dashboard = () => {
  const { token, refreshUser } = useAuth();

  const [revisions, setRevisions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);

  /**
   * ✅ Stable fetch function
   */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Passing timezone to BOTH endpoints now
      const [revisionsRes, analyticsRes] = await Promise.all([
        fetch(
          `${API_URL}/api/revisions/today?timezone_str=${encodeURIComponent(
            timezone
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        fetch(
          `${API_URL}/api/analytics?timezone_str=${encodeURIComponent(
            timezone
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      if (revisionsRes.ok) {
        const data = await revisionsRes.json();
        setRevisions(data);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * ✅ Runs when token changes
   */
  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token, loadDashboard]);

  /**
   * ✅ Mark revision
   */
  const markRevised = async (problemId, stage) => {
    setMarkingId(problemId);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localCompletedAt = new Date().toISOString();

      const response = await fetch(`${API_URL}/api/revise/${problemId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          revision_stage: stage,
          completed_at: localCompletedAt,
          timezone_str: timezone
        }),
      });

      if (response.ok) {
        toast.success("Revision marked complete!");
        await loadDashboard(); // ✅ refresh dashboard safely
        refreshUser();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to mark revision");
      }
    } catch (error) {
      toast.error("Failed to mark revision");
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-2 text-zinc-400">
          Your daily revision schedule and progress overview
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame />}
          value={analytics?.streak || 0}
          label="Day Streak"
          color="amber"
        />
        <StatCard
          icon={<Clock />}
          value={analytics?.due_today || 0}
          label="Due Today"
          color="violet"
        />
        <StatCard
          icon={<Target />}
          value={analytics?.total_problems || 0}
          label="Total Problems"
          color="emerald"
        />
        <StatCard
          icon={<Trophy />}
          value={analytics?.mastered_count || 0}
          label="Mastered"
          color="cyan"
        />
      </div>

      {/* Revisions Section */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800/50">
          <h2 className="font-heading text-xl font-semibold text-zinc-100 flex items-center gap-2">
            <Clock size={20} className="text-violet-400" />
            Problems to Revise Today
          </h2>
        </div>

        {revisions.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="text-emerald-400 mx-auto mb-4" size={28} />
            <h3 className="font-heading text-lg font-semibold text-zinc-100">
              All caught up!
            </h3>
            <p className="text-zinc-500">No revisions due today.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {revisions.map((problem) => (
              <div
                key={`${problem.id}-${problem.revision_stage}`}
                className="p-5"
              >
                <div className="flex justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-zinc-100">{problem.title}</h3>

                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span
                        className={`px-2 py-1 text-xs border rounded ${getRevisionBadgeClass(
                          problem.revision_stage
                        )}`}
                      >
                        {getRevisionLabel(problem.revision_stage)}
                      </span>

                      <span
                        className={`px-2 py-1 text-xs border rounded ${getDifficultyClass(
                          problem.difficulty
                        )}`}
                      >
                        {problem.difficulty}
                      </span>
                      
                      {problem.is_overdue && (
                        <span className="px-2 py-1 text-xs border rounded bg-red-900/30 text-red-400 border-red-800/50">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(problem.link, "_blank")}
                    >
                      <ExternalLink size={14} className="mr-1" />
                      Open
                    </Button>

                    <Button
                      size="sm"
                      onClick={() =>
                        markRevised(problem.id, problem.revision_stage)
                      }
                      disabled={markingId === problem.id}
                    >
                      <Check size={14} className="mr-1" />
                      Mark Revised
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {analytics?.total_problems === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <BookOpen className="text-violet-400 mx-auto mb-4" size={28} />
          <h3 className="text-zinc-100 font-semibold">
            Start your DSA journey
          </h3>
          <Button
            className="mt-4"
            onClick={() => (window.location.href = "/add")}
          >
            Add Your First Problem
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Small reusable stat component
 */
const StatCard = ({ icon, value, label }) => (
  <div className="glass rounded-xl p-5">
    <div className="mb-3">{icon}</div>
    <p className="font-mono text-3xl font-bold text-zinc-100">{value}</p>
    <p className="text-sm text-zinc-500">{label}</p>
  </div>
);

export default Dashboard;
