package ma.elearning.virtualclass;

import ma.elearning.api.VirtualClassDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.engagement.*;
import ma.elearning.formation.*;
import ma.elearning.learning.*;
import ma.elearning.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;

@Service
public class VirtualClassService {
    private final ClasseRepository classes;
    private final ClasseMembreRepository membres;
    private final SeanceVirtuelleRepository seances;
    private final FormationRepository formations;
    private final InscriptionRepository inscriptions;
    private final UserRepository users;
    private final FormateurRepository formateurs;
    private final String jitsi;
    private final EngagementService engagement;
    private final Clock clock;

    public VirtualClassService(ClasseRepository classes, ClasseMembreRepository membres,
                               SeanceVirtuelleRepository seances, FormationRepository formations,
                               InscriptionRepository inscriptions, UserRepository users,
                               FormateurRepository formateurs,
                               @Value("${app.jitsi.base-url:https://meet.jit.si}") String jitsi,
                               EngagementService engagement, Clock clock) {
        this.classes = classes; this.membres = membres; this.seances = seances;
        this.formations = formations; this.inscriptions = inscriptions; this.users = users; this.formateurs = formateurs;
        this.jitsi = jitsi.replaceAll("/+$", ""); this.engagement = engagement; this.clock = clock;
    }

    @Transactional
    public ClasseResponse create(String email, ClasseRequest request) {
        Formation formation = formations.findByIdAndFormateurEmail(request.formationId(), email).orElseThrow(this::notFound);
        if (formation.getStatut() != FormationStatus.PUBLIEE)
            throw error(HttpStatus.CONFLICT, "FORMATION_NOT_PUBLISHED", "La formation doit être publiée.");
        if (!classOffer(formation))
            throw error(HttpStatus.CONFLICT, "CLASSES_NOT_OFFERED", "Cette formation ne propose pas d’offre avec classes.");
        validate(request.dateDebut(), request.dateFin());
        Classe classe = new Classe(); classe.setFormation(formation); apply(classe, request);
        return dto(classes.saveAndFlush(classe));
    }

    @Transactional(readOnly = true)
    public List<ClasseResponse> trainerClasses(String email) {
        return classes.findByFormationFormateurEmailOrderByDateDebutDesc(email).stream().map(this::dto).toList();
    }

    @Transactional(readOnly = true)
    public List<EligibleParticipant> eligible(String email, Long classId) {
        Classe classe = owned(email, classId);
        return inscriptions.findByFormationIdAndTypeAcces(classe.getFormation().getId(), TypeAcces.CONTENU_ET_CLASSES).stream()
                .filter(value -> List.of(InscriptionStatut.ACTIVE, InscriptionStatut.CONFIRMEE).contains(value.getStatut()))
                .filter(value -> value.getParticipant().getStatut() == AccountStatus.ACTIF)
                .filter(value -> membres.findByClasseIdAndParticipantId(classId, value.getParticipant().getId()).isEmpty())
                .map(value -> new EligibleParticipant(value.getParticipant().getId(), value.getParticipant().getNom(), value.getParticipant().getEmail()))
                .toList();
    }

    @Transactional
    public ClasseResponse update(String email, Long id, ClasseRequest request) {
        Classe classe = locked(email, id);
        if (!classe.getFormation().getId().equals(request.formationId()))
            throw error(HttpStatus.BAD_REQUEST, "FORMATION_IMMUTABLE", "La formation d’une classe ne peut pas changer.");
        validate(request.dateDebut(), request.dateFin());
        long accepted = membres.countByClasseIdAndStatut(id, "ACCEPTE");
        if (request.capacite() < accepted)
            throw error(HttpStatus.CONFLICT, "CAPACITY_BELOW_MEMBERS", "La capacité ne peut pas être inférieure aux membres acceptés.");
        if (classe.getSeances().stream().filter(value -> "PLANIFIEE".equals(value.getStatut()))
                .anyMatch(value -> sessionOutsideDates(value, request.dateDebut(), request.dateFin())))
            throw error(HttpStatus.CONFLICT, "CLASS_DATES_EXCLUDE_SESSIONS", "Les nouvelles dates excluent une séance planifiée.");
        apply(classe, request);
        return dto(classes.saveAndFlush(classe));
    }

