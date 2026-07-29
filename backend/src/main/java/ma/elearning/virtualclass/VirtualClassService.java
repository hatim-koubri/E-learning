package ma.elearning.virtualclass;
import ma.elearning.api.VirtualClassDtos.*; import ma.elearning.common.*; import ma.elearning.formation.*;
import ma.elearning.learning.*; import ma.elearning.user.*; import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.net.URLEncoder; import java.nio.charset.StandardCharsets; import java.time.*; import java.util.*;
@Service
public class VirtualClassService {
 private final ClasseRepository classes; private final ClasseMembreRepository membres; private final SeanceVirtuelleRepository seances;
 private final FormationRepository formations; private final InscriptionRepository inscriptions; private final UserRepository users; private final String jitsi;
 public VirtualClassService(ClasseRepository c,ClasseMembreRepository m,SeanceVirtuelleRepository s,FormationRepository f,
  InscriptionRepository i,UserRepository u,@Value("${app.jitsi.base-url:https://meet.jit.si}")String j){classes=c;membres=m;seances=s;formations=f;inscriptions=i;users=u;jitsi=j.replaceAll("/+$","");}
 @Transactional public ClasseResponse create(String email,ClasseRequest r){
  Formation f=formations.findByIdAndFormateurEmail(r.formationId(),email).orElseThrow(this::notFound);
  if(f.getStatut()!=FormationStatus.PUBLIEE)throw error(HttpStatus.CONFLICT,"FORMATION_NOT_PUBLISHED","La formation doit être publiée.");
  validate(r.dateDebut(),r.dateFin()); Classe c=new Classe();c.setFormation(f);apply(c,r);return dto(classes.saveAndFlush(c));
 }
 @Transactional(readOnly=true) public List<ClasseResponse> trainerClasses(String email){return classes.findByFormationFormateurEmailOrderByDateDebutDesc(email).stream().map(this::dto).toList();}
 @Transactional(readOnly=true) public List<EligibleParticipant> eligible(String email,Long classId){Classe c=owned(email,classId);return inscriptions.findByFormationIdAndTypeAcces(c.getFormation().getId(),TypeAcces.CONTENU_ET_CLASSES).stream().filter(i->!membres.existsByClasseIdAndParticipantEmailAndStatut(classId,i.getParticipant().getEmail(),"ACCEPTE")).map(i->new EligibleParticipant(i.getParticipant().getId(),i.getParticipant().getNom(),i.getParticipant().getEmail())).toList();}
 @Transactional public ClasseResponse update(String email,Long id,ClasseRequest r){Classe c=owned(email,id);if(!c.getFormation().getId().equals(r.formationId()))throw error(HttpStatus.BAD_REQUEST,"FORMATION_IMMUTABLE","La formation d'une classe ne peut pas changer.");validate(r.dateDebut(),r.dateFin());apply(c,r);return dto(classes.saveAndFlush(c));}
 @Transactional public ClasseResponse addMember(String email,Long id,Long participantId){
  Classe c=owned(email,id);if(membres.countByClasseIdAndStatut(id,"ACCEPTE")>=c.getCapacite())throw error(HttpStatus.CONFLICT,"CLASS_FULL","La classe est complète.");
  User u=users.findById(participantId).orElseThrow(this::notFound);if(!(u instanceof Participant p))throw error(HttpStatus.BAD_REQUEST,"PARTICIPANT_REQUIRED","Utilisateur participant requis.");
  Inscription i=inscriptions.findByParticipantEmailAndFormationId(p.getEmail(),c.getFormation().getId()).orElseThrow(()->error(HttpStatus.FORBIDDEN,"NOT_ELIGIBLE","Inscription requise."));
  if(i.getTypeAcces()!=TypeAcces.CONTENU_ET_CLASSES)throw error(HttpStatus.FORBIDDEN,"NOT_ELIGIBLE","L'accès CONTENU_ET_CLASSES est requis.");
  ClasseMembre existing=membres.findByClasseIdAndParticipantId(id,participantId).orElse(null);if(existing==null){existing=new ClasseMembre();existing.setClasse(c);existing.setParticipant(p);membres.saveAndFlush(existing);}return dto(c);
 }
 @Transactional public SessionResponse schedule(String email,Long classId,SessionRequest r){Classe c=owned(email,classId);validate(r.dateDebut(),r.dateFin(),r.fuseauHoraire());SeanceVirtuelle s=new SeanceVirtuelle();s.setClasse(c);apply(s,r);s.setIdentifiantSalle("elearning-"+UUID.randomUUID());return session(seances.saveAndFlush(s));}
 @Transactional public SessionResponse updateSession(String email,Long id,SessionRequest r){SeanceVirtuelle s=seances.findByIdAndClasseFormationFormateurEmail(id,email).orElseThrow(this::notFound);if("ANNULEE".equals(s.getStatut()))throw error(HttpStatus.CONFLICT,"SESSION_CANCELLED","Une séance annulée ne peut plus être modifiée.");validate(r.dateDebut(),r.dateFin(),r.fuseauHoraire());apply(s,r);return session(seances.saveAndFlush(s));}
 @Transactional public SessionResponse cancel(String email,Long id){SeanceVirtuelle s=seances.findByIdAndClasseFormationFormateurEmail(id,email).orElseThrow(this::notFound);s.setStatut("ANNULEE");return session(seances.saveAndFlush(s));}
 @Transactional(readOnly=true) public List<ClasseResponse> mine(String email){return membres.findByParticipantEmailAndStatut(email,"ACCEPTE").stream().map(ClasseMembre::getClasse).distinct().map(this::dto).toList();}
 @Transactional(readOnly=true) public JoinResponse join(String email,Long sessionId,boolean trainer){
  SeanceVirtuelle s=seances.findById(sessionId).orElseThrow(this::notFound);boolean owner=s.getClasse().getFormation().getFormateur().getEmail().equalsIgnoreCase(email);
  if(!trainer){Inscription i=inscriptions.findByParticipantEmailAndFormationId(email,s.getClasse().getFormation().getId()).orElseThrow(()->error(HttpStatus.FORBIDDEN,"ACCESS_DENIED","Accès refusé."));
   if(i.getTypeAcces()!=TypeAcces.CONTENU_ET_CLASSES||!membres.existsByClasseIdAndParticipantEmailAndStatut(s.getClasse().getId(),email,"ACCEPTE"))throw error(HttpStatus.FORBIDDEN,"ACCESS_DENIED","Vous n'êtes pas membre de cette classe.");}
  else if(!owner)throw notFound();
  if(!"PLANIFIEE".equals(s.getStatut()))throw error(HttpStatus.CONFLICT,"SESSION_UNAVAILABLE","Cette séance est inaccessible.");
  String url=jitsi+"/"+URLEncoder.encode(s.getIdentifiantSalle(),StandardCharsets.UTF_8);return new JoinResponse(s.getId(),s.getIdentifiantSalle(),jitsi,url);
 }
 private void apply(Classe c,ClasseRequest r){c.setNom(r.nom().trim());c.setDescription(r.description());c.setCapacite(r.capacite());c.setDateDebut(r.dateDebut());c.setDateFin(r.dateFin());}
 private void apply(SeanceVirtuelle s,SessionRequest r){s.setTitre(r.titre().trim());s.setDateDebut(r.dateDebut());s.setDateFin(r.dateFin());s.setFuseauHoraire(ZoneId.of(r.fuseauHoraire()).getId());}
 private void validate(LocalDate a,LocalDate b){if(b.isBefore(a))throw error(HttpStatus.BAD_REQUEST,"INVALID_DATES","La date de fin doit suivre la date de début.");}
 private void validate(Instant a,Instant b,String z){try{ZoneId.of(z);}catch(Exception e){throw error(HttpStatus.BAD_REQUEST,"INVALID_TIMEZONE","Fuseau horaire invalide.");}if(!b.isAfter(a))throw error(HttpStatus.BAD_REQUEST,"INVALID_DATES","La fin doit être postérieure au début.");}
 private Classe owned(String e,Long id){return classes.findByIdAndFormationFormateurEmail(id,e).orElseThrow(this::notFound);}
 private ClasseResponse dto(Classe c){return new ClasseResponse(c.getId(),c.getFormation().getId(),c.getFormation().getTitre(),c.getNom(),c.getDescription(),c.getCapacite(),c.getDateDebut(),c.getDateFin(),c.getStatut(),c.getSeances().stream().map(this::session).toList(),membres.findByClasseId(c.getId()).stream().map(m->new MemberResponse(m.getParticipant().getId(),m.getParticipant().getNom(),m.getParticipant().getEmail(),m.getStatut())).toList());}
 private SessionResponse session(SeanceVirtuelle s){return new SessionResponse(s.getId(),s.getTitre(),s.getDateDebut(),s.getDateFin(),s.getFuseauHoraire(),s.getStatut());}
 private BusinessException notFound(){return error(HttpStatus.NOT_FOUND,"CLASS_NOT_FOUND","Classe ou séance introuvable.");} private BusinessException error(HttpStatus s,String c,String m){return new BusinessException(s,c,m);}
}
