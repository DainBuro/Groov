import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllEvents, createEvent } from '../../api/eventApi';
import { Event } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import styles from './Events.module.scss';

export const EventsList: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const loadEvents = async () => {
    try {
      const data = await getAllEvents(searchTerm || undefined);
      setEvents(data);
    } catch (err: any) {
      setError('Failed to load events');
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        await loadEvents();
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      loadEvents();
    }
  }, [searchTerm]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Date TBA';
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    try {
      const newEvent = await createEvent({
        name: newEventName,
        location: newEventLocation || undefined,
        date: newEventDate ? new Date(newEventDate) : undefined,
      });
      navigate(`/events/${newEvent.id}`);
    } catch (err: any) {
      alert('Failed to create event');
    }
  };

  if (isLoading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">{error}</div>;

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1>Dance Events</h1>
          <p className="text-muted">Browse upcoming and past dance events</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : 'Create Event'}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {showCreateForm && (
        <div className={styles.createForm}>
          <h3>Create New Event</h3>
          <form onSubmit={handleCreateEvent}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Event Name *</label>
              <input
                id="name"
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                required
                placeholder="Enter event name"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                placeholder="Enter location (optional)"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
            <div className={styles.formActions}>
              <Button type="submit" variant="primary">Create</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card">
          <p>No events available yet.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {events.map((event) => (
            <Link to={`/events/${event.id}`} key={event.id} className={styles.card}>
              <h3>{event.name}</h3>
              <div className={styles.meta}>
                <span className={styles.icon}>📅</span>
                <span>{formatDate(event.date)}</span>
              </div>
              {event.location && (
                <div className={styles.meta}>
                  <span className={styles.icon}>📍</span>
                  <span>{event.location}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
