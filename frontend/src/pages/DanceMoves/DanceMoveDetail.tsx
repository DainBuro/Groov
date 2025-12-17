import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getDanceMoveById, updateDanceMove, deleteDanceMove, getAllDanceMoves } from '../../api/danceMoveApi';
import { getAllSequences, getSequenceMoves } from '../../api/sequenceApi';
import { getAllEvents } from '../../api/eventApi';
import { DanceMove, DanceSequence, Event, DifficultyEnum, KeyPositionEnum } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import styles from './DanceMoves.module.scss';

interface SequenceWithEvent extends DanceSequence {
  event?: Event | null;
}

export const DanceMoveDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [move, setMove] = useState<DanceMove | null>(null);
  const [parentMove, setParentMove] = useState<DanceMove | null>(null);
  const [allMoves, setAllMoves] = useState<DanceMove[]>([]);
  const [relatedSequences, setRelatedSequences] = useState<SequenceWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<DifficultyEnum>(DifficultyEnum.Easy);
  const [editStartPosition, setEditStartPosition] = useState<KeyPositionEnum>(KeyPositionEnum.Closed);
  const [editEndPosition, setEditEndPosition] = useState<KeyPositionEnum>(KeyPositionEnum.Closed);
  const [editParentMoveId, setEditParentMoveId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchMoveData = async () => {
      if (!id) return;

      try {
        const moveData = await getDanceMoveById(parseInt(id));
        setMove(moveData);

        // Fetch parent move if exists
        if (moveData.parent_move_id) {
          const parentData = await getDanceMoveById(moveData.parent_move_id);
          setParentMove(parentData);
        }

        // Fetch all moves for parent selection in edit mode
        const allMovesData = await getAllDanceMoves();
        setAllMoves(allMovesData);

        // Fetch all sequences and filter those containing this move
        const allSequences = await getAllSequences();
        const sequencesWithMoves = await Promise.all(
          allSequences.map(async (seq) => {
            const moves = await getSequenceMoves(seq.id);
            return {
              sequence: seq,
              hasMove: moves.some(m => m.move_id === parseInt(id))
            };
          })
        );

        const filteredSequences = sequencesWithMoves
          .filter(item => item.hasMove)
          .map(item => item.sequence);

        // Fetch events for sequences
        const events = await getAllEvents();
        const sequencesWithEvents: SequenceWithEvent[] = filteredSequences.map(seq => ({
          ...seq,
          event: seq.event_id ? events.find(e => e.id === seq.event_id) || null : null
        }));

        setRelatedSequences(sequencesWithEvents);
      } catch (err: any) {
        setError('Failed to load dance move details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoveData();
  }, [id]);

  const handleEditToggle = () => {
    if (!isEditMode && move) {
      // Entering edit mode - populate form fields
      setEditName(move.name);
      setEditDescription(move.description || '');
      setEditDifficulty(move.difficulty);
      setEditStartPosition(move.start_position);
      setEditEndPosition(move.end_position);
      setEditParentMoveId(move.parent_move_id || undefined);
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
      });

      setMove(updatedMove);
      setIsEditMode(false);

      // Refresh parent move if changed
      if (updatedMove.parent_move_id) {
        const parentData = await getDanceMoveById(updatedMove.parent_move_id);
        setParentMove(parentData);
      } else {
        setParentMove(null);
      }
    } catch (err: any) {
      alert('Failed to update dance move');
    }
  };

  const handleDelete = async () => {
    if (!move || !window.confirm(`Are you sure you want to delete "${move.name}"?`)) {
      return;
    }

    try {
      await deleteDanceMove(move.id);
      navigate('/moves');
    } catch (err: any) {
      alert('Failed to delete dance move. There may be sequences using it.');
    }
  };

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;
  if (!move) return <div className="container">Dance move not found</div>;

  return (
    <div className="container">
      <div className={styles.detailContainer}>
        <div className={styles.detailHeader}>
          <div>
            <h1>{move.name}</h1>
            <span className={styles.badge}>{move.difficulty}</span>
          </div>

          {isAdmin && !isEditMode && (
            <div className={styles.actions}>
              <Button variant="primary" onClick={handleEditToggle}>
                Edit Move
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete Move
              </Button>
            </div>
          )}
        </div>

        {isEditMode ? (
          <div className={styles.editMode}>
            <h3>Edit Dance Move</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
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
                  onChange={(e) => setEditDifficulty(e.target.value as DifficultyEnum)}
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
                  onChange={(e) => setEditStartPosition(e.target.value as KeyPositionEnum)}
                  required
                >
                  {Object.values(KeyPositionEnum).map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="endPosition">End Position *</label>
                <select
                  id="endPosition"
                  value={editEndPosition}
                  onChange={(e) => setEditEndPosition(e.target.value as KeyPositionEnum)}
                  required
                >
                  {Object.values(KeyPositionEnum).map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="parentMove">Parent Move (Optional)</label>
                <select
                  id="parentMove"
                  value={editParentMoveId || ''}
                  onChange={(e) => setEditParentMoveId(e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">None</option>
                  {allMoves
                    .filter(m => m.id !== move.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.formActions}>
                <Button type="submit" variant="primary">Save Changes</Button>
                <Button type="button" variant="outline" onClick={handleEditToggle}>
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
                <span className={styles.position}>{move.start_position}</span>
                <span className={styles.arrow}>→</span>
                <span className={styles.position}>{move.end_position}</span>
              </p>
            </div>

            {parentMove && (
              <div className={styles.infoSection}>
                <h3>Parent Move</h3>
                <Link to={`/moves/${parentMove.id}`} className={styles.parentLink}>
                  {parentMove.name}
                </Link>
              </div>
            )}
          </div>
        )}

        {relatedSequences.length > 0 && (
          <div className={styles.relatedSection}>
            <h2>Sequences Using This Move</h2>
            <div className={styles.grid}>
              {relatedSequences.map(sequence => (
                <Link
                  to={`/sequences/${sequence.id}`}
                  key={sequence.id}
                  className={styles.card}
                >
                  <h3>{sequence.name}</h3>
                  {sequence.description && (
                    <p className="text-muted">{sequence.description}</p>
                  )}
                  {sequence.event && (
                    <div className={styles.meta}>
                      <span className={styles.icon}>🎪</span>
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
