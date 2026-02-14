import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { PlusCircle, Link as LinkIcon, FileText, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const AddProblem = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    link: "",
    pattern: "",
    difficulty: "",
    notes: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/problems`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Problem added successfully! Revision schedule created.");
        navigate("/");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to add problem");
      }
    } catch (error) {
      toast.error("Failed to add problem");
    } finally {
      setLoading(false);
    }
  };

  const isLeetCode = formData.link.toLowerCase().includes("leetcode.com");

  return (
    <div className="max-w-2xl mx-auto animate-fade-in" data-testid="add-problem-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-zinc-100">
          Add Problem
        </h1>
        <p className="mt-2 text-zinc-400">
          Log a solved problem to start your spaced repetition schedule
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6" data-testid="add-problem-form">
        <div className="glass rounded-xl p-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300 flex items-center gap-2">
              <FileText size={16} className="text-zinc-500" />
              Problem Title
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Two Sum"
              required
              data-testid="problem-title"
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link" className="text-zinc-300 flex items-center gap-2">
              <LinkIcon size={16} className="text-zinc-500" />
              Problem URL
            </Label>
            <div className="relative">
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://leetcode.com/problems/two-sum"
                required
                data-testid="problem-link"
                className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20"
              />
              {isLeetCode && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 leetcode-badge">
                  LeetCode
                </span>
              )}
            </div>
          </div>

          {/* Pattern & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pattern */}
            <div className="space-y-2">
              <Label htmlFor="pattern" className="text-zinc-300 flex items-center gap-2">
                <BookOpen size={16} className="text-zinc-500" />
                Pattern
              </Label>
              <Select
                value={formData.pattern}
                onValueChange={(value) => setFormData({ ...formData, pattern: value })}
                required
              >
                <SelectTrigger 
                  data-testid="pattern-select"
                  className="bg-zinc-950/50 border-zinc-800 text-zinc-100 focus:ring-violet-500/20"
                >
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {patterns.map((pattern) => (
                    <SelectItem 
                      key={pattern} 
                      value={pattern}
                      className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
                    >
                      {pattern}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label htmlFor="difficulty" className="text-zinc-300">
                Difficulty
              </Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                required
              >
                <SelectTrigger 
                  data-testid="difficulty-select"
                  className="bg-zinc-950/50 border-zinc-800 text-zinc-100 focus:ring-violet-500/20"
                >
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {DIFFICULTIES.map((diff) => (
                    <SelectItem 
                      key={diff} 
                      value={diff}
                      className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
                    >
                      <span className={`inline-flex items-center gap-2`}>
                        <span className={`w-2 h-2 rounded-full ${
                          diff === "Easy" ? "bg-emerald-400" :
                          diff === "Medium" ? "bg-amber-400" : "bg-rose-400"
                        }`} />
                        {diff}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-zinc-300">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Key insights, approach, or things to remember..."
              rows={4}
              data-testid="problem-notes"
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 resize-none"
            />
          </div>
        </div>

        {/* Schedule Preview */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-heading text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Revision Schedule Preview
          </h3>
          <div className="flex flex-wrap gap-2">
            {["Day 1", "Day 3", "Day 7", "Day 14", "Day 30"].map((day, i) => (
              <span
                key={day}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono border ${
                  i === 0 ? "badge-day1" :
                  i === 1 ? "badge-day3" :
                  i === 2 ? "badge-day7" :
                  i === 3 ? "badge-day14" : "badge-day30"
                }`}
              >
                {day}
              </span>
            ))}
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono border badge-mastered">
              Mastered
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            After completing all revisions, this problem will be marked as Mastered.
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading || !formData.title || !formData.link || !formData.pattern || !formData.difficulty}
          data-testid="submit-problem"
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding Problem...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <PlusCircle size={18} />
              Add Problem & Start Tracking
            </span>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddProblem;
