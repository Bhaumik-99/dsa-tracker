import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { 
  Flame, 
  Target, 
  Trophy, 
  Clock, 
  ExternalLink, 
  Check,
  AlertCircle,
  BookOpen
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

  const fetchData = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const [revisionsRes, analyticsRes] = await Promise.all([
        fetch(`${API_URL}/api/revisions/today?timezone_str=${encodeURIComponent(timezone)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
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
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const markRevised = async (problemId, stage) => {
    setMarkingId(problemId);
    try {
      const response = await fetch(`${API_URL}/api/revise/${problemId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ revision_stage: stage }),
      });

      if (response.ok) {
        toast.success("Revision marked complete!");
        fetchData();
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

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-streak">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Flame className="text-amber-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-3xl font-bold text-zinc-100">
            {analytics?.streak || 0}
          </p>
          <p className="text-sm text-zinc-500 mt-1">Day Streak</p>
        </div>

        {/* Due Today */}
        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-due-today">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Clock className="text-violet-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-3xl font-bold text-zinc-100">
            {analytics?.due_today || 0}
          </p>
          <p className="text-sm text-zinc-500 mt-1">Due Today</p>
        </div>

        {/* Total Problems */}
        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-total">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Target className="text-emerald-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-3xl font-bold text-zinc-100">
            {analytics?.total_problems || 0}
          </p>
          <p className="text-sm text-zinc-500 mt-1">Total Problems</p>
        </div>

        {/* Mastered */}
        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-mastered">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Trophy className="text-cyan-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-3xl font-bold text-zinc-100">
            {analytics?.mastered_count || 0}
          </p>
          <p className="text-sm text-zinc-500 mt-1">Mastered</p>
        </div>
      </div>

      {/* Today's Revisions */}
      <div className="glass rounded-xl overflow-hidden" data-testid="revisions-section">
        <div className="p-5 border-b border-zinc-800/50">
          <h2 className="font-heading text-xl font-semibold text-zinc-100 flex items-center gap-2">
            <Clock size={20} className="text-violet-400" />
            Problems to Revise Today
          </h2>
        </div>

        {revisions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="text-emerald-400" size={28} />
            </div>
            <h3 className="font-heading text-lg font-semibold text-zinc-100 mb-2">
              All caught up!
            </h3>
            <p className="text-zinc-500">
              No revisions due today. Great job staying on track!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {revisions.map((problem, index) => (
              <div
                key={`${problem.id}-${problem.revision_stage}`}
                className={`p-5 hover:bg-zinc-800/30 transition-colors ${
                  problem.is_overdue ? "bg-rose-500/5" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`revision-card-${problem.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Problem info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-medium text-zinc-100 truncate">
                        {problem.title}
                      </h3>
                      {problem.is_leetcode && (
                        <span className="leetcode-badge">LeetCode</span>
                      )}
                      {problem.is_overdue && (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                          <AlertCircle size={12} />
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono border ${getRevisionBadgeClass(problem.revision_stage)}`}>
                        {getRevisionLabel(problem.revision_stage)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono border ${getDifficultyClass(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        {problem.pattern}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(problem.link, "_blank")}
                      data-testid={`open-problem-${problem.id}`}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      <ExternalLink size={14} className="mr-1.5" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => markRevised(problem.id, problem.revision_stage)}
                      disabled={markingId === problem.id}
                      data-testid={`mark-revised-${problem.id}`}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {markingId === problem.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={14} className="mr-1.5" />
                          Mark Revised
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state prompt */}
      {analytics?.total_problems === 0 && (
        <div className="glass rounded-xl p-8 text-center" data-testid="empty-state">
          <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="text-violet-400" size={28} />
          </div>
          <h3 className="font-heading text-lg font-semibold text-zinc-100 mb-2">
            Start your DSA journey
          </h3>
          <p className="text-zinc-500 mb-4">
            Add your first problem to begin tracking revisions
          </p>
          <Button
            onClick={() => window.location.href = "/add"}
            data-testid="add-first-problem"
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Add Your First Problem
          </Button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
