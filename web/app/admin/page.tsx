"use client";

import Link from "next/link";
import {ArrowRight, Flag, RefreshCw, ShieldCheck} from "lucide-react";
import {useCallback, useEffect, useState, type CSSProperties} from "react";
import {AppShell} from "@/components/AppShell";
import {Protected} from "@/components/Protected";
import {Alert, Button, ErrorState, PageSkeleton} from "@/components/ui";
import {api, type DashboardData} from "@/lib/api";

const metrics = [
  {key: "participants", label: "Participants", detail: "comptes apprenants"},
  {key: "formateursActifs", label: "Formateurs actifs", detail: "comptes opérationnels"},
  {key: "formationsPubliees", label: "Formations publiées", detail: "dans le catalogue"},
  {key: "inscriptionsActives", label: "Inscriptions actives", detail: "parcours en cours"},
] as const;

const formatNumber = (value: number | undefined) => new Intl.NumberFormat("fr-FR").format(value ?? 0);
const formatShare = (value: number | undefined, total: number) => total > 0
  ? `${Math.round((value ?? 0) / total * 100)} %`
  : "0 %";
const monthLabel = (value: string) => new Date(`${value}-01T00:00:00Z`)
  .toLocaleDateString("fr-FR", {month: "short"})
  .replace(".", "");

function TrendChart({data}: {data: DashboardData["monthlySeries"]}) {
  const width = 760;
  const height = 240;
  const padding = 28;
  const max = Math.max(1, ...data.flatMap((item) => [item.inscriptions, item.comptesCrees]));
  const points = (key: "inscriptions" | "comptesCrees") => data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : padding + index * (width - padding * 2) / (data.length - 1);
    const y = height - padding - item[key] / max * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="admin-trend-scroll">
      <svg className="admin-trend-chart" viewBox={`0 0 ${width} ${height + 28}`} role="img" aria-label="Évolution mensuelle des inscriptions et créations de comptes">
        {[0, .25, .5, .75, 1].map((step) => (
          <line key={step} x1={padding} x2={width - padding} y1={padding + (height - padding * 2) * step} y2={padding + (height - padding * 2) * step} className="admin-chart-gridline" strokeDasharray="4 8" />
        ))}
        <polyline points={points("inscriptions")} className="admin-chart-primary" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points("comptesCrees")} className="admin-chart-secondary" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 8" />
        {data.map((item, index) => {
          const x = data.length === 1 ? width / 2 : padding + index * (width - padding * 2) / (data.length - 1);
          const y = height - padding - item.inscriptions / max * (height - padding * 2);
          return <g key={item.month}><circle cx={x} cy={y} r="4" className="admin-chart-point" /><text x={x} y={height + 9} textAnchor="middle" className="admin-chart-label">{monthLabel(item.month)}</text></g>;
        })}
      </svg>
    </div>
  );
}

