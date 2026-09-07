"use client";

import {Compass, Heart, ListFilter, RotateCcw, Search, X} from "lucide-react";
import Link from "next/link";
import {FormEvent, useCallback, useEffect, useState} from "react";
import {CourseCard} from "@/components/CourseCard";
import {Footer} from "@/components/Footer";
import {useResolvedSession} from "@/components/GuestOnly";
import {PublicHeader} from "@/components/PublicHeader";
import {Button, EmptyState, ErrorState, PageSkeleton, Pagination} from "@/components/ui";
import {api} from "@/lib/api";
import type {Dashboard, Favorite} from "@/lib/engagement";
import type {CataloguePage} from "@/lib/learning";

export default function Catalogue() {
  const [data, setData] = useState<CataloguePage | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [niveau, setNiveau] = useState("");
  const [langue, setLangue] = useState("");
  const [categorie, setCategorie] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const {resolved, user} = useResolvedSession();
  const participant = resolved && user?.role === "PARTICIPANT";

  const load = useCallback(async () => {
    if (!resolved) return;
    setLoading(true);
    setError("");
    const clientOrdered = Boolean(participant);
    const params = new URLSearchParams({q: query, page: clientOrdered || favoritesOnly ? "0" : String(page), size: clientOrdered || favoritesOnly ? "50" : "9"});
    if (niveau) params.set("niveau", niveau);
    if (langue) params.set("langue", langue);
    if (categorie) params.set("categorie", categorie);
    try {
      if (clientOrdered) {
        const [firstPage, dashboard, favorites] = await Promise.all([
          api<CataloguePage>(`/catalogue?${params}`),
          api<Dashboard>("/participant/tableau-de-bord"),
          favoritesOnly ? api<Favorite[]>("/participant/favoris") : Promise.resolve([]),
        ]);
        const allCourses = [...firstPage.content];
        for (let currentPage = 1; currentPage < firstPage.totalPages; currentPage += 1) {
          params.set("page", String(currentPage));
          allCourses.push(...(await api<CataloguePage>(`/catalogue?${params}`)).content);
        }
        const enrolledIds = new Set(dashboard.formations.map((item) => item.formationId));
        const favoriteIds = new Set(favorites.map((item) => item.formationId));
        const ordered = allCourses
          .filter((item) => !favoritesOnly || favoriteIds.has(item.id))
          .map((item, index) => ({item:{...item,inscrit:enrolledIds.has(item.id)}, index}))
          .sort((first, second) => Number(enrolledIds.has(first.item.id)) - Number(enrolledIds.has(second.item.id)) || first.index - second.index)
          .map(({item}) => item);
        const pageSize = 9;
        const content = ordered.slice(page * pageSize, (page + 1) * pageSize);
        setData({...firstPage, content, page, size: pageSize, totalElements: ordered.length, totalPages: Math.ceil(ordered.length / pageSize)});
      } else if (favoritesOnly) {
        setData({...await api<CataloguePage>(`/catalogue?${params}`), content: [], page: 0, totalElements: 0, totalPages: 0});
      } else {
        setData(await api<CataloguePage>(`/catalogue?${params}`));
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [categorie, favoritesOnly, langue, niveau, page, participant, query, resolved]);

  useEffect(() => {
    // Each filter or page transition deliberately starts a new remote request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (participant && new URLSearchParams(window.location.search).get("favoris") === "1") {
      // The query string is an explicit navigation intent from the participant dashboard.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFavoritesOnly(true);
    }
  }, [participant]);

  function search(event: FormEvent) {
    event.preventDefault();
    setPage(0);
    setQuery(draft);
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  function resetFilters() {
    setDraft(""); setQuery(""); setNiveau(""); setLangue(""); setCategorie(""); setFavoritesOnly(false); setPage(0);
  }

  const activeFilters = [
    query ? {key:"query", label:`Recherche : ${query}`, clear:()=>{setDraft("");setQuery("");setPage(0)}} : null,
    niveau ? {key:"niveau", label:`Niveau : ${{DEBUTANT:"Débutant",INTERMEDIAIRE:"Intermédiaire",AVANCE:"Avancé",TOUS_NIVEAUX:"Tous niveaux"}[niveau]??niveau}`, clear:()=>changeFilter(setNiveau,"")} : null,
    langue ? {key:"langue", label:`Langue : ${{fr:"Français",ar:"Arabe",en:"Anglais"}[langue]??langue}`, clear:()=>changeFilter(setLangue,"")} : null,
    categorie ? {key:"categorie", label:`Catégorie : ${categorie}`, clear:()=>changeFilter(setCategorie,"")} : null,
    favoritesOnly ? {key:"favorites",label:"Mes favoris",clear:()=>{setFavoritesOnly(false);setPage(0)}} : null,
  ].filter((item):item is NonNullable<typeof item>=>Boolean(item));

  return (
    <div className="catalogue-page">
      <PublicHeader />
      <main id="contenu-principal">
        <section className="catalogue-hero">
          <div className="container">
            <span className="eyebrow">Apprendre à votre rythme</span>
            <h1>Trouvez la formation qui vous fera avancer</h1>
            <Link className="btn btn-primary" href="/orientation"><Compass size={18}/> Trouver ma formation</Link>
            <p>Explorez les parcours publiés, comparez les niveaux et ouvrez leur premier module d’aperçu.</p>
          </div>
        </section>
        <section className="container catalogue-content" aria-label="Catalogue des formations">
          <form className="catalog-filter-panel" onSubmit={search}>
            <header className="catalog-filter-heading"><span className="catalog-filter-icon"><ListFilter aria-hidden="true" size={20}/></span><div><h2>Affiner votre recherche</h2><p>Combinez les critères pour trouver un parcours adapté.</p></div>{activeFilters.length>0&&<Button type="button" size="sm" variant="ghost" onClick={resetFilters}><RotateCcw size={16}/> Tout effacer</Button>}</header>
            <div className="catalog-search-primary">
              <label className="search-field"><span className="sr-only">Rechercher une formation</span><Search aria-hidden="true" size={19}/><input value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Rechercher par titre, catégorie ou mot-clé…"/></label>
              <Button type="submit"><Search size={18}/> Rechercher</Button>
            </div>
            <div className="catalog-filter-grid">
              <label><span>Niveau</span><select aria-label="Filtrer par niveau" value={niveau} onChange={event=>changeFilter(setNiveau,event.target.value)}><option value="">Tous les niveaux</option><option value="DEBUTANT">Débutant</option><option value="INTERMEDIAIRE">Intermédiaire</option><option value="AVANCE">Avancé</option><option value="TOUS_NIVEAUX">Tous niveaux</option></select></label>
              <label><span>Langue</span><select aria-label="Filtrer par langue" value={langue} onChange={event=>changeFilter(setLangue,event.target.value)}><option value="">Toutes les langues</option><option value="fr">Français</option><option value="ar">Arabe</option><option value="en">Anglais</option></select></label>
              <label><span>Catégorie</span><input value={categorie} onChange={event=>changeFilter(setCategorie,event.target.value)} placeholder="Ex. Développement" aria-label="Filtrer par catégorie"/></label>
              {participant&&<label className="favorite-filter"><span>Bibliothèque</span><span className="favorite-toggle"><input type="checkbox" checked={favoritesOnly} onChange={event=>{setFavoritesOnly(event.target.checked);setPage(0)}}/><Heart size={17} fill={favoritesOnly?"currentColor":"none"}/> Mes favoris</span></label>}
            </div>
            {activeFilters.length>0&&<div className="active-filter-list" aria-label="Filtres actifs">{activeFilters.map(item=><button type="button" key={item.key} onClick={item.clear}>{item.label}<X aria-hidden="true" size={14}/><span className="sr-only">Retirer ce filtre</span></button>)}</div>}
          </form>

          {loading && <PageSkeleton cards={6} />}
          {!loading && error && <ErrorState message={error} onRetry={load} />}
          {!loading && data && (
            <>
              <div className="result-summary" aria-live="polite">
                <span><strong>{data.totalElements}</strong> formation(s) publiée(s)</span>
                {participant&&!favoritesOnly&&<span>Nouvelles formations en premier</span>}
                {(query || niveau || langue || categorie || favoritesOnly) && <span>Filtres actifs</span>}
              </div>
              {data.content.length > 0 ? (
                <div className="course-grid">
                  {data.content.map((item) => <CourseCard course={item} key={item.id} />)}
                </div>
              ) : (
                <EmptyState
                  title="Aucun résultat"
                  description="Essayez une autre recherche ou élargissez vos filtres."
                  action={
                    <Button
                      variant="secondary"
                      onClick={resetFilters}
                    >
                      Réinitialiser les filtres
                    </Button>
                  }
                />
              )}
              <Pagination
                page={page}
                totalPages={data.totalPages}
                onPrevious={() => setPage((value) => value - 1)}
                onNext={() => setPage((value) => value + 1)}
              />
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