    @Transactional
    public ClasseResponse addMember(String email, Long id, Long participantId) {
        Classe classe = locked(email, id);
        if (membres.countByClasseIdAndStatut(id, "ACCEPTE") >= classe.getCapacite())
            throw error(HttpStatus.CONFLICT, "CLASS_FULL", "La classe est complète.");
        User user = users.findById(participantId).orElseThrow(this::notFound);
        if (!(user instanceof Participant participant))
            throw error(HttpStatus.BAD_REQUEST, "PARTICIPANT_REQUIRED", "Utilisateur participant requis.");
        if (participant.getStatut() != AccountStatus.ACTIF)
            throw error(HttpStatus.FORBIDDEN, "NOT_ELIGIBLE", "Le participant doit être actif.");
        Inscription enrollment = inscriptions.findByParticipantEmailAndFormationId(participant.getEmail(), classe.getFormation().getId())
                .orElseThrow(() -> error(HttpStatus.FORBIDDEN, "NOT_ELIGIBLE", "Inscription requise."));
        if (!List.of(InscriptionStatut.ACTIVE, InscriptionStatut.CONFIRMEE).contains(enrollment.getStatut()) ||
                enrollment.getTypeAcces() != TypeAcces.CONTENU_ET_CLASSES)
            throw error(HttpStatus.FORBIDDEN, "NOT_ELIGIBLE", "Une inscription active CONTENU_ET_CLASSES est requise.");
        ClasseMembre existing = membres.findByClasseIdAndParticipantId(id, participantId).orElse(null);
        if (existing == null) {
            existing = new ClasseMembre(); existing.setClasse(classe); existing.setParticipant(participant); membres.saveAndFlush(existing);
            engagement.sendNotification(participant.getEmail(), NotificationCategory.CLASSE,
                    "class-assignment:" + classe.getId(), "Affectation à une classe",
                    "Vous avez été affecté à " + classe.getNom() + " pour " + classe.getFormation().getTitre() + ".",
                    "/participant/classes", false);
        }
        return dto(classe);
    }

    @Transactional
    public SessionResponse schedule(String email, Long classId, SessionRequest request) {
        lockTrainer(email); Classe classe = locked(email, classId); validateSession(classe, email, null, request);
        SeanceVirtuelle session = new SeanceVirtuelle(); session.setClasse(classe); apply(session, request);
        session.setIdentifiantSalle("elearning-" + UUID.randomUUID()); session = seances.saveAndFlush(session);
        for (ClasseMembre member : membres.findByClasseId(classId)) if ("ACCEPTE".equals(member.getStatut()))
            engagement.sendNotification(member.getParticipant().getEmail(), NotificationCategory.CLASSE,
                    "class-session-scheduled:" + session.getId(), "Nouvelle séance planifiée",
                    session.getTitre() + " est planifiée le " + session.getDateDebut() + ".", "/participant/classes", false);
        return session(session);
    }

    @Transactional
    public SessionResponse updateSession(String email, Long id, SessionRequest request) {
        lockTrainer(email);
        SeanceVirtuelle session = seances.findByIdAndClasseFormationFormateurEmail(id, email).orElseThrow(this::notFound);
        Classe classe = locked(email, session.getClasse().getId());
        if ("ANNULEE".equals(session.getStatut()))
            throw error(HttpStatus.CONFLICT, "SESSION_CANCELLED", "Une séance annulée ne peut plus être modifiée.");
        if (sameSession(session,request)) return session(session);
        validateSession(classe, email, id, request); apply(session, request);
        session.setVersionMetier(session.getVersionMetier()+1);session=seances.saveAndFlush(session);
        notifyMembers(classe,"class-session-rescheduled:"+session.getId()+":"+session.getVersionMetier(),
                "Séance replanifiée",session.getTitre()+" est replanifiée le "+session.getDateDebut()+".");
        return session(session);
    }

    @Transactional public SessionResponse cancel(String email, Long id) {
        SeanceVirtuelle session = seances.findByIdAndClasseFormationFormateurEmail(id, email).orElseThrow(this::notFound);
        if("ANNULEE".equals(session.getStatut()))return session(session);
        session.setStatut("ANNULEE");session.setVersionMetier(session.getVersionMetier()+1);session=seances.saveAndFlush(session);
        notifyMembers(session.getClasse(),"class-session-cancelled:"+session.getId()+":"+session.getVersionMetier(),
                "Séance annulée",session.getTitre()+" a été annulée.");return session(session);
    }

