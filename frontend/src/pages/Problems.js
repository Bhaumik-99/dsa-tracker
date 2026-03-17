import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Trophy,
  Clock,
  BookOpen,
  X,
  RotateCcw
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getDifficultyClass = (difficulty) => {
  const classes = {
    Easy: "badge-easy",
    Medium: "badge-medium",
    Hard: "badge-hard",
  };
  return classes[difficulty] || "";
};

const getStatusBadge = (status, completedRevisions) => {
  if (status === "mastered") {
    return { class: "badge-mastered", label: "Mastered", icon: Trophy };
  }
  
  const pendingCount = 5 - completedRevisions.length;
  return { 
    class: "bg-violet-500/10 text-violet-400 border-violet-500/20", 
    label: `${pendingCount} revision${pendingCount !== 1 ? 's' : ''} left`,
    icon: Clock 
  };
};

const Problems = () => {
  const { token } = useAuth();
  const [problems, setProblems] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revisingAgainId, setRevisingAgainId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    pattern: "",
    difficulty: "",
    status: "",
  });

  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const response = await fetch(`${API_URL}/api/patterns`);
        if (response.ok) {
          const data = await response.json();
          setPatterns(data.patterns);
        }
      } catch (error) {
        console.error("Failed to fetch patterns:", error);
      }
    };
    fetchPatterns();
  }, []);

  useEffect(() => {
    const fetchProblems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.append("search", filters.search);
        if (filters.pattern) params.append("pattern", filters.pattern);
        if (filters.difficulty) params.append("difficulty", filters.difficulty);
        if (filters.status) params.append("status", filters.status);

        const response = await fetch(`${API_URL}/api/problems?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setProblems(data);
        }
      } catch (error) {
        console.error("Failed to fetch problems:", error);
        toast.error("Failed to load problems");
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchProblems, 300);
    return () => clearTimeout(debounce);
  }, [token, filters]);

  const clearFilters = () => {
    setFilters({ search: "", pattern: "", difficulty: "", status: "" });
  };

  const hasActiveFilters = filters.pattern || filters.difficulty || filters.status;

  const reviseAgain = async (problemId) => {
    setRevisingAgainId(problemId);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`${API_URL}/api/problems/${problemId}/revise-again`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ timezone_str: timezone }),
      });

      if (response.ok) {
        toast.success("Revision restarted from Day 3");
        // Update just this problem in-place (avoid refetch + keep scroll)
        setProblems((prev) =>
          prev.map((p) =>
            p.id === problemId
              ? { ...p, status: "learning", completed_revisions: ["day1"] }
              : p
          )
        );
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed to restart revision");
      }
    } catch (error) {
      toast.error("Failed to restart revision");
    } finally {
      setRevisingAgainId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="problems-page">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-zinc-100">
          Problems Library
        </h1>
        <p className="mt-2 text-zinc-400">
          All your tracked DSA problems in one place
        </p>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <Input
              type="text"
              placeholder="Search problems..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              data-testid="search-input"
              className="pl-10 bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          {/* Pattern Filter */}
          <Select
            value={filters.pattern}
            onValueChange={(value) => setFilters({ ...filters, pattern: value })}
          >
            <SelectTrigger 
              data-testid="filter-pattern"
              className="w-full lg:w-48 bg-zinc-950/50 border-zinc-800 text-zinc-100"
            >
              <SelectValue placeholder="All Patterns" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 max-h-64">
              {patterns.map((pattern) => (
                <SelectItem 
                  key={pattern} 
                  value={pattern}
                  className="text-zinc-100 focus:bg-zinc-800"
                >
                  {pattern}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Difficulty Filter */}
          <Select
            value={filters.difficulty}
            onValueChange={(value) => setFilters({ ...filters, difficulty: value })}
          >
            <SelectTrigger 
              data-testid="filter-difficulty"
              className="w-full lg:w-36 bg-zinc-950/50 border-zinc-800 text-zinc-100"
            >
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="Easy" className="text-zinc-100 focus:bg-zinc-800">Easy</SelectItem>
              <SelectItem value="Medium" className="text-zinc-100 focus:bg-zinc-800">Medium</SelectItem>
              <SelectItem value="Hard" className="text-zinc-100 focus:bg-zinc-800">Hard</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger 
              data-testid="filter-status"
              className="w-full lg:w-36 bg-zinc-950/50 border-zinc-800 text-zinc-100"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="learning" className="text-zinc-100 focus:bg-zinc-800">Learning</SelectItem>
              <SelectItem value="mastered" className="text-zinc-100 focus:bg-zinc-800">Mastered</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              data-testid="clear-filters"
              className="text-zinc-400 hover:text-zinc-100"
            >
              <X size={16} className="mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Problems List */}
      <div className="glass rounded-xl overflow-hidden" data-testid="problems-list">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : problems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="text-zinc-500" size={28} />
            </div>
            <h3 className="font-heading text-lg font-semibold text-zinc-100 mb-2">
              No problems found
            </h3>
            <p className="text-zinc-500">
              {hasActiveFilters 
                ? "Try adjusting your filters" 
                : "Add your first problem to get started"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {/* Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 bg-zinc-900/50 text-xs font-mono uppercase tracking-wider text-zinc-500">
              <div className="col-span-4">Problem</div>
              <div className="col-span-3">Pattern</div>
              <div className="col-span-2">Difficulty</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1"></div>
            </div>

            {/* Rows */}
            {problems.map((problem, index) => {
              const statusBadge = getStatusBadge(problem.status, problem.completed_revisions);
              const StatusIcon = statusBadge.icon;
              
              return (
                <div
                  key={problem.id}
                  className="px-5 py-4 hover:bg-zinc-800/30 transition-colors"
                  style={{ animationDelay: `${index * 30}ms` }}
                  data-testid={`problem-row-${problem.id}`}
                >
                  <div className="md:grid md:grid-cols-12 gap-4 items-center">
                    {/* Problem Title */}
                    <div className="col-span-4 mb-3 md:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100 truncate">
                          {problem.title}
                        </span>
                        {problem.is_leetcode && (
                          <span className="leetcode-badge flex-shrink-0">LC</span>
                        )}
                      </div>
                      {problem.notes && (
                        <p className="text-xs text-zinc-500 truncate mt-1">
                          {problem.notes}
                        </p>
                      )}
                    </div>

                    {/* Pattern */}
                    <div className="col-span-3 mb-2 md:mb-0">
                      <span className="text-sm text-zinc-400 font-mono">
                        {problem.pattern}
                      </span>
                    </div>

                    {/* Difficulty */}
                    <div className="col-span-2 mb-2 md:mb-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono border ${getDifficultyClass(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 mb-3 md:mb-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.class}`}>
                        <StatusIcon size={12} />
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-2">
                      {problem.status === "mastered" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reviseAgain(problem.id)}
                          disabled={revisingAgainId === problem.id}
                          data-testid={`revise-again-${problem.id}`}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          <RotateCcw size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(problem.link, "_blank")}
                        data-testid={`open-${problem.id}`}
                        className="text-zinc-400 hover:text-zinc-100"
                      >
                        <ExternalLink size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Count */}
      {!loading && problems.length > 0 && (
        <p className="text-sm text-zinc-500 text-center">
          Showing {problems.length} problem{problems.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default Problems;
