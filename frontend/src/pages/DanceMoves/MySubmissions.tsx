import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyDanceMoves } from "../../api/danceMoveApi";
import { DanceMove, SubmissionStatusEnum } from "../../types";
import { Button } from "../../components/common/Button";
import { formatPosition } from "../../utils/format";
import styles from "./DanceMoves.module.scss";

const statusLabel: Record<SubmissionStatusEnum, string> = {
  [SubmissionStatusEnum.Pending]: "Pending review",
  [SubmissionStatusEnum.Approved]: "Approved",
  [SubmissionStatusEnum.Rejected]: "Rejected",
};

const statusClassName: Record<SubmissionStatusEnum, string> = {
  [SubmissionStatusEnum.Pending]: styles.statusPending,
  [SubmissionStatusEnum.Approved]: styles.statusApproved,
  [SubmissionStatusEnum.Rejected]: styles.statusRejected,
};

export const MySubmissions: React.FC = () => {
  const [moves, setMoves] = useState<DanceMove[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getMyDanceMoves();
        setMoves(data);
      } catch {
        setError("Failed to load your submissions");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, []);

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1>My Submissions</h1>
          <p className="text-muted">
            Dance moves you've submitted and their current approval status.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/moves">
            <Button variant="outline">Back to Moves</Button>
          </Link>
        </div>
      </div>

      {moves.length === 0 ? (
        <p className="text-muted">You haven't submitted any moves yet.</p>
      ) : (
        <div className={styles.grid}>
          {moves.map((move) => {
            const status = move.submission_status || SubmissionStatusEnum.Approved;
            return (
              <Link
                to={`/moves/${move.id}`}
                key={move.id}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <h3>{move.name}</h3>
                  <span
                    className={`${styles.statusBadge} ${statusClassName[status]}`}
                  >
                    {statusLabel[status]}
                  </span>
                </div>
                {move.description && (
                  <p className={`text-muted ${styles.cardDescription}`}>
                    {move.description}
                  </p>
                )}
                <div className={styles.meta}>
                  <span className={styles.badge}>{move.difficulty}</span>
                  <span>
                    {formatPosition(move.start_position)} →{" "}
                    {formatPosition(move.end_position)}
                  </span>
                </div>
                {status === SubmissionStatusEnum.Rejected && move.rejection_reason && (
                  <p className="text-muted" style={{ marginTop: 8 }}>
                    <strong>Reason:</strong> {move.rejection_reason}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
