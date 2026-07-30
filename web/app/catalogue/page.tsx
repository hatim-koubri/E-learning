"use client";

import {Search, SlidersHorizontal} from "lucide-react";
import {FormEvent, useCallback, useEffect, useState} from "react";
import {CourseCard} from "@/components/CourseCard";
import {Footer} from "@/components/Footer";
import {PublicHeader} from "@/components/PublicHeader";
import {Button, EmptyState, ErrorState, PageSkeleton, Pagination} from "@/components/ui";
import {api} from "@/lib/api";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({q: query, page: String(page), size: "9"});
    if (niveau) params.set("niveau", niveau);
    if (categorie) params.set("categorie", categorie);
    try {
      setData(await api<CataloguePage>(`/catalogue?${params}`));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [categorie, niveau, page, query]);

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
          </form>

          {loading && <PageSkeleton cards={6} />}
          {!loading && error && <ErrorState message={error} onRetry={load} />}
          {!loading && data && (
            <>
              <div className="result-summary">
                <span><strong>{data.totalElements}</strong> formation(s) publiée(s)</span>
                {(query || niveau || categorie) && <span>Filtres actifs</span>}
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
                      onClick={() => {setDraft(""); setQuery(""); setNiveau(""); setCategorie("");}}
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
