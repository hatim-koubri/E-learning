package ma.elearning.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import ma.elearning.formation.NiveauFormation;
import ma.elearning.formation.ResourceType;
import ma.elearning.learning.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class LearningDtos {
 private LearningDtos(){}
 public record CatalogueItem(Long id,String titre,String description,String imageUrl,String langue,
  NiveauFormation niveau,String categorie,BigDecimal prix,String formateur,int nombreModules,int nombreChapitres){}
 public record CataloguePage(List<CatalogueItem> content,int page,int size,long totalElements,int totalPages){}
 public record PublicResource(Long id,ResourceType type,String titre,int ordre,boolean verrouille,String url){}
 public record PublicChapter(Long id,String titre,String description,int ordre,boolean verrouille,List<PublicResource> ressources){}
 public record PublicModule(Long id,String titre,String description,int ordre,boolean apercuGratuit,boolean verrouille,List<PublicChapter> chapitres){}
 public record CatalogueDetail(Long id,String titre,String description,String imageUrl,String langue,NiveauFormation niveau,
  String categorie,BigDecimal prix,String devise,Long formateurId,String formateur,int nombreModules,int nombreChapitres,
  boolean inscrit,List<PublicModule> modules){}
 public record InscriptionResponse(Long id,Long formationId,Instant dateInscription,InscriptionStatut statut,
  TypeAcces typeAcces,BigDecimal progression,BigDecimal prixPaye,String devise,ModePaiement modePaiement){}
 public record ProgressRequest(@NotNull Boolean termine,@Min(0) int positionVideoSecondes){}
 public record ProgressResponse(Long formationId,Long chapitreId,boolean termine,int positionVideoSecondes,BigDecimal pourcentage){}
 public record ResourceAccess(Long resourceId,ResourceType type,String url,int expiresInSeconds,boolean telechargeable){}
 public record UpgradeResponse(Long operationId,Long inscriptionId,BigDecimal montant,String devise,Instant date,
  TypeAcces typeAcces,ModePaiement mode,String statut){}
 public record MyFormation(Long inscriptionId,Long formationId,String titre,TypeAcces typeAcces,
  InscriptionStatut statut,BigDecimal progression,BigDecimal prixPaye,String devise){}
}
