import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getDanceMoveById,
  updateDanceMove,
  deleteDanceMove,
  getAllDanceMoves,
  getChildMoves,
  approveDanceMove,
  rejectDanceMove,
} from "../../api/danceMoveApi";
import { getAllSequences, getSequenceMoves } from "../../api/sequenceApi";
import { getAllEvents } from "../../api/eventApi";
import {
  addFavoriteMove,
  getFavoriteMoveIds,
  removeFavoriteMove,
} from "../../api/favoriteApi";
import {
  DanceMove,
  DanceSequence,
  Event,
  DifficultyEnum,
  KeyPositionEnum,
  PoseStatusEnum,
  SubmissionStatusEnum,
} from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import { MotionViewer } from "../../components/PoseViewer/MotionViewer";
import { PoseUpload } from "../../components/PoseUpload/PoseUpload";
import { formatPosition } from "../../utils/format";
import styles from "./DanceMoves.module.scss";
import { faCalendar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ConfirmModal from "../../components/common/ConfirmModal";

interface SequenceWithEvent extends DanceSequence {
  event?: Event | null;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

function extractStartTime(url: string): number | null {
  const match = url.match(/[?&](?:t|start)=([^&]+)/);
  if (!match) return null;
  const raw = match[1];
  if (/^\d+s?$/.test(raw)) return parseInt(raw, 10);
  const hoursMatch = raw.match(/(\d+)h/);
  const minutesMatch = raw.match(/(\d+)m/);
  const secondsMatch = raw.match(/(\d+)s/);
  if (hoursMatch || minutesMatch || secondsMatch) {
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

export const DanceMoveDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, user } = useAuth();

  const [move, setMove] = useState<DanceMove | null>(null);
  const [parentMove, setParentMove] = useState<DanceMove | null>(null);
  const [childMoves, setChildMoves] = useState<DanceMove[]>([]);
  const [allMoves, setAllMoves] = useState<DanceMove[]>([]);
  const [relatedSequences, setRelatedSequences] = useState<SequenceWithEvent[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [openDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDifficulty, setEditDifficulty] = useState<DifficultyEnum>(
    DifficultyEnum.Easy,
  );
  const [editStartPosition, setEditStartPosition] = useState<KeyPositionEnum>(
    KeyPositionEnum.Any,
  );
  const [editEndPosition, setEditEndPosition] = useState<KeyPositionEnum>(
    KeyPositionEnum.Any,
  );
  const [editParentMoveId, setEditParentMoveId] = useState<number | undefined>(
    undefined,
  );
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");

  useEffect(() => {
    const fetchMoveData = async () => {
      if (!id) return;

      setIsLoading(true);
      setMove(null);
      setParentMove(null);
      setChildMoves([]);
      setRelatedSequences([]);

      try {
        const moveData = await getDanceMoveById(parseInt(id));
        setMove(moveData);

        if (moveData.parent_move_id) {
          const parentData = await getDanceMoveById(moveData.parent_move_id);
          setParentMove(parentData);
        } else {
          setParentMove(null);
        }

        const children = await getChildMoves(moveData.id);
        setChildMoves(children);

        const allMovesData = await getAllDanceMoves();
        setAllMoves(allMovesData);

        const allSequences = await getAllSequences();
        const sequencesWithMoves = await Promise.all(
          allSequences.map(async (seq) => {
            const moves = await getSequenceMoves(seq.id);
            return {
              sequence: seq,
              hasMove: moves.some((m) => m.move_id === parseInt(id)),
            };
          }),
        );

        const filteredSequences = sequencesWithMoves
          .filter((item) => item.hasMove)
          .map((item) => item.sequence);

        const events = await getAllEvents();
        const sequencesWithEvents: SequenceWithEvent[] = filteredSequences.map(
          (seq) => ({
            ...seq,
            event: seq.event_id
              ? events.find((e) => e.id === seq.event_id) || null
              : null,
          }),
        );

        setRelatedSequences(sequencesWithEvents);
      } catch (err: any) {
        setError("Failed to load dance move details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoveData();
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !id) {
      setIsFavorite(false);
      return;
    }
    const moveId = parseInt(id);
    getFavoriteMoveIds()
      .then((ids) => setIsFavorite(ids.includes(moveId)))
      .catch(() => setIsFavorite(false));
  }, [isAuthenticated, id]);

  const handleToggleFavorite = async () => {
    if (!move) return;
    const wasFavorite = isFavorite;
    setIsFavorite(!wasFavorite);
    try {
      if (wasFavorite) {
        await removeFavoriteMove(move.id);
      } else {
        await addFavoriteMove(move.id);
      }
    } catch {
      setIsFavorite(wasFavorite);
    }
  };

  useEffect(() => {
    if (
      !move ||
      (move.pose_status !== PoseStatusEnum.Processing &&
        move.pose_status !== PoseStatusEnum.Queued)
    )
      return;

    const interval = setInterval(async () => {
      try {
        const updated = await getDanceMoveById(move.id);
        setMove(updated);
        if (
          updated.pose_status !== PoseStatusEnum.Processing &&
          updated.pose_status !== PoseStatusEnum.Queued
        ) {
          clearInterval(interval);
        }
      } catch {
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [move?.id, move?.pose_status]);

  const handleEditToggle = () => {
    if (!isEditMode && move) {
      setEditName(move.name);
      setEditDescription(move.description || "");
      setEditDifficulty(move.difficulty);
      setEditStartPosition(move.start_position);
      setEditEndPosition(move.end_position);
      setEditParentMoveId(move.parent_move_id || undefined);
      setEditYoutubeUrl(move.youtube_url || "");
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveEdit = async () => {
    if (!move) return;

    try {
      const updatedMove = await updateDanceMove(move.id, {
        name: editName,
        description: editDescription || undefined,
        difficulty: editDifficulty,
        start_position: editStartPosition,
        end_position: editEndPosition,
        parent_move_id: editParentMoveId,
        youtube_url: editYoutubeUrl.trim() || null,
      });

      setMove(updatedMove);
      setIsEditMode(false);

      if (updatedMove.parent_move_id) {
        const parentData = await getDanceMoveById(updatedMove.parent_move_id);
        setParentMove(parentData);
      } else {
        setParentMove(null);
      }
    } catch (err: any) {
      alert("Failed to update dance move");
    }
  };

  const handleDelete = async () => {
    if (!move) {
      return;
    }

    try {
      await deleteDanceMove(move.id);
      navigate("/moves");
    } catch (err: any) {
      alert("Failed to delete dance move. There may be sequences using it.");
    }
  };

  const handleApprove = async () => {
    if (!move) return;
    try {
      const updated = await approveDanceMove(move.id);
      setMove(updated);
    } catch {
      alert("Failed to approve dance move.");
    }
  };

  const handleReject = async () => {
    if (!move) return;
    const reason = window.prompt(
      "Optional: why is this submission being rejected? (the submitter will see this)",
      move.rejection_reason || "",
    );
    if (reason === null) return;
    try {
      const updated = await rejectDanceMove(
        move.id,
        reason.trim() || undefined,
      );
      setMove(updated);
    } catch {
      alert("Failed to reject dance move.");
    }
  };

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;
  if (!move) return <div className="container">Dance move not found</div>;

  const status = move.submission_status || SubmissionStatusEnum.Approved;
  const isOwner = user != null && move.created_by === user.id;
  const canEdit =
    isAdmin || (isOwner && status !== SubmissionStatusEnum.Approved);
  const canDelete = canEdit;
  const showPendingBanner =
    status === SubmissionStatusEnum.Pending && (isAdmin || isOwner);
  const showRejectedBanner =
    status === SubmissionStatusEnum.Rejected && (isAdmin || isOwner);

  return (
    <div className="container">
      <ConfirmModal
        isOpen={openDeleteModal}
        onConfirm={handleDelete}
        onClose={() => setIsOpenDeleteModal(false)}
        title="Delete move"
        message={`Are you sure you want to delete move "${move?.name}"? This action cannot be undone.`}
      />
      <div className={styles.detailContainer}>
        {showPendingBanner && (
          <div className={`${styles.statusBanner} ${styles.pending}`}>
            <h4>Pending admin approval</h4>
            <p>
              {isAdmin
                ? "This move is waiting for review. Approve it to publish, or reject it with feedback."
                : "Your submission is waiting for an admin to review it. Only you and admins can see it until it's approved."}
            </p>
            {isAdmin && !isEditMode && (
              <div className={styles.moderationActions}>
                <Button variant="primary" onClick={handleApprove}>
                  Approve
                </Button>
                <Button variant="danger" onClick={handleReject}>
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}

        {showRejectedBanner && (
          <div className={`${styles.statusBanner} ${styles.rejected}`}>
            <h4>Submission rejected</h4>
            {move.rejection_reason ? (
              <p>
                <strong>Reason:</strong> {move.rejection_reason}
              </p>
            ) : (
              <p>No reason was provided.</p>
            )}
            {isOwner && !isAdmin && (
              <p>
                Edit the move and resubmit — it will go back into the review
                queue.
              </p>
            )}
            {isAdmin && !isEditMode && (
              <div className={styles.moderationActions}>
                <Button variant="primary" onClick={handleApprove}>
                  Approve anyway
                </Button>
              </div>
            )}
          </div>
        )}

        <div className={styles.detailHeader}>
          <div>
            <h1>{move.name}</h1>
            {isAuthenticated && (
              <button
                type="button"
                className={`${styles.favoriteButton} ${styles.favoriteButtonInline} ${
                  isFavorite ? styles.favoriteButtonActive : ""
                }`}
                onClick={handleToggleFavorite}
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                aria-pressed={isFavorite}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            )}
            <span className={styles.badge}>{move.difficulty}</span>
          </div>

          {!isEditMode && (canEdit || canDelete) && (
            <div className={styles.actions}>
              {canEdit && (
                <Button variant="primary" onClick={handleEditToggle}>
                  Edit Move
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="danger"
                  onClick={() => setIsOpenDeleteModal(true)}
                >
                  Delete Move
                </Button>
              )}
            </div>
          )}
        </div>

        {(move.pose_data || move.youtube_url) && !isEditMode && (
          <div className={styles.infoSection}>
            <MotionViewer
              poseData={move.pose_data || null}
              youtubeUrl={move.youtube_url || null}
            />
          </div>
        )}

        {isEditMode ? (
          <div className={styles.editMode}>
            <h3>Edit Dance Move</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
            >
              <div className={styles.formGroup}>
                <label htmlFor="name">Move Name *</label>
                <input
                  id="name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="difficulty">Difficulty *</label>
                <select
                  id="difficulty"
                  value={editDifficulty}
                  onChange={(e) =>
                    setEditDifficulty(e.target.value as DifficultyEnum)
                  }
                  required
                >
                  {Object.values(DifficultyEnum).map((diff) => (
                    <option key={diff} value={diff}>
                      {diff}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="startPosition">Start Position *</label>
                <select
                  id="startPosition"
                  value={editStartPosition}
                  onChange={(e) =>
                    setEditStartPosition(e.target.value as KeyPositionEnum)
                  }
                  required
                >
                  {Object.values(KeyPositionEnum).map((pos) => (
                    <option key={pos} value={pos}>
                      {formatPosition(pos)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="endPosition">End Position *</label>
                <select
                  id="endPosition"
                  value={editEndPosition}
                  onChange={(e) =>
                    setEditEndPosition(e.target.value as KeyPositionEnum)
                  }
                  required
                >
                  {Object.values(KeyPositionEnum).map((pos) => (
                    <option key={pos} value={pos}>
                      {formatPosition(pos)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="parentMove">Parent Move (Optional)</label>
                <select
                  id="parentMove"
                  value={editParentMoveId || ""}
                  onChange={(e) =>
                    setEditParentMoveId(
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                >
                  <option value="">None</option>
                  {allMoves
                    .filter((m) => m.id !== move.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="youtubeUrl">YouTube Video URL (Optional)</label>
                <input
                  id="youtubeUrl"
                  type="url"
                  value={editYoutubeUrl}
                  onChange={(e) => setEditYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              {isAdmin && (
                <PoseUpload
                  moveId={move.id}
                  currentFileName={move.pose_file_name || null}
                  poseStatus={move.pose_status || null}
                  poseError={move.pose_error || null}
                  onUploadComplete={(updated) => setMove(updated)}
                />
              )}

              <div className={styles.formActions}>
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditToggle}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className={styles.detailInfo}>
            {move.description && (
              <div className={styles.infoSection}>
                <h3>Description</h3>
                <p>{move.description}</p>
              </div>
            )}

            <div className={styles.infoSection}>
              <h3>Position Flow</h3>
              <p className={styles.positionFlow}>
                <span className={styles.position}>
                  {formatPosition(move.start_position)}
                </span>
                <span className={styles.arrow}>→</span>
                <span className={styles.position}>
                  {formatPosition(move.end_position)}
                </span>
              </p>
            </div>

            {parentMove && (
              <div className={styles.infoSection}>
                <h3>Parent Move</h3>
                <Link
                  to={`/moves/${parentMove.id}`}
                  className={styles.parentLink}
                >
                  {parentMove.name}
                </Link>
              </div>
            )}
          </div>
        )}

        {childMoves.length > 0 && !isEditMode && (
          <div className={styles.variationsSection}>
            <h2>Variations</h2>
            <div className={styles.variationsRow}>
              {childMoves.map((child) => {
                const videoId = child.youtube_url
                  ? extractYouTubeId(child.youtube_url)
                  : null;
                const startTime = child.youtube_url
                  ? extractStartTime(child.youtube_url)
                  : null;
                const embedSrc = videoId
                  ? `https://www.youtube.com/embed/${videoId}${startTime ? `?start=${startTime}` : ""}`
                  : "";
                return (
                  <Link
                    to={`/moves/${child.id}`}
                    key={child.id}
                    className={styles.variationCard}
                  >
                    <h3>{child.name}</h3>
                    <p className={styles.variationFlow}>
                      <span className={styles.position}>
                        {formatPosition(child.start_position)}
                      </span>
                      <span className={styles.arrow}>→</span>
                      <span className={styles.position}>
                        {formatPosition(child.end_position)}
                      </span>
                    </p>
                    {videoId && (
                      <div className={styles.variationVideo}>
                        <iframe
                          src={embedSrc}
                          title={child.name}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {relatedSequences.length > 0 && (
          <div className={styles.relatedSection}>
            <h2>Sequences Using This Move</h2>
            <div className={styles.grid}>
              {relatedSequences.map((sequence) => (
                <Link
                  to={`/sequences/${sequence.id}`}
                  key={sequence.id}
                  className={styles.card}
                >
                  <h3>{sequence.name}</h3>
                  {sequence.description && (
                    <p className={`text-muted ${styles.cardDescription}`}>
                      {sequence.description}
                    </p>
                  )}
                  {sequence.event && (
                    <div className={styles.meta}>
                      <span className={styles.icon}>
                        <FontAwesomeIcon icon={faCalendar} />
                      </span>
                      <Link
                        to={`/events/${sequence.event.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.eventLink}
                      >
                        {sequence.event.name}
                      </Link>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
