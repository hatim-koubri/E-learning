"use client";

import {Eye, EyeOff, Flag} from "lucide-react";
import {useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Button, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";

type Report = {id: number; reviewId: number; motif: string; createdAt: string};

export default function ReviewModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try { setReports(await api<Report[]>("/admin/avis/signalements")); }
    catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { queueMicrotask(load); }, []);

  async function moderate(reviewId: number, statut: "PUBLIE" | "MASQUE") {
    try {
      await api(`/admin/avis/${reviewId}/moderation`, {method: "PUT", body: JSON.stringify({statut})});
      setReports((current) => current.filter((item) => item.reviewId !== reviewId));
    } catch (reason) { setError((reason as Error).message); }
  }

  return (
    <Protected role="ADMIN">
      <AppShell role="ADMIN">
        <PageHeader eyebrow="Modération" title="Avis signalés" description="Un signalement déclenche une vérification. L’administrateur peut publier ou masquer, jamais réécrire une note." />
        {error && <ErrorState message={error} onRetry={load} />}
        {loading ? <Card><Skeleton className="skeleton-cover" /></Card> : reports.length ? (
          <div className="review-list">
            {reports.map((report) => (
              <Card key={report.id}>
                <div className="row"><Flag size={18} /><strong>Avis #{report.reviewId}</strong><small>{new Date(report.createdAt).toLocaleString("fr-FR")}</small></div>
                <p>{report.motif}</p>
                <div className="form-actions">
                  <Button variant="secondary" onClick={() => moderate(report.reviewId, "PUBLIE")}><Eye size={16} /> Maintenir publié</Button>
                  <Button variant="danger" onClick={() => moderate(report.reviewId, "MASQUE")}><EyeOff size={16} /> Masquer</Button>
                </div>
              </Card>
            ))}
          </div>
        ) : <EmptyState title="Aucun signalement à traiter" description="Les futurs signalements apparaîtront ici." />}
      </AppShell>
    </Protected>
  );
}
