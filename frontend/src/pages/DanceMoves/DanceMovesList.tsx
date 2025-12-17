import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllDanceMoves, createDanceMove } from "../../api/danceMoveApi";
import { DanceMove, DifficultyEnum, KeyPositionEnum } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import styles from "./DanceMoves.module.scss";

export const DanceMovesList: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [moves, setMoves] = useState<DanceMove[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMoveName, setNewMoveName] = useState("");
  const [newMoveDescription, setNewMoveDescription] = useState("");
  const [newMoveDifficulty, setNewMoveDifficulty] = useState<DifficultyEnum>(
    DifficultyEnum.Easy
  );
  const [newMoveStartPosition, setNewMoveStartPosition] =
    useState<KeyPositionEnum>(KeyPositionEnum.Closed);
  const [newMoveEndPosition, setNewMoveEndPosition] = useState<KeyPositionEnum>(
    KeyPositionEnum.Closed
  );

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
      });
      navigate(`/moves/${newMove.id}`);
    } catch (err: any) {
      alert("Failed to create dance move");
    }
  };

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1>Dance Moves</h1>
          <p className="text-muted">
            Explore our library of Lindy Hop dance moves
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? "Cancel" : "Create Move"}
          </Button>
        )}
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
      </div>

      {showCreateForm && (
        <div className={styles.createForm}>
          <h3>Create New Dance Move</h3>
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
                <option value={KeyPositionEnum.Closed}>Closed</option>
                <option value={KeyPositionEnum.OpenLeftToRight}>
                  Open Left to Right
                </option>
                <option value={KeyPositionEnum.OpenRightToRight}>
                  Open Right to Right
                </option>
                <option value={KeyPositionEnum.OpenLeftToLeft}>
                  Open Left to Left
                </option>
                <option value={KeyPositionEnum.OpenRightToLeft}>
                  Open Right to Left
                </option>
                <option value={KeyPositionEnum.Sweethearts}>Sweethearts</option>
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
                <option value={KeyPositionEnum.Closed}>Closed</option>
                <option value={KeyPositionEnum.OpenLeftToRight}>
                  Open Left to Right
                </option>
                <option value={KeyPositionEnum.OpenRightToRight}>
                  Open Right to Right
                </option>
                <option value={KeyPositionEnum.OpenLeftToLeft}>
                  Open Left to Left
                </option>
                <option value={KeyPositionEnum.OpenRightToLeft}>
                  Open Right to Left
                </option>
                <option value={KeyPositionEnum.Sweethearts}>Sweethearts</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <Button type="submit" variant="primary">
                Create
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
        {moves.map((move) => (
          <Link to={`/moves/${move.id}`} key={move.id} className={styles.card}>
            <h3>{move.name}</h3>
            <p className="text-muted">
              {move.description || "No description available"}
            </p>
            <div className={styles.meta}>
              <span className={styles.badge}>{move.difficulty}</span>
              <span>
                {move.start_position} → {move.end_position}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
