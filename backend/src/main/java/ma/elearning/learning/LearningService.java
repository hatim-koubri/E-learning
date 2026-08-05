package ma.elearning.learning;

import ma.elearning.api.LearningDtos.*;
import ma.elearning.api.EngagementDtos.LearningPositionRequest;
import ma.elearning.common.BusinessException;
import ma.elearning.formation.*;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.engagement.*;
import ma.elearning.user.*;
import ma.elearning.virtualclass.ClasseRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.LocalDate;
import java.util.*;

@Service
public class LearningService {
 private final FormationRepository formations; private final RessourceRepository ressources;
 private final ChapitreRepository chapitres; private final InscriptionRepository inscriptions;
 private final ProgressionChapitreRepository progressions; private final UserRepository users;
 private final ObjectStorage storage; private final int expiry;
 private final OperationAccesRepository operations;
 private final EngagementService engagement;
 private final ClasseRepository classes;
 public LearningService(FormationRepository formations,RessourceRepository ressources,ChapitreRepository chapitres,
  InscriptionRepository inscriptions,ProgressionChapitreRepository progressions,UserRepository users,ObjectStorage storage,
  @Value("${app.storage.url-expiry-seconds:300}") int expiry,OperationAccesRepository operations,EngagementService engagement,
  ClasseRepository classes){
  this.formations=formations;this.ressources=ressources;this.chapitres=chapitres;this.inscriptions=inscriptions;
  this.progressions=progressions;this.users=users;this.storage=storage;this.expiry=expiry;
  this.operations=operations;
  this.engagement=engagement;
  this.classes=classes;
 }
 @Transactional
 public UpgradeResponse upgrade(String email,Long formationId,String key){
  if(key==null||key.isBlank()||key.length()>100)throw error(HttpStatus.BAD_REQUEST,"IDEMPOTENCY_KEY_REQUIRED","Une clé Idempotency-Key est obligatoire.");
  OperationAcces previous=operations.findByCleIdempotence(key).orElse(null);
  if(previous!=null){
   if(!previous.getInscription().getParticipant().getEmail().equalsIgnoreCase(email)||!previous.getInscription().getFormation().getId().equals(formationId))
    throw error(HttpStatus.CONFLICT,"IDEMPOTENCY_KEY_CONFLICT","Cette clé est déjà utilisée.");
   return upgradeResponse(previous);
  }
  Inscription i=inscriptions.findByParticipantEmailAndFormationId(email,formationId)
   .orElseThrow(()->error(HttpStatus.FORBIDDEN,"ENROLLMENT_REQUIRED","Achetez d'abord l'accès au contenu."));
  if(i.getTypeAcces()==TypeAcces.CONTENU_ET_CLASSES)
   throw error(HttpStatus.CONFLICT,"ALREADY_UPGRADED","L'accès avec classes est déjà actif.");
  Formation f=i.getFormation();
  if(f.getSupplementClasses().signum()==0&&!f.isClassesGratuites())
   throw error(HttpStatus.CONFLICT,"CLASSES_NOT_OFFERED","L'option avec classes n'est pas proposée.");
  OperationAcces op=new OperationAcces();op.setInscription(i);op.setCleIdempotence(key);
  op.setMontantSimule(f.getSupplementClasses());op.setTypeAccesObtenu(TypeAcces.CONTENU_ET_CLASSES);
  i.setTypeAcces(TypeAcces.CONTENU_ET_CLASSES);inscriptions.save(i);
  return upgradeResponse(operations.saveAndFlush(op));
 }
 @Transactional
 public UpgradeResponse enrollComplete(String email,Long formationId,String key){
  if(key==null||key.isBlank()||key.length()>100)throw error(HttpStatus.BAD_REQUEST,"IDEMPOTENCY_KEY_REQUIRED","Une clé Idempotency-Key est obligatoire.");
  OperationAcces previous=operations.findByCleIdempotence(key).orElse(null);
  if(previous!=null){if(!previous.getInscription().getParticipant().getEmail().equalsIgnoreCase(email)||!previous.getInscription().getFormation().getId().equals(formationId))throw error(HttpStatus.CONFLICT,"IDEMPOTENCY_KEY_CONFLICT","Cette clé est déjà utilisée.");return upgradeResponse(previous);}
  User u=user(email);if(!(u instanceof Participant p))throw error(HttpStatus.FORBIDDEN,"PARTICIPANT_ONLY","Seul un participant peut s'inscrire.");
  Formation f=published(formationId);if(f.getSupplementClasses().signum()==0&&!f.isClassesGratuites())throw error(HttpStatus.CONFLICT,"CLASSES_NOT_OFFERED","L'option avec classes n'est pas proposée.");
  Inscription i=inscriptions.findByParticipantEmailAndFormationId(email,formationId).orElse(null);
  if(i!=null){if(i.getTypeAcces()==TypeAcces.CONTENU_ET_CLASSES)throw error(HttpStatus.CONFLICT,"ALREADY_UPGRADED","L'accès avec classes est déjà actif.");return upgrade(email,formationId,key);}
  i=new Inscription();i.setParticipant(p);i.setFormation(f);i.setTypeAcces(TypeAcces.CONTENU_ET_CLASSES);i.setPrixPaye(f.getPrix().add(f.getSupplementClasses()));i=inscriptions.saveAndFlush(i);
  OperationAcces op=new OperationAcces();op.setInscription(i);op.setCleIdempotence(key);op.setMontantSimule(i.getPrixPaye());op.setTypeAccesObtenu(TypeAcces.CONTENU_ET_CLASSES);return upgradeResponse(operations.saveAndFlush(op));
 }

