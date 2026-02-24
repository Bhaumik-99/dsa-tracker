import { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Pencil, Save } from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

/**
 * Reusable modal for viewing full pattern description, notes, and tags.
 * Renders only when open. Supports Edit Notes with inline save.
 */
const PatternDescriptionModal = ({ pattern, isOpen, onClose, token, onSaveNotes }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollPosRef = useRef(0);

  useEffect(() => {
    if (isOpen && pattern) {
      setEditValue(pattern.notes || "");
      setIsEditing(false);
      scrollPosRef.current = window.scrollY;
    }
  }, [isOpen, pattern]);

  const handleClose = () => {
    window.scrollTo(0, scrollPosRef.current);
    onClose();
  };

  const handleSave = async () => {
    if (!pattern || !onSaveNotes) return;
    setSaving(true);
    try {
      await onSaveNotes(pattern, editValue);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!pattern) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal>
        <DialogOverlay className="backdrop-blur-sm bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-2xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%]",
            "border border-zinc-800 bg-zinc-900 rounded-xl shadow-lg overflow-hidden flex flex-col",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Close button */}
          <DialogPrimitive.Close
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring z-20"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {/* Sticky header */}
          <DialogHeader className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800/50 px-6 py-4 shrink-0">
            <DialogTitle className="font-heading text-xl font-semibold text-zinc-100 pr-10">
              {pattern.name}
            </DialogTitle>
          </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="space-y-5">
            {/* Description - only show when available */}
            {pattern.description && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Description
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
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
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
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
                      onClick={() => setIsEditing(false)}
                      className="text-zinc-400 hover:text-zinc-100 h-8"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-violet-600 hover:bg-violet-700 h-8"
                    >
                      {saving ? (
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
              {isEditing ? (
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Add your notes..."
                  rows={6}
                  className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 resize-none"
                />
              ) : (
                <p className="text-sm text-zinc-400 whitespace-pre-wrap min-h-[2rem]">
                  {pattern.notes || "No notes yet. Click Edit Notes to add."}
                </p>
              )}
            </div>

            {/* Tags */}
            {pattern.tags && pattern.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Tags
                </h4>
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
              </div>
            )}
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default PatternDescriptionModal;
