import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAllSequences,
  getMySequences,
  createSequence,
} from "../../api/sequenceApi";
import { getAllEvents } from "../../api/eventApi";
import { DanceSequence, Event } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import styles from "./Sequences.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faUser } from "@fortawesome/free-solid-svg-icons";

export const SequencesList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sequences, setSequences] = useState<DanceSequence[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSequenceName, setNewSequenceName] = useState("");
  const [newSequenceDescription, setNewSequenceDescription] = useState("");
  const [newSequenceEventId, setNewSequenceEventId] = useState<number | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showMySequences, setShowMySequences] = useState(true);

  const loadSequences = async () => {
    try {
      let sequencesData: DanceSequence[];
      if (isAuthenticated && showMySequences) {
        sequencesData = await getMySequences(searchTerm || undefined);
      } else {
        sequencesData = await getAllSequences(searchTerm || undefined);
      }
      setSequences(sequencesData);
    } catch (err: any) {
      setError("Failed to load sequences");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsData = await getAllEvents();
        setEvents(eventsData);
        await loadSequences();
      } catch (err: any) {
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      loadSequences();
    }
  }, [searchTerm, showMySequences]);

  const getEventName = (eventId: number | null) => {
    if (!eventId) return null;
    const event = events.find((e) => e.id === eventId);
    return event?.name;
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSequenceName.trim()) return;

    try {
      const newSequence = await createSequence({
        name: newSequenceName,
        description: newSequenceDescription || undefined,
        event_id: newSequenceEventId || undefined,
      });
      navigate(`/sequences/${newSequence.id}`);
    } catch (err: any) {
      alert("Failed to create sequence");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1>Dance Sequences</h1>
          <p className="text-muted">
            {isAuthenticated && showMySequences
              ? "Your personal dance sequences"
              : "Explore choreographed dance sequences created by the community"}
          </p>
        </div>
        {isAuthenticated && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? "Cancel" : "Create Sequence"}
          </Button>
        )}
      </div>

      {/* Search and Toggle */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search sequences..."
          value={searchTerm}
          onChange={handleSearchChange}
          className={styles.searchInput}
        />
        {isAuthenticated && (
          <div className={styles.toggleContainer}>
            <button
              className={`${styles.toggleButton} ${
                showMySequences ? styles.active : ""
              }`}
              onClick={() => setShowMySequences(true)}
            >
              My Sequences
            </button>
            <button
              className={`${styles.toggleButton} ${
                !showMySequences ? styles.active : ""
              }`}
              onClick={() => setShowMySequences(false)}
            >
              All Sequences
            </button>
          </div>
        )}
      </div>

      {showCreateForm && (
        <div className={styles.createForm}>
          <h3>Create New Sequence</h3>
          <form onSubmit={handleCreateSequence}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Sequence Name *</label>
              <input
                id="name"
                type="text"
                value={newSequenceName}
                onChange={(e) => setNewSequenceName(e.target.value)}
                required
                placeholder="Enter sequence name"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={newSequenceDescription}
                onChange={(e) => setNewSequenceDescription(e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="event">Event (optional)</label>
              <select
                id="event"
                value={newSequenceEventId || ""}
                onChange={(e) =>
                  setNewSequenceEventId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
              >
                <option value="">No event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
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

      {sequences.length === 0 ? (
        <div className="card">
          <p>No sequences available yet.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {sequences.map((sequence) => (
            <Link
              to={`/sequences/${sequence.id}`}
              key={sequence.id}
              className={styles.card}
            >
              <h3>{sequence.name}</h3>
              {sequence.description && (
                <p className="text-muted">{sequence.description}</p>
              )}
              {sequence.creator_username && (
                <div className={styles.meta}>
                  <span className={styles.icon}>
                    <FontAwesomeIcon icon={faUser} />
                  </span>
                  <span>By {sequence.creator_username}</span>
                </div>
              )}
              {sequence.event_id && (
                <div className={styles.meta}>
                  <span className={styles.icon}>
                    <FontAwesomeIcon icon={faCalendar} />
                  </span>
                  <span>{getEventName(sequence.event_id)}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
