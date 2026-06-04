import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  approveDanceMove,
  getAllDanceMoves,
  getPendingDanceMoves,
  rejectDanceMove,
} from "../../api/danceMoveApi";
import { DanceMove } from "../../types";
import { Button } from "../../components/common/Button";
import { formatPosition } from "../../utils/format";
import styles from "./DanceMoves.module.scss";

export const PendingSubmissions: React.FC = () => {
  const [moves, setMoves] = useState<DanceMove[]>([]);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMoves = async () => {
    try {
      // Pending submissions plus the already-approved moves, so we can flag
      // submissions whose name collides (case-insensitively) with one that
      // already exists.
      const [pending, approved] = await Promise.all([
        getPendingDanceMoves(),
        getAllDanceMoves(),
      ]);
      setMoves(pending);
      setExistingNames(
        new Set(approved.map((m) => m.name.trim().toLowerCase())),
      );
      setError("");
    } catch {
      setError("Failed to load pending submissions");
    }
  };

  useEffect(() => {
    const run = async () => {
      await loadMoves();
      setIsLoading(false);
    };
    run();
  }, []);

  const handleApprove = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await approveDanceMove(id);
      setMoves((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert("Failed to approve dance move.");
    }
  };

  const handleReject = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const reason = window.prompt(
      "Optional: why is this submission being rejected? (the submitter will see this)",
      "",
    );
    if (reason === null) return;
    try {
      await rejectDanceMove(id, reason.trim() || undefined);
      setMoves((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert("Failed to reject dance move.");
    }
  };

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1>Pending Submissions</h1>
          <p className="text-muted">
            Moves submitted by users waiting for review.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/moves">
            <Button variant="outline">Back to Moves</Button>
          </Link>
        </div>
      </div>

      {moves.length === 0 ? (
        <p className="text-muted">Nothing to review right now.</p>
      ) : (
        <div className={styles.grid}>
          {moves.map((move) => {
            const isDuplicate = existingNames.has(
              move.name.trim().toLowerCase(),
            );
            return (
              <Link
                to={`/moves/${move.id}`}
                key={move.id}
                className={`${styles.pendingCard} ${
                  isDuplicate ? styles.pendingCardFlagged : ""
                }`}
              >
                <div className={styles.pendingBody}>
                  <div className={styles.pendingHeader}>
                    <h3>{move.name}</h3>
                    <span
                      className={`${styles.statusBadge} ${styles.statusPending}`}
                    >
                      Pending
                    </span>
                  </div>

                  {isDuplicate && (
                    <span className={styles.pendingDupe}>
                      A move named “{move.name}” already exists
                    </span>
                  )}

                  {move.description && (
                    <p className={styles.pendingDesc}>{move.description}</p>
                  )}

                  <div className={styles.pendingMeta}>
                    <span className={styles.badge}>{move.difficulty}</span>
                    <span className={styles.pendingPositions}>
                      {formatPosition(move.start_position)} →{" "}
                      {formatPosition(move.end_position)}
                    </span>
                  </div>

                  {move.creator_username && (
                    <div className={styles.pendingSubmitter}>
                      <span>
                        Submitted by <strong>{move.creator_username}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.pendingActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={(e) => handleApprove(e, move.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={(e) => handleReject(e, move.id)}
                  >
                    Reject
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
