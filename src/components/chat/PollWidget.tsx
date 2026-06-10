"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PollOption = {
  text: string;
  votesCount: number;
};

export type PollWidgetProps = {
  question: string;
  options: PollOption[];
  totalVoters: number;
  votedIndex?: number;
  isClosed?: boolean;
  onVote?: (optionIndex: number) => void;
};

export const PollWidget = ({
  question,
  options,
  totalVoters,
  votedIndex,
  isClosed,
  onVote,
}: PollWidgetProps) => {
  const maxVotes = Math.max(...options.map((o) => o.votesCount), 1);

  return (
    <div className="rounded-2xl border border-tepla-border/80 bg-black/40 p-3">
      <p className="mb-3 text-sm font-medium text-tepla-text">{question}</p>
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const pct = (opt.votesCount / maxVotes) * 100;
          const isVoted = votedIndex === idx;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative overflow-hidden rounded-xl"
            >
              <div
                className="absolute inset-y-0 left-0 bg-tepla-accent/30 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm text-tepla-text">{opt.text}</span>
                <span className="text-xs text-tepla-text-muted">
                  {opt.votesCount} {opt.votesCount === 1 ? "vote" : "votes"}
                </span>
              </div>
              {!isClosed && onVote && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2",
                    isVoted && "opacity-50",
                  )}
                  disabled={isVoted}
                  onClick={() => onVote(idx)}
                >
                  {isVoted ? "Voted" : "Vote"}
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-tepla-text-muted">
        {totalVoters} {totalVoters === 1 ? "voter" : "voters"}
      </p>
    </div>
  );
};
