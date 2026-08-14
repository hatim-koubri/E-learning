"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {Search} from "lucide-react";
import {useCallback, useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {Protected} from "@/components/Protected";
import {Avatar, Badge, Card, EmptyState, ErrorState, Pagination, Skeleton} from "@/components/ui";
import {api, type AdminUserPage} from "@/lib/api";

function UsersSkeleton() {
  return <div className="admin-user-list" aria-label="Chargement des utilisateurs" aria-busy="true">{Array.from({length: 4}, (_, index) => (
    <div className="surface-card admin-user-row admin-user-skeleton" key={index}>
      <div className="admin-user-identity"><Skeleton className="skeleton-avatar" /><span><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-line" /></span></div>
      <Skeleton className="skeleton-line medium" />
      <Skeleton className="skeleton-badge" />
      <Skeleton className="skeleton-button" />
    </div>
  ))}</div>;
}

export default function AdminUsers() {
  const router = useRouter();
  const initial = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [query, setQuery] = useState(initial.get("q") ?? "");
  const [debounced, setDebounced] = useState(query);
  const [role, setRole] = useState(initial.get("role") ?? "");
  const [status, setStatus] = useState(initial.get("statut") ?? "");
  const [page, setPage] = useState(Number(initial.get("page") ?? 0));
  const [data, setData] = useState<AdminUserPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(query.trim()); setPage(0); }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({page: String(page), size: "20", sort: "createdAt", direction: "desc"});
    if (debounced) params.set("q", debounced);
    if (role) params.set("role", role);
    if (status) params.set("statut", status);
    history.replaceState(null, "", `?${params}`);
    try {
      const result = await api<AdminUserPage>(`/admin/utilisateurs?${params}`);
      if (!result.content.length && page > 0 && result.totalPages <= page) {
        setPage(Math.max(0, result.totalPages - 1));
        return;
      }
      setData(result);
      result.content.forEach((user) => router.prefetch(`/admin/utilisateurs/${user.id}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les utilisateurs.");
    } finally { setLoading(false); }
  }, [debounced, role, status, page, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return <Protected role="ADMIN"><AppShell role="ADMIN"><div className="page-stack">
    <header className="page-heading"><div><span className="eyebrow">Administration</span><h1>Utilisateurs</h1><p>Recherche, filtres et pagination exécutés par le backend.</p></div></header>
    <Card className="admin-filters">
      <label><span>Rechercher</span><span className="search-input"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou e-mail" /></span></label>
      <label><span>Rôle</span><select value={role} onChange={(event) => { setRole(event.target.value); setPage(0); }}><option value="">Tous</option><option value="ADMIN">Admin</option><option value="FORMATEUR">Formateur</option><option value="PARTICIPANT">Participant</option></select></label>
      <label><span>Statut</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="">Tous</option>{["ACTIF", "EN_ATTENTE", "REFUSE", "SUSPENDU", "SUPPRIME"].map((value) => <option key={value}>{value}</option>)}</select></label>
    </Card>
    {loading && !data ? <UsersSkeleton /> : error && !data ? <ErrorState message={error} onRetry={load} /> : data && <>
      {error && <ErrorState message={error} onRetry={load} />}
      <p aria-live="polite">{data.totalElements} compte{data.totalElements > 1 ? "s" : ""}</p>
      {data.content.length ? <div className="admin-user-list">{data.content.map((user) => <Link prefetch href={`/admin/utilisateurs/${user.id}`} key={user.id} className="surface-card admin-user-row" aria-label={`Consulter le compte de ${user.nom}`}>
        <div className="admin-user-identity"><Avatar name={user.nom} /><span><strong>{user.nom}</strong><small>{user.email}</small></span></div>
        <span className="admin-user-role">{user.role}</span>
        <Badge variant={user.statut === "ACTIF" ? "success" : user.statut === "SUSPENDU" || user.statut === "SUPPRIME" ? "danger" : "warning"}>{user.statut}</Badge>
        <span className="btn btn-secondary btn-sm" aria-hidden="true">Consulter</span>
      </Link>)}</div> : <EmptyState title="Aucun utilisateur" description="La base ne contient aucun compte correspondant à ces critères." />}
      <Pagination page={data.page} totalPages={data.totalPages} onPrevious={() => setPage((value) => Math.max(0, value - 1))} onNext={() => setPage((value) => value + 1)} />
    </>}
  </div></AppShell></Protected>;
}
