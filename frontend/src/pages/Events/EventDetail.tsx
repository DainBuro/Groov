import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getEventById, updateEvent, deleteEvent } from "../../api/eventApi";
import { getAllSequences } from "../../api/sequenceApi";
import { Event, DanceSequence } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import styles from "./Events.module.scss";

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [sequences, setSequences] = useState<DanceSequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");

  useEffect(() => {
    const fetchEventData = async () => {
      if (!id) return;

      try {
        const eventData = await getEventById(parseInt(id));
        setEvent(eventData);

        // Fetch all sequences and filter by event_id on frontend
        const allSequences = await getAllSequences();
        const eventSequences = allSequences.filter(
          (seq) => seq.event_id === parseInt(id)
        );
        setSequences(eventSequences);
      } catch (err: any) {
        setError("Failed to load event details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [id]);

  const handleEditToggle = () => {
    if (!isEditMode && event) {
      setEditName(event.name);
      setEditLocation(event.location || "");
      setEditDate(
        event.date ? new Date(event.date).toISOString().split("T")[0] : ""
      );
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveEdit = async () => {
    if (!event) return;

    try {
      const updatedEvent = await updateEvent(event.id, {
        name: editName,
        location: editLocation || undefined,
        date: editDate ? new Date(editDate) : undefined,
      });

      setEvent(updatedEvent);
      setIsEditMode(false);
    } catch (err: any) {
      alert("Failed to update event");
    }
  };

  const handleDelete = async () => {
    if (
      !event ||
      !window.confirm(`Are you sure you want to delete "${event.name}"?`)
    ) {
      return;
    }

    try {
      await deleteEvent(event.id);
      navigate("/events");
    } catch (err: any) {
      alert(
        "Failed to delete event. There may be sequences associated with it."
      );
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Date TBA";
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;
  if (!event) return <div className="container">Event not found</div>;

  return (
    <div className="container">
      <div className={styles.detailContainer}>
        <div className={styles.detailHeader}>
          <h1>{event.name}</h1>

          {isAdmin && !isEditMode && (
            <div className={styles.actions}>
              <Button variant="primary" onClick={handleEditToggle}>
                Edit Event
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete Event
              </Button>
            </div>
          )}
        </div>

        {isEditMode ? (
          <div className={styles.editMode}>
            <h3>Edit Event</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
            >
              <div className={styles.formGroup}>
                <label htmlFor="name">Event Name *</label>
                <input
                  id="name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Enter location (optional)"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

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
            <div className={styles.infoRow}>
              <span className={styles.icon}>📅</span>
              <span>{formatDate(event.date)}</span>
            </div>
            {event.location && (
              <div className={styles.infoRow}>
                <span className={styles.icon}>📍</span>
                <span>{event.location}</span>
              </div>
            )}
          </div>
        )}

        <div className={styles.sequenceSection}>
          <h2>Sequences for this Event</h2>
          {sequences.length === 0 ? (
            <div className="card">
              <p className="text-muted">
                No sequences created for this event yet.
              </p>
            </div>
          ) : (
            <div className={styles.sequenceGrid}>
              {sequences.map((sequence) => (
                <Link
                  to={`/sequences/${sequence.id}`}
                  key={sequence.id}
                  className={styles.sequenceCard}
                >
                  <h3>{sequence.name}</h3>
                  {sequence.description && <p>{sequence.description}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
