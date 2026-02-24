import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { PlusCircle, BookOpen, FileText } from "lucide-react";
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
import PatternDescriptionModal from "../components/PatternDescriptionModal";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PatternCheatSheet = () => {
  const { token } = useAuth();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);

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

  const saveNotes = async (pattern, notesValue) => {
    const valueToSave = notesValue ?? "";
    try {
      const isBuiltin = pattern.id.startsWith("builtin-");
      const payload = {
        name: pattern.name,
        description: pattern.description || "",
        notes: valueToSave,
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
          if (selectedPattern?.name === pattern.name) {
            setSelectedPattern(updated);
          }
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
            body: JSON.stringify({ notes: valueToSave }),
          }
        );
        if (response.ok) {
          const updated = { ...pattern, notes: valueToSave };
          setPatterns((prev) =>
            prev.map((p) => (p.id === pattern.id ? updated : p))
          );
          if (selectedPattern?.id === pattern.id) {
            setSelectedPattern(updated);
          }
          toast.success("Notes saved");
        } else {
          const err = await response.json();
          toast.error(err.detail || "Failed to save notes");
        }
      }
    } catch (error) {
      toast.error("Failed to save notes");
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
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className="glass rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all card-interactive"
          >
            <div className="flex items-center justify-between p-5 gap-3">
              <span className="font-heading font-semibold text-zinc-100 truncate" data-testid={`pattern-card-${pattern.id}`}>
                {pattern.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPattern(pattern)}
                className="flex-shrink-0 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                data-testid={`view-notes-${pattern.id}`}
              >
                <FileText size={14} className="mr-1.5" />
                  View Notes
              </Button>
            </div>
          </div>
        ))}
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

      {selectedPattern && (
        <PatternDescriptionModal
          pattern={selectedPattern}
          isOpen={!!selectedPattern}
          onClose={() => setSelectedPattern(null)}
          token={token}
          onSaveNotes={async (pattern, notesValue) => {
            await saveNotes(pattern, notesValue);
          }}
        />
      )}
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
