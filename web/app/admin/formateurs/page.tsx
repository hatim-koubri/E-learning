"use client";

import {Check, Clock3, Eye, ShieldCheck, UserCheck, UserRoundCheck, X} from "lucide-react";
import {useCallback, useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, EmptyState, Modal, Skeleton, Table} from "@/components/ui";
import {api, type Formateur} from "@/lib/api";

export default function Page() {
  const [items, setItems] = useState<Formateur[]>([]);
  const [selected, setSelected] = useState<Formateur | null>(null);
  const [refusing, setRefusing] = useState<Formateur | null>(null);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<Formateur[]>("/admin/formateurs/demandes"));
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The request deliberately owns the loading state for the initial page load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function accept(id: number) {
    setBusy(id);
    try {
      await api(`/admin/formateurs/${id}/accepter`, {method: "PATCH"});
      setNotice("La demande a été acceptée. Le formateur peut désormais se connecter.");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function refuse() {
    if (!refusing || !motif.trim()) return;
    setBusy(refusing.id);
    try {
      await api(`/admin/formateurs/${refusing.id}/refuser`, {
        method: "PATCH",
        body: JSON.stringify({motif: motif.trim()}),
      });
      setNotice("La demande a été refusée avec son motif.");
      setRefusing(null);
      setMotif("");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function details(id: number) {
    try {
      setSelected(await api<Formateur>(`/admin/formateurs/demandes/${id}`));
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <Protected role="ADMIN">
      <AppShell role="ADMIN">
        <PageHeader
          eyebrow="Administration"
          title="Demandes formateurs"
          description="Examinez chaque candidature et rendez une décision explicite avant d’ouvrir l’accès formateur."
        />
        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}

        <div className="stats-grid">
          <Card className="stat-card">
            <span className="stat-icon warning"><Clock3 size={21} /></span>
            <div><small>En attente</small><strong>{items.length}</strong></div>
          </Card>
          <Card className="stat-card">
            <span className="stat-icon"><ShieldCheck size={21} /></span>
            <div><small>Validation</small><strong>Manuelle</strong></div>
          </Card>
          <Card className="stat-card">
            <span className="stat-icon success"><UserRoundCheck size={21} /></span>
            <div><small>Décision</small><strong>Traçable</strong></div>
          </Card>
        </div>

        <Card>
          <div className="panel-heading">
            <div><h2>Candidatures à traiter</h2><p>{items.length} demande(s) nécessitent une décision.</p></div>
            <span className="stat-icon"><UserCheck size={21} /></span>
          </div>
          {loading ? (
            <div className="stack"><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></div>
          ) : items.length ? (
            <Table>
              <table>
                <thead><tr><th>Formateur</th><th>Contact</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.map((formateur) => (
                    <tr key={formateur.id}>
                      <td><strong>{formateur.nom}</strong><br /><span className="muted">{formateur.createdAt ? `Demande du ${new Date(formateur.createdAt).toLocaleDateString("fr-FR")}` : "Date de demande non disponible"}</span></td>
                      <td>{formateur.email}<br /><span className="muted">{formateur.telephone || "Téléphone non renseigné"}</span></td>
                      <td><Badge variant="warning">{formateur.statut}</Badge></td>
                      <td>
                        <div className="row compact">
                          <Button size="sm" variant="secondary" onClick={() => details(formateur.id)}><Eye size={15} /> Détails</Button>
                          <Button size="sm" loading={busy === formateur.id} onClick={() => accept(formateur.id)}><Check size={15} /> Accepter</Button>
                          <Button size="sm" variant="danger" onClick={() => setRefusing(formateur)}><X size={15} /> Refuser</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          ) : (
            <EmptyState
              title="Aucune demande en attente"
              description="Les nouvelles candidatures formateurs apparaîtront ici."
            />
          )}
        </Card>

        <Modal open={Boolean(selected)} title="Détail du formateur" description="Informations déclarées lors de l’inscription." onClose={() => setSelected(null)}>
          {selected && (
            <div className="stack">
              <div><span className="field-hint">Nom</span><strong className="field-value">{selected.nom}</strong></div>
              <div><span className="field-hint">Email</span><strong className="field-value">{selected.email}</strong></div>
              <div><span className="field-hint">Téléphone</span><strong className="field-value">{selected.telephone || "Non renseigné"}</strong></div>
              <div><span className="field-hint">Statut</span><Badge variant="warning">{selected.statut}</Badge></div>
              <div className="form-actions"><Button variant="secondary" onClick={() => setSelected(null)}>Fermer</Button></div>
            </div>
          )}
        </Modal>

        <Modal
          open={Boolean(refusing)}
          title="Refuser cette demande ?"
          description={`Le motif sera associé à la demande de ${refusing?.nom ?? "ce formateur"}.`}
          onClose={() => {setRefusing(null); setMotif("");}}
        >
          <div className="stack">
            <label>
              Motif du refus
              <textarea value={motif} onChange={(event) => setMotif(event.target.value)} required maxLength={1000} placeholder="Expliquez clairement la décision…" />
            </label>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => {setRefusing(null); setMotif("");}}>Annuler</Button>
              <Button variant="danger" disabled={!motif.trim()} loading={busy === refusing?.id} onClick={refuse}>Confirmer le refus</Button>
            </div>
          </div>
        </Modal>
      </AppShell>
    </Protected>
  );
}