 @Transactional(readOnly=true)
 public CataloguePage catalogue(String q,String categorie,String langue,NiveauFormation niveau,int page,int size){
  int safeSize=Math.min(Math.max(size,1),50);
  Page<Formation> result=formations.catalogue(clean(q),clean(categorie),clean(langue),niveau,
   PageRequest.of(Math.max(page,0),safeSize,Sort.by(Sort.Direction.ASC,"titre").and(Sort.by("id"))));
  return new CataloguePage(result.getContent().stream().map(this::item).toList(),result.getNumber(),result.getSize(),
   result.getTotalElements(),result.getTotalPages());
 }
 @Transactional(readOnly=true)
 public CatalogueDetail detail(Long id,String email){
  Formation f=published(id); boolean full=hasFullAccess(f,email);
  Inscription inscription=email==null?null:inscriptions.findByParticipantEmailAndFormationId(email,id).orElse(null);
  boolean classesDisponibles=f.getSupplementClasses().signum()>0||f.isClassesGratuites();
  int chapterCount=f.getModules().stream().mapToInt(m->m.getChapitres().size()).sum();
  return new CatalogueDetail(f.getId(),f.getTitre(),f.getDescription(),url(f.getImageCouvertureKey()),f.getLangue(),
   f.getNiveau(),f.getCategorie(),f.getPrix(),f.getSupplementClasses(),f.getPrix().add(f.getSupplementClasses()),
   f.isClassesGratuites(),classesDisponibles,"DH",f.getFormateur().getId(),f.getFormateur().getNom(),
   f.getModules().size(),chapterCount,inscription!=null,inscription==null?null:inscription.getTypeAcces(),
   f.getModules().stream().map(m->module(m,full)).toList());
 }
 @Transactional
 public InscriptionResponse enroll(String email,Long formationId){
  User user=user(email); if(!(user instanceof Participant participant))
   throw error(HttpStatus.FORBIDDEN,"PARTICIPANT_ONLY","Seul un participant peut s'inscrire.");
  Formation formation=published(formationId);
  Inscription existing=inscriptions.findByParticipantEmailAndFormationId(email,formationId).orElse(null);
  if(existing!=null)return response(existing);
  Inscription i=new Inscription();i.setParticipant(participant);i.setFormation(formation);i.setPrixPaye(formation.getPrix());
  try{return response(inscriptions.saveAndFlush(i));}
  catch(DataIntegrityViolationException ex){
   return inscriptions.findByParticipantEmailAndFormationId(email,formationId).map(this::response).orElseThrow(()->ex);
  }
 }
 @Transactional
 public ResourceAccess resource(String email,Long formationId,Long resourceId){
  Formation f=published(formationId);
  RessourcePedagogique r=ressources.findById(resourceId).orElseThrow(this::notFound);
  if(!r.getChapitre().getModule().getFormation().getId().equals(formationId))throw notFound();
  boolean preview=r.getChapitre().getModule().isApercuGratuit();
  boolean full=hasFullAccess(f,email);
  if(!preview&&!full)throw error(HttpStatus.FORBIDDEN,"CONTENT_LOCKED","Une inscription active est requise.");
  String accessUrl=r.getType()==ResourceType.YOUTUBE?r.getUrlYoutube():storage.temporaryUrl(r.getCleStockage());
  if(email!=null&&isParticipantEnrolled(email,formationId))engagement.recordResourceConsultation(email,formationId,r);
  return new ResourceAccess(r.getId(),r.getType(),accessUrl,expiry,full&&r.isTelechargeable(),
   r.getTitre(),r.getTypeMime(),r.getTaille());
 }
 @Transactional
 public ProgressResponse progress(String email,Long formationId,Long chapterId,boolean completed,int seconds){
  Inscription i=inscriptions.findByParticipantEmailAndFormationId(email,formationId)
   .orElseThrow(()->error(HttpStatus.FORBIDDEN,"ENROLLMENT_REQUIRED","Une inscription active est requise."));
  Chapitre chapter=chapitres.findById(chapterId).orElseThrow(this::notFound);
  if(!chapter.getModule().getFormation().getId().equals(formationId))throw notFound();
  List<Chapitre> ordered=i.getFormation().getModules().stream().flatMap(m->m.getChapitres().stream()).toList();
  int index=ordered.indexOf(chapter);
  if(completed&&index>0){
   Set<Long> done=progressions.findByInscriptionId(i.getId()).stream().filter(ProgressionChapitre::isTermine)
    .map(p->p.getChapitre().getId()).collect(java.util.stream.Collectors.toSet());
   if(!done.contains(ordered.get(index-1).getId()))throw error(HttpStatus.CONFLICT,"PREREQUISITE_REQUIRED","Terminez le chapitre précédent.");
  }
  ProgressionChapitre p=progressions.findByInscriptionIdAndChapitreId(i.getId(),chapterId).orElseGet(()->{
   ProgressionChapitre n=new ProgressionChapitre();n.setInscription(i);n.setChapitre(chapter);return n;});
  p.setTermine(completed);p.setPositionVideoSecondes(Math.max(seconds,0));progressions.saveAndFlush(p);
  long count=progressions.findByInscriptionId(i.getId()).stream().filter(ProgressionChapitre::isTermine).count();
  BigDecimal percent=ordered.isEmpty()?BigDecimal.ZERO:BigDecimal.valueOf(count*100.0/ordered.size()).setScale(2,RoundingMode.HALF_UP);
  i.setProgression(percent);inscriptions.save(i);
  engagement.recordPosition(email,formationId,new LearningPositionRequest(chapter.getModule().getId(),chapterId,null));
  if(completed)engagement.recordActivity(email,formationId,ActivityType.CHAPITRE_TERMINE,"chapter:"+chapterId,10);
  return new ProgressResponse(formationId,chapterId,p.isTermine(),p.getPositionVideoSecondes(),percent);
 }
 public boolean hasFullAccess(Formation f,String email){
  if(email==null)return false; User u=users.findByEmail(email).orElse(null); if(u==null)return false;
  if(u.getRole()==Role.ADMIN)return true;
  if(u.getRole()==Role.FORMATEUR)return f.getFormateur().getEmail().equalsIgnoreCase(email);
  return inscriptions.existsByParticipantEmailAndFormationIdAndStatutIn(email,f.getId(),List.of(InscriptionStatut.ACTIVE,InscriptionStatut.CONFIRMEE));
 }
 @Transactional(readOnly=true) public List<MyFormation> mine(String email){return inscriptions.findByParticipantEmailOrderByDateInscriptionDesc(email).stream().map(i->new MyFormation(i.getId(),i.getFormation().getId(),i.getFormation().getTitre(),i.getTypeAcces(),i.getStatut(),i.getProgression(),i.getPrixPaye(),i.getDevise())).toList();}
 private boolean isParticipantEnrolled(String email,Long id){return email!=null&&inscriptions.findByParticipantEmailAndFormationId(email,id).isPresent();}
 private CatalogueItem item(Formation f){int chapters=f.getModules().stream().mapToInt(m->m.getChapitres().size()).sum();
  boolean offer=f.getSupplementClasses().signum()>0||f.isClassesGratuites();
  boolean activeClass=classes.existsByFormationIdAndStatutAndDateFinGreaterThanEqual(f.getId(),"ACTIVE",LocalDate.now());
  return new CatalogueItem(f.getId(),f.getTitre(),f.getDescription(),url(f.getImageCouvertureKey()),f.getLangue(),f.getNiveau(),
   f.getCategorie(),f.getPrix(),f.getSupplementClasses(),f.getPrix().add(f.getSupplementClasses()),
   offer,activeClass,f.getFormateur().getNom(),f.getModules().size(),chapters);}
 private PublicModule module(FormationModule m,boolean full){boolean locked=!full&&!m.isApercuGratuit();
  return new PublicModule(m.getId(),m.getTitre(),m.getDescription(),m.getPosition(),m.isApercuGratuit(),locked,
   m.getChapitres().stream().map(c->chapter(c,locked)).toList());}
 private PublicChapter chapter(Chapitre c,boolean locked){return new PublicChapter(c.getId(),c.getTitre(),c.getDescription(),c.getPosition(),locked,
  c.getRessources().stream().map(r->new PublicResource(r.getId(),r.getType(),r.getTitre(),r.getPosition(),locked,null)).toList());}
 private String url(String key){return key==null?null:storage.temporaryUrl(key);}
 private Formation published(Long id){return formations.findOneByIdAndStatut(id,FormationStatus.PUBLIEE).orElseThrow(this::notFound);}
 private User user(String email){return users.findByEmail(email).orElseThrow(()->error(HttpStatus.UNAUTHORIZED,"UNAUTHORIZED","Authentification requise."));}
 private String clean(String v){return v==null?"":v.trim();}
 private InscriptionResponse response(Inscription i){return new InscriptionResponse(i.getId(),i.getFormation().getId(),i.getDateInscription(),i.getStatut(),i.getTypeAcces(),i.getProgression(),i.getPrixPaye(),i.getDevise(),i.getModePaiement());}
 private UpgradeResponse upgradeResponse(OperationAcces o){return new UpgradeResponse(o.getId(),o.getInscription().getId(),o.getMontantSimule(),o.getDevise(),o.getDateOperation(),o.getTypeAccesObtenu(),o.getModePaiement(),o.getStatut());}
 private BusinessException notFound(){return error(HttpStatus.NOT_FOUND,"FORMATION_NOT_FOUND","Formation ou contenu introuvable.");}
 private BusinessException error(HttpStatus status,String code,String message){return new BusinessException(status,code,message);}
}
