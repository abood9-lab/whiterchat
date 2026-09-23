import { useState } from "react";
import { X, Plus, Trash2, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onCreated?: (poll: any) => void;
}

export function CreatePollModal({ isOpen, onClose, conversationId, onCreated }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowVoteChange, setAllowVoteChange] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setErrorText("Please enter a poll question");
      return;
    }

    const cleanOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (cleanOptions.length < 2) {
      setErrorText("Please provide at least 2 options");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/polls`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: cleanQuestion,
          options: cleanOptions,
          allowMultiple,
          allowVoteChange,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create poll");
      }

      onCreated?.(data);
      onClose();
      // Reset form
      setQuestion("");
      setOptions(["", ""]);
      setAllowMultiple(false);
      setAllowVoteChange(true);
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-none sm:max-w-md bg-card border-t sm:border border-border rounded-t-[28px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[90vh] pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom)))] sm:pb-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="mx-auto mt-2.5 -mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden shrink-0 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Create Poll</h3>
              <p className="text-xs text-muted-foreground">Ask a question and collect votes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorText && (
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20">
              {errorText}
            </div>
          )}

          {/* Question */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Question <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. When should we meet? or Which design looks better?"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:border-primary/50 text-foreground"
              maxLength={200}
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Options <span className="text-destructive">*</span> (at least 2)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-5 text-center">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:border-primary/50 text-foreground"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another option
              </button>
            )}
          </div>

          {/* Settings Toggles */}
          <div className="pt-2 border-t border-border space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <div className="text-xs font-medium text-foreground">Allow multiple answers</div>
                <div className="text-[11px] text-muted-foreground">Participants can choose more than one option</div>
              </div>
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={e => setAllowMultiple(e.target.checked)}
                className="w-4 h-4 text-primary rounded-xs border-border focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <div className="text-xs font-medium text-foreground">Allow vote changes</div>
                <div className="text-[11px] text-muted-foreground">Participants can change their choice after voting</div>
              </div>
              <input
                type="checkbox"
                checked={allowVoteChange}
                onChange={e => setAllowVoteChange(e.target.checked)}
                className="w-4 h-4 text-primary rounded-xs border-border focus:ring-primary"
              />
            </label>
          </div>

          {/* Footer actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold px-4"
            >
              {isSubmitting ? "Creating..." : "Create Poll"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
