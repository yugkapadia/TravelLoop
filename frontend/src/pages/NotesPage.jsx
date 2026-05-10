import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { createNote, deleteNote, fetchNotes } from '../services/api';

export default function NotesPage() {
  const { tripId } = useParams();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadNotes() {
      try {
        const data = await fetchNotes(tripId);
        setNotes(data.notes || []);
      } catch (err) {
        setError(err.message || 'Failed to load notes.');
      }
    }

    loadNotes();
  }, [tripId]);

  async function addNote(event) {
    event.preventDefault();
    if (!newNote.trim()) return;

    try {
      const data = await createNote({ tripId: Number(tripId), content: newNote });
      setNotes((current) => [data.note, ...current]);
      setNewNote('');
    } catch (err) {
      setError(err.message || 'Failed to add note.');
    }
  }

  async function removeNote(noteId) {
    await deleteNote(noteId);
    setNotes((current) => current.filter((note) => note.id !== noteId));
  }

  return (
    <main className="page-flow narrow">
      <Link className="text-link" to={`/trip/${tripId}`}>
        Back to itinerary
      </Link>
      <header>
        <p className="eyebrow">Trip memory</p>
        <h1 className="page-header">Notes</h1>
      </header>

      {error && <div className="alert-error">{error}</div>}

      <form className="surface stack" onSubmit={addNote}>
        <textarea placeholder="Hotel details, reminders, contacts, ideas..." value={newNote} onChange={(event) => setNewNote(event.target.value)} rows={5} />
        <button className="button-primary" type="submit">Add note</button>
      </form>

      <section className="notes-list">
        {notes.length === 0 && <div className="empty-state compact">No notes yet.</div>}
        {notes.map((note) => (
          <article className="note-card" key={note.id}>
            <p>{note.content}</p>
            <div>
              <small>{note.created_at || note.createdAt}</small>
              <button className="button-ghost danger" onClick={() => removeNote(note.id)} type="button">Delete</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
