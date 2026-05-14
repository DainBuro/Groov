import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllDanceMoves, createDanceMove } from "../../api/danceMoveApi";
import {
  addFavoriteMove,
  getFavoriteMoveIds,
  removeFavoriteMove,
} from "../../api/favoriteApi";
import {
  DanceMove,
  DifficultyEnum,
  KeyPositionEnum,
  SubmissionStatusEnum,
} from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import { formatPosition } from "../../utils/format";
import styles from "./DanceMoves.module.scss";

export const DanceMovesList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [moves, setMoves] = useState<DanceMove[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hideVariations, setHideVariations] = useState(true);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [newMoveName, setNewMoveName] = useState("");
  const [newMoveDescription, setNewMoveDescription] = useState("");
  const [newMoveDifficulty, setNewMoveDifficulty] = useState<DifficultyEnum>(
    DifficultyEnum.Easy,
  );
  const [newMoveStartPosition, setNewMoveStartPosition] =
    useState<KeyPositionEnum>(KeyPositionEnum.Any);
  const [newMoveEndPosition, setNewMoveEndPosition] = useState<KeyPositionEnum>(
    KeyPositionEnum.Any,
  );
  const [newMoveParentId, setNewMoveParentId] = useState<string>("");
  const [newMoveYoutubeUrl, setNewMoveYoutubeUrl] = useState("");

  const loadMoves = async () => {
    try {
      const data = await getAllDanceMoves(searchTerm || undefined);
      setMoves(data);
    } catch (err: any) {
      setError("Failed to load dance moves");
    }
  };

  useEffect(() => {
    const fetchMoves = async () => {
      try {
        await loadMoves();
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoves();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      loadMoves();
    }
  }, [searchTerm]);

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

  const toggleFavorite = async (e: React.MouseEvent, moveId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const wasFavorite = favoriteIds.has(moveId);
    const next = new Set(favoriteIds);
    if (wasFavorite) {
      next.delete(moveId);
    } else {
      next.add(moveId);
    }
    setFavoriteIds(next);
    try {
      if (wasFavorite) {
        await removeFavoriteMove(moveId);
      } else {
        await addFavoriteMove(moveId);
      }
    } catch {
      setFavoriteIds(favoriteIds);
    }
  };

  const handleCreateMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMoveName.trim()) return;

    try {
      const newMove = await createDanceMove({
        name: newMoveName,
        description: newMoveDescription || undefined,
        difficulty: newMoveDifficulty,
        start_position: newMoveStartPosition,
        end_position: newMoveEndPosition,
        parent_move_id: newMoveParentId ? Number(newMoveParentId) : undefined,
        youtube_url: newMoveYoutubeUrl.trim() || null,
      });
      if (!isAdmin) {
        alert(
          "Your move has been submitted and is awaiting admin approval. You'll find it in 'My Submissions'.",
        );
      }
      navigate(`/moves/${newMove.id}`);
    } catch (err: any) {
      alert("Failed to create dance move");
    }
  };

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;

  const renderStatusBadge = (move: DanceMove) => {
    if (
      !move.submission_status ||
      move.submission_status === SubmissionStatusEnum.Approved
    ) {
      return null;
    }
    const label =
      move.submission_status === SubmissionStatusEnum.Pending
        ? "Pending review"
        : "Rejected";
    const cls =
      move.submission_status === SubmissionStatusEnum.Pending
        ? styles.statusPending
        : styles.statusRejected;
    return <span className={`${styles.statusBadge} ${cls}`}>{label}</span>;
  };

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1>Dance Moves</h1>
          <p className="text-muted">
            Explore our library of Lindy Hop dance moves
          </p>
        </div>
        <div className={styles.headerActions}>
          {isAuthenticated && !isAdmin && (
            <Link to="/moves/mine">
              <Button variant="outline">My Submissions</Button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/moves/pending">
              <Button variant="outline">Pending Submissions</Button>
            </Link>
          )}
          {isAuthenticated && (
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm
                ? "Cancel"
                : isAdmin
                  ? "Create Move"
                  : "Submit Move"}
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search moves..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
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

      {showCreateForm && (
        <div className={styles.createForm}>
          <h3>
            {isAdmin ? "Create New Dance Move" : "Submit a New Dance Move"}
          </h3>
          {!isAdmin && (
            <p className={styles.hint}>
              Submissions are reviewed by an admin before they become visible to
              everyone else.
            </p>
          )}
          <form onSubmit={handleCreateMove}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Move Name *</label>
              <input
                id="name"
                type="text"
                value={newMoveName}
                onChange={(e) => setNewMoveName(e.target.value)}
                required
                placeholder="Enter move name"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={newMoveDescription}
                onChange={(e) => setNewMoveDescription(e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="difficulty">Difficulty *</label>
              <select
                id="difficulty"
                value={newMoveDifficulty}
                onChange={(e) =>
                  setNewMoveDifficulty(e.target.value as DifficultyEnum)
                }
                required
              >
                <option value={DifficultyEnum.Easy}>Easy</option>
                <option value={DifficultyEnum.Medium}>Medium</option>
                <option value={DifficultyEnum.Hard}>Hard</option>
                <option value={DifficultyEnum.VeryHard}>Very Hard</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="startPosition">Start Position *</label>
              <select
                id="startPosition"
                value={newMoveStartPosition}
                onChange={(e) =>
                  setNewMoveStartPosition(e.target.value as KeyPositionEnum)
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
                value={newMoveEndPosition}
                onChange={(e) =>
                  setNewMoveEndPosition(e.target.value as KeyPositionEnum)
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
              <label htmlFor="parentMove">Parent Move</label>
              <select
                id="parentMove"
                value={newMoveParentId}
                onChange={(e) => setNewMoveParentId(e.target.value)}
              >
                <option value="">None</option>
                {moves.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="youtubeUrl">YouTube Video URL</label>
              <input
                id="youtubeUrl"
                type="url"
                value={newMoveYoutubeUrl}
                onChange={(e) => setNewMoveYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div className={styles.formActions}>
              <Button type="submit" variant="primary">
                {isAdmin ? "Create" : "Submit for review"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.grid}>
        {moves
          .filter((m) => !hideVariations || m.parent_move_id == null)
          .filter((m) => !onlyFavorites || favoriteIds.has(m.id))
          .map((move) => {
            const isOwnSubmission =
              move.created_by != null && user?.id === move.created_by;
            const isFavorite = favoriteIds.has(move.id);
            return (
              <Link
                to={`/moves/${move.id}`}
                key={move.id}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <h3>{move.name}</h3>
                  <div className={styles.cardHeaderActions}>
                    {isOwnSubmission && renderStatusBadge(move)}
                    {isAuthenticated && (
                      <button
                        type="button"
                        className={`${styles.favoriteButton} ${
                          isFavorite ? styles.favoriteButtonActive : ""
                        }`}
                        onClick={(e) => toggleFavorite(e, move.id)}
                        aria-label={
                          isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        aria-pressed={isFavorite}
                      >
                        {isFavorite ? "★" : "☆"}
                      </button>
                    )}
                  </div>
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
              </Link>
            );
          })}
      </div>
    </div>
  );
};
