package ma.elearning.formation;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
import java.util.List;
import java.util.Optional;

public interface FormationRepository extends JpaRepository<Formation, Long> {
    long countByFormateurId(Long formateurId);
    long countByStatut(FormationStatus statut);
    interface StatusCount { String getLabel(); long getTotal(); }
    @Query("select cast(f.statut as string) as label, count(f) as total from Formation f group by f.statut")
    List<StatusCount> countByStatusGroup();
    List<Formation> findByFormateurEmailOrderByUpdatedAtDesc(String email);
    Optional<Formation> findByIdAndFormateurEmail(Long id, String email);
    @EntityGraph(attributePaths = {"formateur"})
    @Query("select f from Formation f where f.statut = ma.elearning.formation.FormationStatus.PUBLIEE " +
            "and (:q = '' or lower(f.titre) like lower(concat('%',:q,'%')) or lower(f.categorie) like lower(concat('%',:q,'%'))) " +
            "and (:categorie = '' or lower(f.categorie) = lower(:categorie)) " +
            "and (:langue = '' or lower(f.langue) = lower(:langue)) " +
            "and (:niveau is null or f.niveau = :niveau)")
    Page<Formation> catalogue(String q, String categorie, String langue, NiveauFormation niveau, Pageable pageable);
    Optional<Formation> findOneByIdAndStatut(Long id, FormationStatus statut);
    @EntityGraph(attributePaths = {"formateur"})
    List<Formation> findByStatutOrderByUpdatedAtDesc(FormationStatus statut);
    @EntityGraph(attributePaths = {"formateur", "modules"})
    @Query("select distinct f from Formation f where f.statut = ma.elearning.formation.FormationStatus.PUBLIEE order by f.id asc")
    List<Formation> orientationCandidates();
    @EntityGraph(attributePaths = {"formateur"})
    List<Formation> findByFormateurIdAndStatutOrderByUpdatedAtDesc(Long formateurId, FormationStatus statut);
}
