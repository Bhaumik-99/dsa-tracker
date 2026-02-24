import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
  PlusCircle,
  ChevronDown,
  Pencil,
  Save,
  BookOpen,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PatternCheatSheet = () => {
  const { token } = useAuth();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePatternId, setActivePatternId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [editNotesValue, setEditNotesValue] = useState("");
  const [savingNotesId, setSavingNotesId] = useState(null);
  const cardRefs = useRef({});

  const loadPatterns = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/pattern-cheats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPatterns(data);
      } else {
        toast.error("Failed to load patterns");
      }
    } catch (error) {
      console.error("Failed to fetch pattern cheats:", error);
      toast.error("Failed to load patterns");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  const toggleCard = (id) => {
    setActivePatternId((prev) => (prev === id ? null : id));
    if (activePatternId !== id) {
      setEditingNotesId(null);
      setEditNotesValue("");
    }
  };

  const scrollToCard = (id) => {
    requestAnimationFrame(() => {
      const el = cardRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  };

  useEffect(() => {
    if (activePatternId) {
      scrollToCard(activePatternId);
    }
  }, [activePatternId]);

  const startEditNotes = (pattern) => {
    setEditingNotesId(pattern.id);
    setEditNotesValue(pattern.notes || "");
  };

  const cancelEditNotes = () => {
    setEditingNotesId(null);
    setEditNotesValue("");
  };

  const saveNotes = async (pattern) => {
    setSavingNotesId(pattern.id);
    try {
      const isBuiltin = pattern.id.startsWith("builtin-");
      const payload = {
        name: pattern.name,
        description: pattern.description || "",
        notes: editNotesValue,
        tags: pattern.tags || [],
      };

      if (isBuiltin) {
        const response = await fetch(`${API_URL}/api/pattern-cheats/upsert`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const updated = await response.json();
          setPatterns((prev) =>
            prev.map((p) => (p.name === pattern.name ? updated : p))
          );
          setEditingNotesId(null);
          setEditNotesValue("");
          toast.success("Notes saved");
        } else {
          const err = await response.json();
          toast.error(err.detail || "Failed to save notes");
        }
      } else {
        const response = await fetch(
          `${API_URL}/api/pattern-cheats/${pattern.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ notes: editNotesValue }),
          }
        );
        if (response.ok) {
          setPatterns((prev) =>
            prev.map((p) =>
              p.id === pattern.id ? { ...p, notes: editNotesValue } : p
            )
          );
          setEditingNotesId(null);
          setEditNotesValue("");
          toast.success("Notes saved");
        } else {
          const err = await response.json();
          toast.error(err.detail || "Failed to save notes");
        }
      }
    } catch (error) {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotesId(null);
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
    <div className="space-y-6 animate-fade-in" data-testid="pattern-cheat-sheet">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-zinc-100">
            Pattern Cheat Sheet
          </h1>
          <p className="mt-2 text-zinc-400">
            Manage DSA patterns and your notes
          </p>
        </div>
        <Button
          onClick={() => setAddModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-lg transition-all shadow-lg shadow-violet-900/30"
          data-testid="add-pattern-btn"
        >
          <PlusCircle size={18} className="mr-2" />
          Add Pattern
        </Button>
      </div>

      {/* Pattern Cards */}
      <div className="space-y-3">
        {patterns.map((pattern) => {
          const isExpanded = activePatternId === pattern.id;
          return (
            <div
              key={pattern.id}
              ref={(el) => (cardRefs.current[pattern.id] = el)}
              className={cn(
                "glass rounded-xl border transition-all duration-300 overflow-hidden card-interactive",
                isExpanded
                  ? "border-violet-500/30"
                  : "border-zinc-800/50 hover:border-zinc-700"
              )}
            >
              {/* Collapsed header - always visible */}
              <button
                type="button"
                onClick={() => toggleCard(pattern.id)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none focus:ring-0"
                data-testid={`pattern-card-${pattern.id}`}
              >
                <span className="font-heading font-semibold text-zinc-100">
                  {pattern.name}
                </span>
                <ChevronDown
                  size={20}
                  className={cn(
                    "text-zinc-500 transition-transform duration-200 flex-shrink-0 ml-2",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {/* Collapsible content - smooth height animation */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div>
                  <div className="px-5 pb-5 pt-0 border-t border-zinc-800/50">
                    <div className="space-y-4">
                      {/* Description */}
                      {pattern.description && (
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                            Description
                          </h4>
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {pattern.description}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                            Notes
                          </h4>
                          {editingNotesId !== pattern.id ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditNotes(pattern)}
                              className="text-zinc-400 hover:text-zinc-100 h-8"
                            >
                              <Pencil size={14} className="mr-1" />
                              Edit Notes
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditNotes}
                                className="text-zinc-400 hover:text-zinc-100 h-8"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveNotes(pattern)}
                                disabled={savingNotesId === pattern.id}
                                className="bg-violet-600 hover:bg-violet-700 h-8"
                              >
                                {savingNotesId === pattern.id ? (
                                  <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Save size={14} />
                                    Save
                                  </span>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                        {editingNotesId === pattern.id ? (
                          <Textarea
                            value={editNotesValue}
                            onChange={(e) => setEditNotesValue(e.target.value)}
                            placeholder="Add your notes..."
                            rows={4}
                            className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-zinc-400 min-h-[2rem]">
                            {pattern.notes || "No notes yet. Click Edit Notes to add."}
                          </p>
                        )}
                      </div>

                      {/* Tags */}
                      {pattern.tags && pattern.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pattern.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded text-xs font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {patterns.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <BookOpen className="text-violet-400 mx-auto mb-4" size={28} />
          <h3 className="font-heading text-lg font-semibold text-zinc-100">
            No patterns yet
          </h3>
          <p className="text-zinc-500 mt-2">
            Add your first pattern or use the built-in ones above
          </p>
        </div>
      )}

      <AddPatternModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={(newPattern) => {
          setPatterns((prev) => [...prev, newPattern]);
          setAddModalOpen(false);
          toast.success("Pattern added");
        }}
        token={token}
      />
    </div>
  );
};

const AddPatternModal = ({ open, onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    notes: "",
    tags: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim()) {
      setFormError("Pattern Name is required");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Description is required");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/pattern-cheats`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          notes: formData.notes.trim() || "",
          tags: formData.tags
            ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data);
        setFormData({ name: "", description: "", notes: "", tags: "" });
      } else {
        const err = await response.json();
        setFormError(err.detail || "Failed to add pattern");
      }
    } catch (error) {
      setFormError("Failed to add pattern");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", description: "", notes: "", tags: "" });
    setFormError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Add Pattern</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-sm text-rose-400">{formError}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="add-name" className="text-zinc-300">
              Pattern Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="add-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Two Pointers"
              required
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-desc" className="text-zinc-300">
              Description <span className="text-rose-400">*</span>
            </Label>
            <Textarea
              id="add-desc"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of the pattern"
              required
              rows={3}
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-notes" className="text-zinc-300">
              Notes (optional)
            </Label>
            <Textarea
              id="add-notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Your notes..."
              rows={3}
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-tags" className="text-zinc-300">
              Tags (optional, comma-separated)
            </Label>
            <Input
              id="add-tags"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="e.g., array, pointers"
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {submitting ? "Adding..." : "Add Pattern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PatternCheatSheet;
