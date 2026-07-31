"use client";

import {Heart, Search, SlidersHorizontal} from "lucide-react";
import {FormEvent, useCallback, useEffect, useState} from "react";
import {CourseCard} from "@/components/CourseCard";
import {Footer} from "@/components/Footer";
import {PublicHeader} from "@/components/PublicHeader";
import {Button, EmptyState, ErrorState, PageSkeleton, Pagination} from "@/components/ui";
import {api, currentUser} from "@/lib/api";
import type {Favorite} from "@/lib/engagement";
import type {CataloguePage} from "@/lib/learning";

export default function Catalogue() {
  const [data, setData] = useState<CataloguePage | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [niveau, setNiveau] = useState("");
  const [categorie, setCategorie] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const participant = currentUser()?.role === "PARTICIPANT";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({q: query, page: favoritesOnly ? "0" : String(page), size: favoritesOnly ? "50" : "9"});
    if (niveau) params.set("niveau", niveau);
    if (categorie) params.set("categorie", categorie);
    try {
      const catalogue = await api<CataloguePage>(`/catalogue?${params}`);
      if (favoritesOnly) {
        const favoriteIds = new Set((await api<Favorite[]>("/participant/favoris")).map((item) => item.formationId));
        const content = catalogue.content.filter((item) => favoriteIds.has(item.id));
        setData({...catalogue, content, totalElements: content.length, totalPages: content.length ? 1 : 0});
      } else {
        setData(catalogue);
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [categorie, favoritesOnly, niveau, page, query]);

  useEffect(() => {
    // Each filter or page transition deliberately starts a new remote request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function search(event: FormEvent) {
    event.preventDefault();
    setPage(0);
    setQuery(draft);
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  return (
    <div className="catalogue-page">
      <PublicHeader />
      <main id="contenu-principal">
        <section className="catalogue-hero">
          <div className="container">
            <span className="eyebrow">Apprendre à votre rythme</span>
            <h1>Trouvez la formation qui vous fera avancer</h1>
            <p>Explorez les parcours publiés, comparez les niveaux et ouvrez leur premier module d’aperçu.</p>
          </div>
        </section>
        <section className="container catalogue-content" aria-label="Catalogue des formations">
          <form className="catalog-search" onSubmit={search}>
            <div className="search-field">
              <Search aria-hidden="true" size={19} />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Titre, catégorie ou mot-clé"
                aria-label="Rechercher une formation"
              />
            </div>
            <select
              aria-label="Filtrer par niveau"
              value={niveau}
              onChange={(event) => changeFilter(setNiveau, event.target.value)}
            >
              <option value="">Tous les niveaux</option>
              <option value="DEBUTANT">Débutant</option>
              <option value="INTERMEDIAIRE">Intermédiaire</option>
              <option value="AVANCE">Avancé</option>
              <option value="TOUS_NIVEAUX">Tous niveaux</option>
            </select>
            <input
              value={categorie}
              onChange={(event) => setCategorie(event.target.value)}
              placeholder="Catégorie"
              aria-label="Filtrer par catégorie"
            />
            <Button type="submit"><SlidersHorizontal size={18} /> Rechercher</Button>
            {participant && (
              <label className="favorite-filter">
                <input type="checkbox" checked={favoritesOnly} onChange={(event) => {setFavoritesOnly(event.target.checked); setPage(0);}} />
                <Heart size={16} fill={favoritesOnly ? "currentColor" : "none"} /> Mes favoris
              </label>
            )}
          </form>

          {loading && <PageSkeleton cards={6} />}
          {!loading && error && <ErrorState message={error} onRetry={load} />}
          {!loading && data && (
            <>
              <div className="result-summary">
                <span><strong>{data.totalElements}</strong> formation(s) publiée(s)</span>
                {(query || niveau || categorie || favoritesOnly) && <span>Filtres actifs</span>}
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
                      onClick={() => {setDraft(""); setQuery(""); setNiveau(""); setCategorie(""); setFavoritesOnly(false);}}
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