function Distribution({values, title}: {values: Record<string, number>; title: string}) {
  const entries = Object.entries(values);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const segments = entries.map(([, value], index) => {
    const start = cursor;
    cursor += total ? value / total * 100 : 0;
    return `var(--chart-${index % 5 + 1}) ${start}% ${cursor}%`;
  }).join(",");
  const style = {"--distribution": total ? `conic-gradient(${segments})` : "var(--line)"} as CSSProperties;

  return (
    <section className="admin-panel">
      <header className="admin-panel-heading"><h2>{title}</h2><strong>{formatNumber(total)}</strong></header>
      <div className="admin-distribution">
        <div className="admin-distribution-ring" style={style} aria-hidden="true"><span /></div>
        <ul>{entries.map(([label, value], index) => <li key={label}><i className={`chart-tone-${index % 5 + 1}`} /><span>{label.toLowerCase().replaceAll("_", " ")}</span><strong>{formatNumber(value)}</strong></li>)}</ul>
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshConfirmed, setRefreshConfirmed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setRefreshConfirmed(false);
    try {
      setData(await api<DashboardData>("/admin/dashboard?months=12"));
      setRefreshConfirmed(true);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Le tableau de bord est indisponible."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const pendingCount = (data?.indicators.demandesFormateur ?? 0) + (data?.indicators.dossiersModeration ?? 0);
  const roleTotal = data ? Object.values(data.roleDistribution).reduce((sum, value) => sum + value, 0) : 0;
  const formationTotal = data ? Object.values(data.formationStatusDistribution).reduce((sum, value) => sum + value, 0) : 0;
  const latestMonth = data?.monthlySeries.at(-1);
  const metricContext = (key: typeof metrics[number]["key"]) => {
    if (!data) return "";
    if (key === "participants") return `${formatShare(data.indicators.participants, roleTotal)} des comptes`;
    if (key === "formateursActifs") return `${formatShare(data.indicators.formateursActifs, roleTotal)} des comptes`;
    if (key === "formationsPubliees") return `${formatShare(data.indicators.formationsPubliees, formationTotal)} des formations`;
    return latestMonth ? `${formatNumber(latestMonth.inscriptions)} nouvelles en ${monthLabel(latestMonth.month)}` : "Aucune période disponible";
  };

  return (
    <Protected role="ADMIN"><AppShell role="ADMIN"><div className="admin-overview">
      <header className="admin-overview-header">
        <div><span className="eyebrow">Administration</span><h1>Vue d’ensemble</h1><p>État actuel de la plateforme et décisions qui demandent votre attention.</p></div>
        <div className="admin-sync"><Button variant="secondary" onClick={load} loading={loading}>{!loading && <RefreshCw size={17} />} Actualiser</Button>{data && <p className={refreshConfirmed ? "is-confirmed" : undefined} aria-live="polite"><span aria-hidden="true" />À jour · {new Date(data.generatedAt).toLocaleString("fr-FR")} · {data.timezone}</p>}</div>
      </header>

      {error && data && <Alert variant="error">Échec du rafraîchissement : {error}. Les dernières données restent affichées.</Alert>}
      {loading && !data ? <PageSkeleton cards={8} /> : error && !data ? <ErrorState message={error} onRetry={load} /> : data && <div className="admin-overview-content">
        <section className={pendingCount > 0 ? "admin-priority has-pending" : "admin-priority"} aria-labelledby="priority-heading">
          <div className="admin-priority-heading"><div><span className="eyebrow">À traiter</span><h2 id="priority-heading">Actions en attente</h2><p>Les décisions administratives prioritaires, regroupées dans un seul espace.</p></div><div className="admin-priority-total" aria-label={`${pendingCount} actions en attente`}><strong>{formatNumber(pendingCount)}</strong><span>à traiter</span></div></div>
          {pendingCount > 0 ? <div className="admin-priority-list">
            <Link href="/admin/formateurs" className="admin-priority-item"><span className="admin-priority-icon warning"><ShieldCheck size={20} /></span><span><strong>Demandes formateur</strong><small>Vérifier les dossiers et rendre une décision</small></span><b>{formatNumber(data.indicators.demandesFormateur)}</b><ArrowRight aria-hidden="true" size={19} /></Link>
            <Link href="/admin/avis" className="admin-priority-item"><span className="admin-priority-icon danger"><Flag size={20} /></span><span><strong>Signalements à modérer</strong><small>Examiner les avis signalés par la communauté</small></span><b>{formatNumber(data.indicators.dossiersModeration)}</b><ArrowRight aria-hidden="true" size={19} /></Link>
          </div> : <div className="admin-priority-clear" role="status"><span aria-hidden="true">✓</span><div><strong>Tout est à jour</strong><p>Aucune demande formateur ni aucun signalement ne nécessite de décision.</p></div></div>}
          <dl className="admin-operational-status"><div><dt>Classes actives</dt><dd>{formatNumber(data.indicators.classesActives)}</dd></div><div><dt>Séances planifiées</dt><dd>{formatNumber(data.indicators.seancesPlanifiees)}</dd></div></dl>
        </section>

        <section aria-labelledby="metrics-heading"><div className="admin-section-heading"><div><span className="eyebrow">Plateforme</span><h2 id="metrics-heading">Indicateurs clés</h2></div></div><div className="admin-metric-grid">{metrics.map(({key, label, detail}) => <article className="admin-metric" key={key}><strong>{formatNumber(data.indicators[key])}</strong><h3>{label}</h3><p>{detail}</p><small>{metricContext(key)}</small></article>)}</div></section>

        <section className="admin-analysis-grid">
          <div className="admin-panel admin-activity-panel"><header className="admin-panel-heading"><div><span className="eyebrow">Évolution</span><h2>Activité sur 12 mois</h2><p>{data.periodStart} — {data.periodEnd}</p></div><div className="admin-chart-legend"><span><i className="primary" />Inscriptions</span><span><i className="secondary" />Comptes</span></div></header><TrendChart data={data.monthlySeries} /><details className="admin-chart-summary"><summary>Résumé textuel accessible</summary><ul>{data.monthlySeries.map((point) => <li key={point.month}>{point.month} : {point.inscriptions} inscriptions, {point.comptesCrees} comptes créés.</li>)}</ul></details></div>
          <section className="admin-panel admin-popular"><header className="admin-panel-heading"><div><span className="eyebrow">Catalogue</span><h2>Formations populaires</h2></div></header>{data.popularFormations.length ? <ol>{data.popularFormations.map((item, index) => <li key={item.formationId}><span>{index + 1}</span><strong>{item.titre}</strong><b>{formatNumber(item.inscriptions)} inscrits</b></li>)}</ol> : <p className="admin-inline-empty">Aucune inscription active.</p>}</section>
        </section>
        <section className="admin-distribution-grid"><Distribution values={data.roleDistribution} title="Communauté par rôle" /><Distribution values={data.formationStatusDistribution} title="Cycle des formations" /></section>
      </div>}
    </div></AppShell></Protected>
  );
}
