import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getSequenceById,
  getSequenceMoves,
  replaceSequenceMoves,
  deleteSequence,
} from "../../api/sequenceApi";
import { getEventById } from "../../api/eventApi";
import { getAllDanceMoves } from "../../api/danceMoveApi";
import { DanceSequence, Event, MoveOfSequence, DanceMove } from "../../types";
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

export const SequenceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [sequence, setSequence] = useState<DanceSequence | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [sequenceMoves, setSequenceMoves] = useState<MoveOfSequence[]>([]);
  const [allMoves, setAllMoves] = useState<DanceMove[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMoveIds, setSelectedMoveIds] = useState<number[]>([]);
  const [moveSearchTerm, setMoveSearchTerm] = useState("");
  const [openDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

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
      } catch (err: any) {
        setError("Failed to load sequence details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSequenceData();
  }, [id]);

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
    if (!isEditMode) {
      setSelectedMoveIds(sequenceMoves.map((sm) => sm.move_id));
    }
    setIsEditMode(!isEditMode);
  };

  const handleMoveToggle = (moveId: number) => {
    // Duplicates are allowed on purpose - a sequence can repeat a move.
    setSelectedMoveIds((prev) => [...prev, moveId]);
  };

  const handleSaveSequence = async () => {
    if (!sequence) return;

    try {
      await replaceSequenceMoves(sequence.id, selectedMoveIds);

      const movesData = await getSequenceMoves(sequence.id);
      setSequenceMoves(movesData);
      setIsEditMode(false);
      setMoveSearchTerm("");
    } catch (err: any) {
      alert("Failed to update sequence moves");
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

  const filteredMoves = allMoves.filter((move) =>
    move.name.toLowerCase().includes(moveSearchTerm.toLowerCase())
  );

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
                {isEditMode ? "Cancel Edit" : "Edit Moves"}
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

        {isEditMode && (
          <div className={styles.editMode}>
            <h3>Edit Sequence Moves</h3>
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
                        ? allMoves.find((m) => m.id === selectedMoveIds[index - 1])
                        : null;
                    const mismatch =
                      prevMove && prevMove.end_position !== move.start_position;
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
                {isOwner && (
                  <p className="text-muted">
                    Click "Edit Moves" to add moves to your sequence.
                  </p>
                )}
              </div>
            ) : (
              <ul className={styles.movesList}>
                {sequenceMoves.map((seqMove, index) => {
                  const move = allMoves.find((m) => m.id === seqMove.move_id);
                  const prevMove =
                    index > 0
                      ? allMoves.find(
                          (m) => m.id === sequenceMoves[index - 1].move_id
                        )
                      : null;
                  const mismatch =
                    move &&
                    prevMove &&
                    prevMove.end_position !== move.start_position;
                  return (
                    <li key={seqMove.id} className={styles.moveItem}>
                      <Link
                        to={`/moves/${seqMove.move_id}`}
                        className={styles.moveLink}
                      >
                        <div className={styles.moveNumber}>{index + 1}</div>
                        <div className={styles.moveInfo}>
                          <h4>{seqMove.name || move?.name || "Unknown Move"}</h4>
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
            </div>
            <div className={styles.movesGrid}>
              {filteredMoves.map((move) => {
                const countInSequence = selectedMoveIds.filter(
                  (id) => id === move.id
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
