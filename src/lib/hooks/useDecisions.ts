import { useState, useCallback } from "react";
import type { CandidateDecision, CandidateDecisionState, DecisionStats } from "../../types";

/**
 * Custom hook for managing user decisions on flashcard candidates
 * Handles accept, reject, edit, and cancel edit actions
 */
export function useDecisions(totalCandidates: number) {
  const [decisions, setDecisions] = useState<Map<number, CandidateDecision>>(new Map());

  /**
   * Accept a candidate without modifications
   */
  const accept = useCallback((candidateIndex: number) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(candidateIndex, {
        candidateIndex,
        state: 'accepted',
        editedContent: undefined,
      });
      return next;
    });
  }, []);

  /**
   * Reject a candidate
   */
  const reject = useCallback((candidateIndex: number) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(candidateIndex, {
        candidateIndex,
        state: 'rejected',
        editedContent: undefined,
      });
      return next;
    });
  }, []);

  /**
   * Edit a candidate with new content
   */
  const edit = useCallback((candidateIndex: number, front: string, back: string) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(candidateIndex, {
        candidateIndex,
        state: 'edited',
        editedContent: { front, back },
      });
      return next;
    });
  }, []);

  /**
   * Cancel edit and reset to pending state
   */
  const cancelEdit = useCallback((candidateIndex: number) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.delete(candidateIndex);
      return next;
    });
  }, []);

  /**
   * Get decision for a specific candidate
   */
  const getDecision = useCallback((candidateIndex: number): CandidateDecision | undefined => {
    return decisions.get(candidateIndex);
  }, [decisions]);

  /**
   * Get state for a specific candidate
   */
  const getState = useCallback((candidateIndex: number): CandidateDecisionState => {
    const decision = decisions.get(candidateIndex);
    return decision?.state || 'pending';
  }, [decisions]);

  /**
   * Get statistics about all decisions
   */
  const getStats = useCallback((): DecisionStats => {
    const stats: DecisionStats = {
      total: totalCandidates,
      pending: 0,
      accepted: 0,
      edited: 0,
      rejected: 0,
    };

    for (let i = 0; i < totalCandidates; i++) {
      const decision = decisions.get(i);
      if (!decision) {
        stats.pending++;
      } else {
        stats[decision.state]++;
      }
    }

    return stats;
  }, [decisions, totalCandidates]);

  /**
   * Get count of accepted candidates (accepted + edited)
   */
  const getAcceptedCount = useCallback((): number => {
    const stats = getStats();
    return stats.accepted + stats.edited;
  }, [getStats]);

  /**
   * Reset all decisions
   */
  const reset = useCallback(() => {
    setDecisions(new Map());
  }, []);

  return {
    decisions,
    accept,
    reject,
    edit,
    cancelEdit,
    getDecision,
    getState,
    getStats,
    getAcceptedCount,
    reset,
  };
}
