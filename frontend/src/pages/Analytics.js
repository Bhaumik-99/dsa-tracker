import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { 
  BarChart3, 
  Target, 
  Trophy, 
  Clock, 
  Flame,
  BookOpen,
  TrendingUp
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DIFFICULTY_COLORS = {
  Easy: "#10b981",
  Medium: "#f59e0b",
  Hard: "#f43f5e",
};

const PATTERN_COLORS = [
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e",
  "#ec4899", "#6366f1", "#14b8a6", "#eab308", "#ef4444",
  "#a855f7", "#22d3ee", "#84cc16", "#fb923c", "#f472b6",
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
        <p className="text-zinc-100 font-medium text-sm">
          {payload[0].payload.name || label}
        </p>
        <p className="text-violet-400 font-mono text-lg">
          {payload[0].value} problem{payload[0].value !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${API_URL}/api/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  const masteryRate = analytics?.total_problems > 0 
    ? Math.round((analytics.mastered_count / analytics.total_problems) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in" data-testid="analytics-page">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-zinc-100">
          Analytics
        </h1>
        <p className="mt-2 text-zinc-400">
          Track your DSA progress and identify patterns to focus on
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-total">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Target className="text-violet-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-2xl font-bold text-zinc-100">
            {analytics?.total_problems || 0}
          </p>
          <p className="text-sm text-zinc-500">Total Problems</p>
        </div>

        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-mastered">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Trophy className="text-emerald-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-2xl font-bold text-zinc-100">
            {analytics?.mastered_count || 0}
          </p>
          <p className="text-sm text-zinc-500">Mastered</p>
        </div>

        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-learning">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <BookOpen className="text-cyan-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-2xl font-bold text-zinc-100">
            {analytics?.learning_count || 0}
          </p>
          <p className="text-sm text-zinc-500">Learning</p>
        </div>

        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-due">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="text-amber-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-2xl font-bold text-zinc-100">
            {analytics?.due_today || 0}
          </p>
          <p className="text-sm text-zinc-500">Due Today</p>
        </div>

        <div className="glass rounded-xl p-5 card-interactive" data-testid="stat-streak">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Flame className="text-rose-400" size={20} />
            </div>
          </div>
          <p className="font-mono text-2xl font-bold text-zinc-100">
            {analytics?.streak || 0}
          </p>
          <p className="text-sm text-zinc-500">Day Streak</p>
        </div>
      </div>

      {/* Mastery Progress */}
      <div className="glass rounded-xl p-6" data-testid="mastery-progress">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <TrendingUp size={20} className="text-violet-400" />
            Mastery Progress
          </h2>
          <span className="font-mono text-2xl font-bold text-violet-400">
            {masteryRate}%
          </span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-1000"
            style={{ width: `${masteryRate}%` }}
          />
        </div>
        <p className="text-sm text-zinc-500 mt-2">
          {analytics?.mastered_count || 0} of {analytics?.total_problems || 0} problems mastered
        </p>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pattern Distribution */}
        <div className="glass rounded-xl p-6" data-testid="pattern-chart">
          <h2 className="font-heading text-lg font-semibold text-zinc-100 flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-violet-400" />
            Pattern Distribution
          </h2>
          
          {analytics?.pattern_distribution?.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={analytics.pattern_distribution}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <XAxis type="number" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#52525b" 
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    width={150}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={24}
                  >
                    {analytics.pattern_distribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PATTERN_COLORS[index % PATTERN_COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-zinc-500">
              No data available yet
            </div>
          )}
        </div>

        {/* Difficulty Distribution */}
        <div className="glass rounded-xl p-6" data-testid="difficulty-chart">
          <h2 className="font-heading text-lg font-semibold text-zinc-100 flex items-center gap-2 mb-6">
            <Target size={20} className="text-violet-400" />
            Difficulty Distribution
          </h2>
          
          {analytics?.difficulty_distribution?.some(d => d.count > 0) ? (
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.difficulty_distribution.filter(d => d.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="name"
                  >
                    {/* FIXED: Filter data first, then map colors to names explicitly */}
                    {analytics.difficulty_distribution
                      .filter(d => d.count > 0)
                      .map((entry) => (
                        <Cell 
                          key={`cell-${entry.name}`} 
                          fill={DIFFICULTY_COLORS[entry.name]} 
                          stroke="transparent"
                        />
                      ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-zinc-500">
              No data available yet
            </div>
          )}

          {/* Legend */}
          {analytics?.difficulty_distribution?.some(d => d.count > 0) && (
            <div className="flex justify-center gap-6 mt-4">
              {analytics.difficulty_distribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: DIFFICULTY_COLORS[item.name] }}
                  />
                  <span className="text-sm text-zinc-400">
                    {item.name}: {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pattern Breakdown Table */}
      {analytics?.pattern_distribution?.length > 0 && (
        <div className="glass rounded-xl overflow-hidden" data-testid="pattern-table">
          <div className="p-5 border-b border-zinc-800/50">
            <h2 className="font-heading text-lg font-semibold text-zinc-100">
              Pattern Breakdown
            </h2>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {analytics.pattern_distribution
              .sort((a, b) => b.count - a.count)
              .map((pattern, index) => (
                <div 
                  key={pattern.name}
                  className="px-5 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2 h-8 rounded-full"
                      style={{ backgroundColor: PATTERN_COLORS[index % PATTERN_COLORS.length] }}
                    />
                    <span className="text-zinc-200 font-mono text-sm">
                      {pattern.name}
                    </span>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {pattern.count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
