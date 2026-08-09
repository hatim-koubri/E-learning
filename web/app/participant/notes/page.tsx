"use client";

import {Bookmark, Edit3, Save, Trash2} from "lucide-react";
import Link from "next/link";
import {useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {PrivateNote} from "@/lib/engagement";

export default function NotesPage() {
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setNotes(await api<PrivateNote[]>("/participant/notes")); }
    catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { queueMicrotask(load); }, []);

  async function save(note: PrivateNote) {
    const previous = notes;
    const optimistic = {...note, contenu: draft, updatedAt: new Date().toISOString()};
    setBusy(note.id);
    setNotes((current) => current.map((item) => item.id === note.id ? optimistic : item));
    setEditing(null);
    setMessage("Enregistrement de la note…");
    try {
      const updated = await api<PrivateNote>(`/participant/notes/${note.id}`, {
        method: "PUT",
        body: JSON.stringify({
          chapitreId: note.chapitreId,
          ressourceId: note.ressourceId,
          contenu: draft,
          signet: note.signet,
        }),
      });
      setNotes((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage("Note mise à jour.");
    } catch (reason) {
      setNotes(previous);
      setEditing(note.id);
      setError((reason as Error).message);
      setMessage("");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    const previous = notes;
    setBusy(id);
    setNotes((current) => current.filter((item) => item.id !== id));
    setMessage("Note supprimée.");
    try {
      await api(`/participant/notes/${id}`, {method: "DELETE"});
    } catch (reason) {
      setNotes(previous);
      setError((reason as Error).message);
      setMessage("");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Protected role="PARTICIPANT">
      <AppShell role="PARTICIPANT">
        <PageHeader eyebrow="Bibliothèque personnelle" title="Mes notes et signets" description="Cet espace est strictement privé : aucun formateur ni autre participant ne peut y accéder." />
        {error && <ErrorState message={error} onRetry={load} />}
        {message && <Alert variant="success">{message}</Alert>}
        {loading ? <Card><Skeleton className="skeleton-cover" /></Card> : notes.length ? (
          <div className="notes-grid">
            {notes.map((note) => (
              <Card className="note-card" key={note.id}>
                <div className="note-card-head">
                  <div>
                    <span className="eyebrow">{note.formationTitre}</span>
                    <h2>{note.ressourceTitre || note.chapitreTitre || "Note de formation"}</h2>
                  </div>
                  {note.signet && <Badge variant="warning"><Bookmark size={14} /> Signet</Badge>}
                </div>
                {editing === note.id ? (
                  <textarea value={draft} maxLength={5000} onChange={(event) => setDraft(event.target.value)} aria-label="Contenu de la note" />
                ) : (
                  <p className="note-content">{note.contenu || "Signet sans note associée."}</p>
                )}
                <small>Modifiée le {new Date(note.updatedAt).toLocaleString("fr-FR")}</small>
                <div className="form-actions">
                  {editing === note.id ? (
                    <Button loading={busy === note.id} onClick={() => save(note)}><Save size={16} /> Enregistrer</Button>
                  ) : (
                    <Button variant="secondary" onClick={() => {setEditing(note.id); setDraft(note.contenu || "");}}><Edit3 size={16} /> Modifier</Button>
                  )}
                  <Button variant="danger" disabled={busy === note.id} onClick={() => remove(note.id)}><Trash2 size={16} /> Supprimer</Button>
                  <Link
                    className="btn btn-ghost"
                    href={`/apprentissage/${note.formationId}${note.ressourceId ? `?ressource=${note.ressourceId}` : note.chapitreId ? `?chapitre=${note.chapitreId}` : ""}`}
                  >
                    Ouvrir le cours
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucune note privée"
            description="Ajoutez une note ou un signet pendant la consultation d’un chapitre."
            action={<Link className="btn btn-primary" href="/catalogue">Ouvrir le catalogue</Link>}
          />
        )}
      </AppShell>
    </Protected>
  );
}
