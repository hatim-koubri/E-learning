"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FilePenLine,
  GraduationCap,
  Layers3,
  Plus,
} from "lucide-react";
import {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {FormationFields, formationPayload} from "@/components/FormationFields";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Badge, Button, Card, EmptyState, ErrorState, Modal, PageSkeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {FormationDetail, FormationSummary} from "@/lib/formations";

export default function FormationsPage() {
  const [items, setItems] = useState<FormationSummary[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<FormationSummary[]>("/formateur/formations"));
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

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const formation = await api<FormationDetail>("/formateur/formations", {
        method: "POST",
        body: JSON.stringify(formationPayload(event.currentTarget)),
      });
      location.href = `/formateur/formations/${formation.id}`;
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => ({
    published: items.filter((item) => item.statut === "PUBLIEE").length,
    drafts: items.filter((item) => item.statut === "BROUILLON").length,
    modules: items.reduce((sum, item) => sum + item.nombreModules, 0),
  }), [items]);

  return (
    <Protected role="FORMATEUR">
      <AppShell role="FORMATEUR">
        <PageHeader
          eyebrow="Espace formateur"
          title="Mes formations"
          description="Créez vos parcours, organisez leur programme et publiez-les lorsque chaque ressource est prête."
          actions={
            <>
              <Link className="btn btn-secondary" href="/formateur/classes"><CalendarDays size={17} /> Classes</Link>
              <Button onClick={() => setCreating(true)}><Plus size={18} /> Nouvelle formation</Button>
            </>
          }
        />
        {error && <ErrorState message={error} onRetry={load} />}

        <div className="stats-grid">
          <Card className="stat-card">
            <span className="stat-icon"><GraduationCap size={21} /></span>
            <div><small>Total formations</small><strong>{items.length}</strong></div>
          </Card>
          <Card className="stat-card">
            <span className="stat-icon success"><BookOpen size={21} /></span>
            <div><small>Publiées</small><strong>{stats.published}</strong></div>
          </Card>
          <Card className="stat-card">
            <span className="stat-icon warning"><FilePenLine size={21} /></span>
            <div><small>Brouillons</small><strong>{stats.drafts}</strong></div>
          </Card>
          <Card className="stat-card">
            <span className="stat-icon"><Layers3 size={21} /></span>
            <div><small>Modules créés</small><strong>{stats.modules}</strong></div>
          </Card>
        </div>

        {loading ? (
          <PageSkeleton />
        ) : items.length ? (
          <div className="course-grid">
            {items.map((item) => (
              <article className="course-card" key={item.id}>
                <div className="course-cover"><GraduationCap size={34} /><span>{item.imageCouvertureKey ? "Couverture configurée" : "Ajoutez une couverture"}</span></div>
                <div className="course-body">
                  <div className="row spread">
                    <Badge variant={item.statut === "PUBLIEE" ? "success" : "warning"}>{item.statut}</Badge>
                    <span className="muted">{item.nombreModules} module(s)</span>
                  </div>
                  <span className="course-category">{item.categorie}</span>
                  <h2>{item.titre}</h2>
                  <p>{item.description}</p>
                  <div className="course-meta">
                    <span>{item.niveau.replaceAll("_", " ")}</span>
                    <span>{item.prix === 0 ? "Gratuite" : `${item.prix} DH`}</span>
                  </div>
                  <Link className="text-link" href={`/formateur/formations/${item.id}`}>
                    Ouvrir l’éditeur <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : !error ? (
          <EmptyState
            title="Votre première formation commence ici"
            description="Créez un brouillon, puis ajoutez vos modules, chapitres et ressources."
            action={<Button onClick={() => setCreating(true)}><Plus size={17} /> Créer mon premier cours</Button>}
          />
        ) : null}

        <Modal
          open={creating}
          title="Nouvelle formation"
          description="Commencez par les informations générales. Vous structurerez le programme à l’étape suivante."
          onClose={() => setCreating(false)}
        >
          <form className="stack" onSubmit={create}>
            <FormationFields />
            {error && <p className="message error">{error}</p>}
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Fermer</Button>
              <Button type="submit" loading={saving}>Créer et structurer</Button>
            </div>
          </form>
        </Modal>
      </AppShell>
    </Protected>
  );
}