    @Transactional(readOnly = true) public List<ParticipantClasseResponse> mine(String email) {
        return membres.findByParticipantEmailAndStatut(email, "ACCEPTE").stream().map(ClasseMembre::getClasse)
                .distinct().map(this::participantDto).toList();
    }

    @Transactional
    public JoinResponse join(String email, Long sessionId, boolean trainer) {
        SeanceVirtuelle session = seances.findLockedById(sessionId).orElseThrow(this::notFound);
        boolean owner = session.getClasse().getFormation().getFormateur().getEmail().equalsIgnoreCase(email);
        if (!trainer) {
            Inscription enrollment = inscriptions.findByParticipantEmailAndFormationId(email, session.getClasse().getFormation().getId())
                    .orElseThrow(() -> error(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Accès refusé."));
            if (enrollment.getTypeAcces() != TypeAcces.CONTENU_ET_CLASSES ||
                    !membres.existsByClasseIdAndParticipantEmailAndStatut(session.getClasse().getId(), email, "ACCEPTE"))
                throw error(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Vous n’êtes pas membre de cette classe.");
        } else if (!owner) throw notFound();
        if (!"PLANIFIEE".equals(session.getStatut()))
            throw error(HttpStatus.CONFLICT, "SESSION_UNAVAILABLE", "Cette séance est inaccessible.");
        Instant now = clock.instant();
        if (now.isBefore(session.getDateDebut()) || !now.isBefore(session.getDateFin()))
            throw error(HttpStatus.CONFLICT, "SESSION_NOT_ACTIVE", "Cette séance peut être rejointe uniquement entre son début et sa fin.");
        if (trainer && session.getHostStartedAt() == null) {
            session.setHostStartedAt(now);
            seances.saveAndFlush(session);
        } else if (!trainer && session.getHostStartedAt() == null) {
            throw error(HttpStatus.CONFLICT, "TRAINER_NOT_JOINED", "Le formateur doit ouvrir la salle avant les participants.");
        }
        if (!trainer) engagement.recordActivity(email, session.getClasse().getFormation().getId(), ActivityType.CLASSE_REJOINTE, "class-session:" + sessionId, 30);
        User account = users.findByEmail(email).orElseThrow(this::notFound);
        String displayName = account.getNom().trim();
        String encodedName = URLEncoder.encode("\"" + displayName + "\"", StandardCharsets.UTF_8).replace("+", "%20");
        String url = jitsi + "/" + URLEncoder.encode(session.getIdentifiantSalle(), StandardCharsets.UTF_8)
                + "#userInfo.displayName=" + encodedName
                + "&config.prejoinPageEnabled=false&config.prejoinConfig.enabled=false"
                + "&config.requireDisplayName=false&config.disableDeepLinking=true";
        return new JoinResponse(session.getId(), session.getIdentifiantSalle(), jitsi, url, displayName, trainer);
    }

    private void validateSession(Classe classe, String email, Long excludedId, SessionRequest request) {
        if (!"ACTIVE".equals(classe.getStatut())) throw error(HttpStatus.CONFLICT, "CLASS_INACTIVE", "La classe est inactive.");
        validate(request.dateDebut(), request.dateFin(), request.fuseauHoraire());
        ZoneId zone = ZoneId.of(request.fuseauHoraire());
        LocalDate start = request.dateDebut().atZone(zone).toLocalDate(), end = request.dateFin().atZone(zone).toLocalDate();
        if (start.isBefore(classe.getDateDebut()) || end.isAfter(classe.getDateFin()))
            throw error(HttpStatus.BAD_REQUEST, "SESSION_OUTSIDE_CLASS_DATES", "La séance doit être comprise dans les dates de la classe.");
        long ignored = excludedId == null ? -1L : excludedId;
        if (seances.countClassOverlaps(classe.getId(), ignored, request.dateDebut(), request.dateFin()) > 0)
            throw error(HttpStatus.CONFLICT, "SESSION_OVERLAP", "Cette séance chevauche une autre séance de la classe.");
        if (seances.countTrainerOverlaps(email, ignored, request.dateDebut(), request.dateFin()) > 0)
            throw error(HttpStatus.CONFLICT, "TRAINER_SESSION_OVERLAP", "Le formateur anime déjà une séance sur ce créneau.");
    }

    private void apply(Classe value, ClasseRequest request) { value.setNom(request.nom().trim()); value.setDescription(request.description()); value.setCapacite(request.capacite()); value.setDateDebut(request.dateDebut()); value.setDateFin(request.dateFin()); }
    private void apply(SeanceVirtuelle value, SessionRequest request) { value.setTitre(request.titre().trim()); value.setDateDebut(request.dateDebut()); value.setDateFin(request.dateFin()); value.setFuseauHoraire(ZoneId.of(request.fuseauHoraire()).getId()); }
    private boolean sameSession(SeanceVirtuelle value,SessionRequest request){return value.getTitre().equals(request.titre().trim())&&sameDatabaseInstant(value.getDateDebut(),request.dateDebut())&&sameDatabaseInstant(value.getDateFin(),request.dateFin())&&value.getFuseauHoraire().equals(ZoneId.of(request.fuseauHoraire()).getId());}
    private boolean sameDatabaseInstant(Instant left,Instant right){return left.toEpochMilli()==right.toEpochMilli();}
    private void notifyMembers(Classe classe,String eventKey,String title,String message){for(ClasseMembre member:membres.findByClasseId(classe.getId()))if("ACCEPTE".equals(member.getStatut()))engagement.sendNotification(member.getParticipant().getEmail(),NotificationCategory.CLASSE,eventKey,title,message,"/participant/classes",false);}
    private void validate(LocalDate start, LocalDate end) { if (end.isBefore(start)) throw error(HttpStatus.BAD_REQUEST, "INVALID_DATES", "La date de fin doit suivre la date de début."); }
    private void validate(Instant start, Instant end, String timezone) { try { ZoneId.of(timezone); } catch (Exception exception) { throw error(HttpStatus.BAD_REQUEST, "INVALID_TIMEZONE", "Fuseau horaire invalide."); } if (!end.isAfter(start)) throw error(HttpStatus.BAD_REQUEST, "INVALID_DATES", "La fin doit être postérieure au début."); }
    private boolean classOffer(Formation value) { return value.isClassesGratuites() || value.getSupplementClasses().signum() > 0; }
    private boolean sessionOutsideDates(SeanceVirtuelle session, LocalDate start, LocalDate end) { ZoneId zone = ZoneId.of(session.getFuseauHoraire()); LocalDate sessionStart = session.getDateDebut().atZone(zone).toLocalDate(), sessionEnd = session.getDateFin().atZone(zone).toLocalDate(); return sessionStart.isBefore(start) || sessionEnd.isAfter(end); }
    private Classe owned(String email, Long id) { return classes.findByIdAndFormationFormateurEmail(id, email).orElseThrow(this::notFound); }
    private Classe locked(String email, Long id) { return classes.findLockedOwned(id, email).orElseThrow(this::notFound); }
    private void lockTrainer(String email) { formateurs.findLockedByEmail(email).orElseThrow(this::notFound); }
    private ClasseResponse dto(Classe value) { return new ClasseResponse(value.getId(), value.getFormation().getId(), value.getFormation().getTitre(), value.getNom(), value.getDescription(), value.getCapacite(), value.getDateDebut(), value.getDateFin(), value.getStatut(), value.getSeances().stream().map(this::session).toList(), membres.findByClasseId(value.getId()).stream().map(member -> new MemberResponse(member.getParticipant().getId(), member.getParticipant().getNom(), member.getParticipant().getEmail(), member.getStatut())).toList()); }
    private ParticipantClasseResponse participantDto(Classe value) { return new ParticipantClasseResponse(value.getId(), value.getFormation().getId(), value.getFormation().getTitre(), value.getNom(), value.getDescription(), value.getCapacite(), value.getDateDebut(), value.getDateFin(), value.getStatut(), value.getSeances().stream().map(this::session).toList()); }
    private SessionResponse session(SeanceVirtuelle value) { return new SessionResponse(value.getId(), value.getTitre(), value.getDateDebut(), value.getDateFin(), value.getFuseauHoraire(), value.getStatut(), value.getHostStartedAt() != null); }
    private BusinessException notFound() { return error(HttpStatus.NOT_FOUND, "CLASS_NOT_FOUND", "Classe ou séance introuvable."); }
    private BusinessException error(HttpStatus status, String code, String message) { return new BusinessException(status, code, message); }
}
