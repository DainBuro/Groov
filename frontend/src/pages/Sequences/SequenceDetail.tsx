import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getSequenceById,
  getSequenceMoves,
  replaceSequenceMoves,
  deleteSequence,
  updateSequence,
} from "../../api/sequenceApi";
import { getAllEvents, getEventById } from "../../api/eventApi";
import { getAllDanceMoves } from "../../api/danceMoveApi";
import { getFavoriteMoveIds } from "../../api/favoriteApi";
import {
  DanceSequence,
  Event,
  MoveOfSequence,
  DanceMove,
  KeyPositionEnum,
} from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import { formatPosition } from "../../utils/format";
import styles from "./Sequences.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faUser,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import ConfirmModal from "../../components/common/ConfirmModal";

// Two positions are compatible if they match, or if either side is "any".
const positionsMatch = (a: KeyPositionEnum, b: KeyPositionEnum): boolean =>
  a === b || a === KeyPositionEnum.Any || b === KeyPositionEnum.Any;

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

export const SequenceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [sequence, setSequence] = useState<DanceSequence | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [sequenceMoves, setSequenceMoves] = useState<MoveOfSequence[]>([]);
  const [allMoves, setAllMoves] = useState<DanceMove[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMoveIds, setSelectedMoveIds] = useState<number[]>([]);
  const [moveSearchTerm, setMoveSearchTerm] = useState("");
  const [showAllMoves, setShowAllMoves] = useState(false);
  const [hideVariations, setHideVariations] = useState(true);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [openDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Edit form state for sequence-level fields.
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEventId, setEditEventId] = useState<number | null>(null);
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");

  const isOwner =
    isAuthenticated && user && sequence && user.id === sequence.user_id;

  useEffect(() => {
    const fetchSequenceData = async () => {
      if (!id) return;

      try {
        const sequenceData = await getSequenceById(parseInt(id));
        setSequence(sequenceData);

        if (sequenceData.event_id) {
          const eventData = await getEventById(sequenceData.event_id);
          setEvent(eventData);
        }

        const movesData = await getSequenceMoves(parseInt(id));
        setSequenceMoves(movesData);

        const allMovesData = await getAllDanceMoves();
        setAllMoves(allMovesData);

        const eventsData = await getAllEvents();
        setAllEvents(eventsData);
      } catch (err: any) {
        setError("Failed to load sequence details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSequenceData();
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      setOnlyFavorites(false);
      return;
    }
    getFavoriteMoveIds()
      .then((ids) => setFavoriteIds(new Set(ids)))
      .catch(() => setFavoriteIds(new Set()));
  }, [isAuthenticated]);

  const handleDelete = async () => {
    if (!sequence) {
      return;
    }

    try {
      await deleteSequence(sequence.id);
      navigate("/sequences");
    } catch (err: any) {
      alert("Failed to delete sequence");
    }
  };

  const handleEditToggle = () => {
    if (!isEditMode && sequence) {
      setSelectedMoveIds(sequenceMoves.map((sm) => sm.move_id));
      setEditName(sequence.name);
      setEditDescription(sequence.description || "");
      setEditEventId(sequence.event_id);
      setEditYoutubeUrl(sequence.youtube_url || "");
    }
    setIsEditMode(!isEditMode);
  };

  const handleMoveToggle = (moveId: number) => {
    // Duplicates are allowed on purpose - a sequence can repeat a move.
    setSelectedMoveIds((prev) => [...prev, moveId]);
  };

  const handleSaveSequence = async () => {
    if (!sequence) return;
    if (!editName.trim()) {
      alert("Sequence name is required.");
      return;
    }

    try {
      const updated = await updateSequence(sequence.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        event_id: editEventId ?? undefined,
        youtube_url: editYoutubeUrl.trim() || null,
      });
      setSequence(updated);

      if (updated.event_id) {
        const eventData = await getEventById(updated.event_id);
        setEvent(eventData);
      } else {
        setEvent(null);
      }

      await replaceSequenceMoves(sequence.id, selectedMoveIds);
      const movesData = await getSequenceMoves(sequence.id);
      setSequenceMoves(movesData);

      setIsEditMode(false);
      setMoveSearchTerm("");
    } catch (err: any) {
      alert("Failed to update sequence");
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSelectedMoveIds = [...selectedMoveIds];
    [newSelectedMoveIds[index - 1], newSelectedMoveIds[index]] = [
      newSelectedMoveIds[index],
      newSelectedMoveIds[index - 1],
    ];
    setSelectedMoveIds(newSelectedMoveIds);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedMoveIds.length - 1) return;
    const newSelectedMoveIds = [...selectedMoveIds];
    [newSelectedMoveIds[index], newSelectedMoveIds[index + 1]] = [
      newSelectedMoveIds[index + 1],
      newSelectedMoveIds[index],
    ];
    setSelectedMoveIds(newSelectedMoveIds);
  };

  const handleRemoveMove = (index: number) => {
    setSelectedMoveIds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const next = before ? index : index + 1;
    if (dropIndex !== next) setDropIndex(next);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || dropIndex === null) {
      handleDragEnd();
      return;
    }
    let target = dropIndex;
    if (target > draggedIndex) target -= 1;
    if (target === draggedIndex) {
      handleDragEnd();
      return;
    }
    setSelectedMoveIds((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedIndex, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
    handleDragEnd();
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setSelectedMoveIds([]);
    setMoveSearchTerm("");
  };

  const lastSelectedMove =
    selectedMoveIds.length > 0
      ? allMoves.find(
          (m) => m.id === selectedMoveIds[selectedMoveIds.length - 1],
        )
      : null;

  const filteredMoves = allMoves
    .filter((move) =>
      move.name.toLowerCase().includes(moveSearchTerm.toLowerCase()),
    )
    .filter(
      (move) =>
        showAllMoves ||
        !lastSelectedMove ||
        positionsMatch(lastSelectedMove.end_position, move.start_position),
    )
    .filter((move) => !hideVariations || move.parent_move_id == null)
    .filter((move) => !onlyFavorites || favoriteIds.has(move.id));

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;
  if (!sequence) return <div className="container">Sequence not found</div>;

  return (
    <div className="container">
      <ConfirmModal
        isOpen={openDeleteModal}
        onConfirm={handleDelete}
        onClose={() => setIsOpenDeleteModal(false)}
        title="Delete sequence"
        message={`Are you sure you want to delete sequence "${sequence?.name}"? This action cannot be undone.`}
      />
      <div className={styles.detailContainer}>
        <div className={styles.detailHeader}>
          <h1>{sequence.name}</h1>

          {isOwner && (
            <div className={styles.actions}>
              <Button variant="primary" onClick={handleEditToggle}>
                {isEditMode ? "Cancel Edit" : "Edit"}
              </Button>
              <Button
                variant="danger"
                onClick={() => setIsOpenDeleteModal(true)}
              >
                Delete Sequence
              </Button>
            </div>
          )}
        </div>

        {!isEditMode && (
          <div className={styles.detailInfo}>
            {sequence.description && (
              <div className={styles.infoRow}>
                <p>{sequence.description}</p>
              </div>
            )}
            {sequence.creator_username && (
              <div className={styles.infoRow}>
                <span className={styles.icon}>
                  <FontAwesomeIcon icon={faUser} />
                </span>
                <span>Created by {sequence.creator_username}</span>
              </div>
            )}
            {event && (
              <div className={styles.infoRow}>
                <span className={styles.icon}>
                  <FontAwesomeIcon icon={faCalendar} />
                </span>
                <Link to={`/events/${event.id}`}>{event.name}</Link>
              </div>
            )}
          </div>
        )}

        {!isEditMode &&
          sequence.youtube_url &&
          (() => {
            const videoId = extractYouTubeId(sequence.youtube_url);
            if (!videoId) return null;
            const startTime = extractStartTime(sequence.youtube_url);
            const embedSrc = `https://www.youtube.com/embed/${videoId}${
              startTime ? `?start=${startTime}` : ""
            }`;
            return (
              <div className={styles.videoWrapper}>
                <iframe
                  src={embedSrc}
                  title={sequence.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            );
          })()}

        {isEditMode && (
          <div className={styles.editMode}>
            <h3>Edit Sequence</h3>

            <div className={styles.formGroup}>
              <label htmlFor="seqName">Sequence Name *</label>
              <input
                id="seqName"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="seqDescription">Description</label>
              <textarea
                id="seqDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="seqEvent">Event (optional)</label>
              <select
                id="seqEvent"
                value={editEventId ?? ""}
                onChange={(e) =>
                  setEditEventId(
                    e.target.value ? parseInt(e.target.value) : null,
                  )
                }
              >
                <option value="">No event</option>
                {allEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="seqYoutubeUrl">
                YouTube Video URL (optional)
              </label>
              <input
                id="seqYoutubeUrl"
                type="url"
                value={editYoutubeUrl}
                onChange={(e) => setEditYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <h3>Sequence Moves</h3>
            <p className="text-muted mb-4">
              Select moves below to add them to your sequence. Use the arrows to
              reorder.
            </p>

            {/* Selected moves with reordering */}
            {selectedMoveIds.length > 0 && (
              <div className={styles.selectedMoves}>
                <h4>Selected Moves (in order):</h4>
                <ul
                  className={styles.selectedMovesList}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {selectedMoveIds.map((moveId, index) => {
                    const move = allMoves.find((m) => m.id === moveId);
                    if (!move) return null;
                    const prevMove =
                      index > 0
                        ? allMoves.find(
                            (m) => m.id === selectedMoveIds[index - 1],
                          )
                        : null;
                    const mismatch =
                      prevMove &&
                      !positionsMatch(
                        prevMove.end_position,
                        move.start_position,
                      );
                    const showLineBefore = dropIndex === index;
                    const showLineAfter =
                      index === selectedMoveIds.length - 1 &&
                      dropIndex === selectedMoveIds.length;
                    return (
                      <React.Fragment key={`${moveId}-${index}`}>
                        {showLineBefore && <li className={styles.dropLine} />}
                        <li
                          className={`${styles.selectedMoveItem} ${
                            draggedIndex === index ? styles.dragging : ""
                          }`}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className={styles.moveNumber}>{index + 1}</div>
                          <div className={styles.moveInfo}>
                            <h5>{move.name}</h5>
                            <p className="text-muted">
                              {move.difficulty} |{" "}
                              {formatPosition(move.start_position)} →{" "}
                              {formatPosition(move.end_position)}
                            </p>
                            {mismatch && (
                              <p className={styles.positionWarning}>
                                <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
                                Position mismatch: previous move ends in{" "}
                                {formatPosition(prevMove!.end_position)}
                              </p>
                            )}
                          </div>
                          <div className={styles.moveControls}>
                            <button
                              type="button"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className={styles.controlButton}
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === selectedMoveIds.length - 1}
                              className={styles.controlButton}
                              title="Move down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMove(index)}
                              className={`${styles.controlButton} ${styles.removeButton}`}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                        {showLineAfter && <li className={styles.dropLine} />}
                      </React.Fragment>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className={styles.editActions}>
              <Button variant="primary" onClick={handleSaveSequence}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!isEditMode && (
          <div className={styles.movesSection}>
            <h2>Dance Moves in this Sequence</h2>
            {sequenceMoves.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No moves in this sequence yet.</p>
              </div>
            ) : (
              <ul className={styles.movesList}>
                {sequenceMoves.map((seqMove, index) => {
                  const move = allMoves.find((m) => m.id === seqMove.move_id);
                  const prevMove =
                    index > 0
                      ? allMoves.find(
                          (m) => m.id === sequenceMoves[index - 1].move_id,
                        )
                      : null;
                  const mismatch =
                    move &&
                    prevMove &&
                    !positionsMatch(prevMove.end_position, move.start_position);
                  return (
                    <li key={seqMove.id} className={styles.moveItem}>
                      <Link
                        to={`/moves/${seqMove.move_id}`}
                        className={styles.moveLink}
                      >
                        <div className={styles.moveNumber}>{index + 1}</div>
                        <div className={styles.moveInfo}>
                          <h4>
                            {seqMove.name || move?.name || "Unknown Move"}
                          </h4>
                          {move && (
                            <p>
                              {move.difficulty} |{" "}
                              {formatPosition(move.start_position)} →{" "}
                              {formatPosition(move.end_position)}
                            </p>
                          )}
                          {mismatch && (
                            <p className={styles.positionWarningSubtle}>
                              <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
                              Previous move ends in{" "}
                              {formatPosition(prevMove!.end_position)}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {isEditMode && (
          <div className={styles.availableMoves}>
            <h3>Available Moves</h3>
            <p className="text-muted mb-4">
              Click on moves to add them to your sequence. You can add the same
              move multiple times.
            </p>
            {/* Search for available moves */}
            <div className={styles.filters}>
              <input
                type="text"
                placeholder="Search available moves..."
                value={moveSearchTerm}
                onChange={(e) => setMoveSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <label className={styles.filterCheckbox}>
                <input
                  type="checkbox"
                  checked={showAllMoves}
                  onChange={(e) => setShowAllMoves(e.target.checked)}
                />
                Show all moves
              </label>
              <label className={styles.filterCheckbox}>
                <input
                  type="checkbox"
                  checked={hideVariations}
                  onChange={(e) => setHideVariations(e.target.checked)}
                />
                Hide variations
              </label>
              {isAuthenticated && (
                <label className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={onlyFavorites}
                    onChange={(e) => setOnlyFavorites(e.target.checked)}
                  />
                  Only favorites
                </label>
              )}
            </div>
            <div className={styles.movesGrid}>
              {filteredMoves.map((move) => {
                const countInSequence = selectedMoveIds.filter(
                  (id) => id === move.id,
                ).length;
                return (
                  <div
                    key={move.id}
                    className={styles.availableMoveCard}
                    onClick={() => handleMoveToggle(move.id)}
                  >
                    <h4>{move.name}</h4>
                    <p>
                      {move.difficulty} | {formatPosition(move.start_position)}{" "}
                      → {formatPosition(move.end_position)}
                    </p>
                    {countInSequence > 0 && (
                      <div className={styles.moveCount}>
                        Added {countInSequence}x
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
