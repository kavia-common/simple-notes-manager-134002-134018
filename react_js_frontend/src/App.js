import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

// Types
/**
 * @typedef {Object} Note
 * @property {string} id - UUID string
 * @property {string} title - Note title
 * @property {string} content - Note content (markdown/plain)
 * @property {number} updatedAt - Epoch millis when last modified
 */

// Utilities
const LS_KEY = 'notes_manager__notes_v1';

// PUBLIC_INTERFACE
export function generateId() {
  /** Generate a reasonably unique id for notes. */
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// PUBLIC_INTERFACE
export function loadNotes() {
  /** Load notes array from localStorage. Returns [] if not found or invalid. */
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

// PUBLIC_INTERFACE
export function saveNotes(notes) {
  /** Persist notes array to localStorage. */
  localStorage.setItem(LS_KEY, JSON.stringify(notes));
}

// Components
function Header({ theme, onToggleTheme }) {
  return (
    <header className="nav">
      <div className="brand">Notes</div>
      <div className="nav-actions">
        <button
          className="btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </header>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="empty">
      <p className="empty-title">No notes yet</p>
      <p className="empty-desc">Create your first note to get started.</p>
      <button className="btn btn-primary" onClick={onCreate}>+ New note</button>
    </div>
  );
}

function Toolbar({ search, onSearch, onCreate }) {
  return (
    <div className="toolbar">
      <input
        type="text"
        className="input"
        placeholder="Search notes..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        aria-label="Search notes"
      />
      <button className="btn btn-primary" onClick={onCreate}>+ New</button>
    </div>
  );
}

function NoteListItem({ note, isActive, onSelect, onDelete }) {
  const date = new Date(note.updatedAt);
  return (
    <div
      className={`note-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(note.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(note.id);
      }}
      aria-label={`Open note ${note.title || 'Untitled'}`}
    >
      <div className="note-item-main">
        <div className="note-title">{note.title || 'Untitled'}</div>
        <div className="note-snippet">{note.content?.slice(0, 64) || 'No content'}</div>
      </div>
      <div className="note-meta">
        <div className="note-date">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <button
          className="icon-btn"
          title="Delete note"
          aria-label={`Delete note ${note.title || 'Untitled'}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function NotesList({ notes, activeId, onSelect, onDelete, search }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  return (
    <div className="list">
      {filtered.map((note) => (
        <NoteListItem
          key={note.id}
          note={note}
          isActive={note.id === activeId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
      {filtered.length === 0 && (
        <div className="muted small" style={{ padding: 12 }}>
          No notes match your search.
        </div>
      )}
    </div>
  );
}

function Editor({ note, onChange, onSave }) {
  if (!note) {
    return (
      <div className="editor empty-editor">
        <div className="muted">Select a note to view and edit.</div>
      </div>
    );
  }

  return (
    <div className="editor">
      <input
        className="input input-title"
        placeholder="Note title"
        value={note.title}
        onChange={(e) => onChange({ ...note, title: e.target.value })}
      />
      <textarea
        className="textarea"
        placeholder="Write your note..."
        value={note.content}
        onChange={(e) => onChange({ ...note, content: e.target.value })}
      />
      <div className="editor-footer">
        <button className="btn btn-primary" onClick={onSave}>Save</button>
        <span className="muted small">Last updated: {new Date(note.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /**
   * Main Notes Manager application.
   * Features:
   * - Create, list, edit, delete notes
   * - Search notes
   * - Persist to localStorage
   * - Light/Dark theme toggle
   */
  const [theme, setTheme] = useState('light');
  const [notes, setNotes] = useState(() => loadNotes());
  const [selectedId, setSelectedId] = useState(() => {
    const initial = loadNotes();
    return initial[0]?.id || null;
  });
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState('');

  // Keep document theme in sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persist notes to localStorage
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // When selection changes, update draft
  useEffect(() => {
    const n = notes.find(n => n.id === selectedId) || null;
    setDraft(n ? { ...n } : null);
  }, [selectedId, notes]);

  const onCreate = () => {
    const newNote = {
      id: generateId(),
      title: '',
      content: '',
      updatedAt: Date.now(),
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedId(newNote.id);
    setDraft(newNote);
  };

  const onDelete = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) {
      // Select another note if available
      const remaining = notes.filter(n => n.id !== id);
      setSelectedId(remaining[0]?.id || null);
    }
  };

  const onSave = () => {
    if (!draft) return;
    const updated = { ...draft, updatedAt: Date.now() };
    setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
  };

  const toggleTheme = () => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="app">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="layout">
        <aside className="sidebar">
          <Toolbar search={search} onSearch={setSearch} onCreate={onCreate} />
          {notes.length === 0 ? (
            <EmptyState onCreate={onCreate} />
          ) : (
            <NotesList
              notes={notes}
              activeId={selectedId}
              onSelect={setSelectedId}
              onDelete={onDelete}
              search={search}
            />
          )}
        </aside>
        <section className="content">
          <Editor note={draft} onChange={setDraft} onSave={onSave} />
        </section>
      </main>

      <footer className="footer">
        <span className="muted small">Simple Notes Manager — React Hooks</span>
      </footer>
    </div>
  );
}

export default App;
