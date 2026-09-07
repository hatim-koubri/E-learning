package ma.elearning.admin;

import ma.elearning.api.AdminUserDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.engagement.CourseReviewRepository;
import ma.elearning.engagement.ReviewReportRepository;
import ma.elearning.engagement.*;
import ma.elearning.auth.PasswordResetTokenRepository;
import ma.elearning.formation.FormationRepository;
import ma.elearning.learning.InscriptionRepository;
import ma.elearning.user.*;
import ma.elearning.virtualclass.ClasseMembreRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.*;

@Service
public class AdminUserManagementService {
    private static final Set<String> SORTS = Set.of("createdAt", "nom", "email", "role", "statut", "id");
    private final UserRepository users;
    private final FormationRepository formations;
    private final InscriptionRepository inscriptions;
    private final ClasseMembreRepository memberships;
    private final CourseReviewRepository reviews;
    private final ReviewReportRepository reports;
    private final AdminAuditService audit;
    private final AdminAuditEventRepository auditEvents;
    private final PasswordResetTokenRepository resetTokens; private final FavoriteRepository favorites;
    private final PrivateNoteRepository privateNotes; private final LearningPositionRepository positions;
    private final UserNotificationRepository notifications; private final NotificationPreferenceRepository notificationPreferences;
    private final NotificationDeliveryLogRepository deliveryLogs; private final ParticipantPreferenceRepository participantPreferences;
    private final WeeklyGoalRepository weeklyGoals;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminUserManagementService(UserRepository users, FormationRepository formations,
                                      InscriptionRepository inscriptions, ClasseMembreRepository memberships,
                                      CourseReviewRepository reviews, ReviewReportRepository reports,
                                      AdminAuditService audit, AdminAuditEventRepository auditEvents,
                                      PasswordResetTokenRepository resetTokens, FavoriteRepository favorites,
                                      PrivateNoteRepository privateNotes, LearningPositionRepository positions,
                                      UserNotificationRepository notifications, NotificationPreferenceRepository notificationPreferences,
                                      NotificationDeliveryLogRepository deliveryLogs, ParticipantPreferenceRepository participantPreferences,
                                      WeeklyGoalRepository weeklyGoals, PasswordEncoder passwordEncoder, Clock clock) {
        this.users=users; this.formations=formations; this.inscriptions=inscriptions;
        this.memberships=memberships; this.reviews=reviews; this.reports=reports;
        this.audit=audit; this.auditEvents=auditEvents; this.resetTokens=resetTokens; this.favorites=favorites;
        this.privateNotes=privateNotes; this.positions=positions; this.notifications=notifications;
        this.notificationPreferences=notificationPreferences; this.deliveryLogs=deliveryLogs;
        this.participantPreferences=participantPreferences; this.weeklyGoals=weeklyGoals;
        this.passwordEncoder=passwordEncoder; this.clock=clock;
    }

    @Transactional(readOnly=true)
    public UserPage search(String query, Role role, AccountStatus status, Instant from, Instant to,
                           int page, int size, String sort, String direction) {
        int safePage=Math.max(0,page), safeSize=Math.min(Math.max(1,size),100);
        String safeSort=SORTS.contains(sort)?sort:"createdAt";
        Sort.Direction dir="asc".equalsIgnoreCase(direction)?Sort.Direction.ASC:Sort.Direction.DESC;
        var result=users.searchAdmin(normalizeQuery(query),role,status,from,to,
                PageRequest.of(safePage,safeSize,Sort.by(dir,safeSort).and(Sort.by(dir,"id"))));
        return new UserPage(result.map(this::summary).getContent(),result.getNumber(),result.getSize(),
                result.getTotalPages(),result.getTotalElements());
    }

    @Transactional(readOnly=true)
    public UserDetail detail(Long id) { return detailOf(users.findById(id).orElseThrow(this::notFound)); }

    @Transactional
    public UserDetail update(Long id, UpdateUserRequest request) {
        Admin actor=authenticatedAdmin(); User target=locked(id); verifyVersion(target,request.expectedVersion());
        if(target.getStatut()==AccountStatus.SUPPRIME) throw deleted();
        String before=audit.safeSnapshot(target);
        target.setNom(request.nom().strip());
        target.setTelephone(normalizePhone(request.telephone()));
        target.incrementLifecycleVersion();
        audit.success(actor,"USER",target.getId(),"USER_UPDATED",null,target.getStatut().name(),
                target.getStatut().name(),before,audit.safeSnapshot(target));
        return detailOf(target);
    }

    @Transactional
    public UserDetail suspend(Long id, LifecycleRequest request) {
        Admin actor=authenticatedAdmin(); User target=locked(id); verifyVersion(target,request.expectedVersion());
        String reason=reason(request.motif());
        if(actor.getId().equals(target.getId())) throw error(HttpStatus.CONFLICT,"SELF_SUSPENSION_FORBIDDEN","Vous ne pouvez pas suspendre votre propre compte.");
        if(target.getStatut()==AccountStatus.SUPPRIME) throw deleted();
        if(target.getStatut()==AccountStatus.SUSPENDU) throw error(HttpStatus.CONFLICT,"USER_ALREADY_SUSPENDED","Ce compte est déjà suspendu.");
        if(target.getStatut()!=AccountStatus.ACTIF) throw transition();
        if(target instanceof Admin && users.countByRoleAndStatut(Role.ADMIN,AccountStatus.ACTIF)<=1)
            throw error(HttpStatus.CONFLICT,"LAST_ACTIVE_ADMIN","Le dernier administrateur actif ne peut pas être suspendu.");
        String before=audit.safeSnapshot(target); String previous=target.getStatut().name();
        target.setStatut(AccountStatus.SUSPENDU); target.setSuspensionReason(reason);
        target.setSuspendedAt(clock.instant()); target.setSuspensionAdmin(actor); target.incrementLifecycleVersion();
        audit.success(actor,"USER",target.getId(),"USER_SUSPENDED",reason,previous,target.getStatut().name(),before,audit.safeSnapshot(target));
        return detailOf(target);
    }

    @Transactional
    public UserDetail reactivate(Long id, LifecycleRequest request) {
        Admin actor=authenticatedAdmin(); User target=locked(id); verifyVersion(target,request.expectedVersion());
        String reason=reason(request.motif());
        if(target.getStatut()==AccountStatus.SUPPRIME) throw deleted();
        if(target.getStatut()!=AccountStatus.SUSPENDU)
            throw error(HttpStatus.CONFLICT,"USER_NOT_SUSPENDED","Seul un compte suspendu peut être réactivé.");
        String before=audit.safeSnapshot(target); String previous=target.getStatut().name();
        target.setStatut(AccountStatus.ACTIF); target.setSuspensionReason(null);
        target.setSuspendedAt(null); target.setSuspensionAdmin(null); target.incrementLifecycleVersion();
        audit.success(actor,"USER",target.getId(),"USER_REACTIVATED",reason,previous,target.getStatut().name(),before,audit.safeSnapshot(target));
        return detailOf(target);
    }

    @Transactional(readOnly=true)
    public DeletionImpact impact(Long id) {
        User target=users.findById(id).orElseThrow(this::notFound);
        return impactOf(target);
    }

    @Transactional
    public DeletionImpact delete(Long id, DeletionRequest request) {
        Admin actor=authenticatedAdmin(); User target=locked(id); verifyVersion(target,request.expectedVersion());
        if(target instanceof Admin) throw error(HttpStatus.CONFLICT,"DELETION_NOT_ALLOWED","Un compte administrateur ne peut pas être supprimé.");
        if(target.getStatut()==AccountStatus.SUPPRIME) throw deleted();
        if(!target.getEmail().equalsIgnoreCase(request.confirmation().strip()))
            throw error(HttpStatus.BAD_REQUEST,"CONFIRMATION_REQUIRED","La confirmation doit correspondre à l’adresse e-mail actuelle.");
        DeletionImpact current=impactOf(target);
        if(!current.mode().equals(request.expectedMode())) throw error(HttpStatus.CONFLICT,"USER_STATE_CHANGED","L’impact a changé. Rechargez l’analyse avant de confirmer.");
        String before=audit.safeSnapshot(target);
        if("SUPPRESSION_PHYSIQUE".equals(current.mode())) {
            Long targetId=target.getId();
            audit.success(actor,"USER",targetId,"USER_HARD_DELETED",null,target.getStatut().name(),"SUPPRIME",before,null);
            auditEvents.flush(); users.delete(target); users.flush();
            return new DeletionImpact(targetId,current.mode(),current.relations(),true,"Compte supprimé physiquement.",request.expectedVersion());
        }
        String previous=target.getStatut().name(); Long targetId=target.getId();
        erasePrivateData(target);
        target.setStatut(AccountStatus.SUPPRIME); target.setNom(target instanceof Formateur?"Formateur supprimé":"Participant supprimé");
        target.setEmail("deleted+"+targetId+"@anonymized.invalid"); target.setTelephone(null);
        target.setPasswordHash(passwordEncoder.encode(randomSecret())); target.setDeletedAt(clock.instant());
        target.setAnonymizedAt(clock.instant()); target.setSuspensionReason(null); target.setSuspendedAt(null);
        target.setSuspensionAdmin(null); target.incrementLifecycleVersion();
        if(target instanceof Formateur trainer) { trainer.setSpecialite(null); trainer.setBiographie(null); trainer.setMotifRefus(null); }
        audit.success(actor,"USER",targetId,"USER_ANONYMIZED",null,previous,"SUPPRIME",before,audit.safeSnapshot(target));
        return impactOf(target);
    }

    @Transactional(readOnly=true)
    public AuditPage audit(Long actorId, Long targetId, String action, Instant from, Instant to, int page, int size) {
        int safePage=Math.max(0,page),safeSize=Math.min(Math.max(1,size),100);
        var result=auditEvents.search(actorId,targetId,normalizeQuery(action),from,to,
                PageRequest.of(safePage,safeSize,Sort.by(Sort.Direction.DESC,"occurredAt").and(Sort.by(Sort.Direction.DESC,"id"))));
        var content=result.getContent().stream().map(e->new AuditItem(e.getId(),e.getActor().getId(),e.getActor().getNom(),
                e.getTargetType(),e.getTargetId(),e.getAction(),e.getResult(),e.getReason(),e.getPreviousStatus(),
                e.getNewStatus(),e.getBeforeSnapshot(),e.getAfterSnapshot(),e.getOccurredAt())).toList();
        return new AuditPage(content,result.getNumber(),result.getSize(),result.getTotalPages(),result.getTotalElements());
    }

    private UserDetail detailOf(User user) {
        Map<String,Long> relations=relations(user);
        boolean active=user.getStatut()==AccountStatus.ACTIF, suspended=user.getStatut()==AccountStatus.SUSPENDU;
        return new UserDetail(summary(user),relations,user.getStatut()!=AccountStatus.SUPPRIME,active,suspended,!(user instanceof Admin));
    }
    private DeletionImpact impactOf(User user) {
        Map<String,Long> relations=relations(user); long business=relations.values().stream().mapToLong(Long::longValue).sum();
        boolean admin=user instanceof Admin; String mode=admin?"INTERDITE":business==0?"SUPPRESSION_PHYSIQUE":"ANONYMISATION";
        String explanation=admin?"Les comptes administrateurs sont conservés.":business==0?"Aucune relation métier : suppression physique possible.":"Des relations métier imposent la conservation anonymisée de l’historique.";
        return new DeletionImpact(user.getId(),mode,relations,!admin,explanation,user.getLifecycleVersion());
    }
    private Map<String,Long> relations(User user) {
        Map<String,Long> result=new LinkedHashMap<>();
        if(user instanceof Participant) {
            result.put("inscriptions",inscriptions.countByParticipantId(user.getId()));
            result.put("classes",memberships.countByParticipantId(user.getId()));
            result.put("avis",reviews.countByParticipantId(user.getId()));
            result.put("signalements",reports.countByParticipantId(user.getId()));
        } else if(user instanceof Formateur) {
            result.put("formations",formations.countByFormateurId(user.getId()));
            result.put("inscriptions",inscriptions.countByFormationFormateurId(user.getId()));
            result.put("avis",reviews.countByFormationFormateurId(user.getId()));
        }
        return result;
    }
    private void erasePrivateData(User target) {
        Long id=target.getId();
        resetTokens.deleteByUserId(id);
        deliveryLogs.deleteByUserId(id);
        notifications.deleteByUserId(id);
        notificationPreferences.deleteByUserId(id);
        if(target instanceof Participant) {
            favorites.deleteByParticipantId(id); privateNotes.deleteByParticipantId(id);
            positions.deleteByParticipantId(id); participantPreferences.deleteByParticipantId(id);
            weeklyGoals.deleteByParticipantId(id);
        }
    }
    private UserSummary summary(User u) { return new UserSummary(u.getId(),u.getNom(),u.getEmail(),u.getTelephone(),u.getRole(),u.getStatut(),u.getCreatedAt(),u.getUpdatedAt(),u.getSuspendedAt(),u.getSuspensionReason(),u.getDeletedAt(),u.getAnonymizedAt(),u.getLifecycleVersion()); }
    private User locked(Long id) { return users.findLockedById(id).orElseThrow(this::notFound); }
    private void verifyVersion(User target,Long expected) { if(expected==null||target.getLifecycleVersion()!=expected) throw error(HttpStatus.CONFLICT,"USER_STATE_CHANGED","Le compte a changé. Rechargez les données."); }
    private Admin authenticatedAdmin() { Authentication auth=SecurityContextHolder.getContext().getAuthentication(); if(auth==null||!auth.isAuthenticated()) throw error(HttpStatus.FORBIDDEN,"ADMIN_REQUIRED","Administrateur actif requis."); User u=users.findByEmail(auth.getName()).orElseThrow(()->error(HttpStatus.FORBIDDEN,"ADMIN_REQUIRED","Administrateur actif requis.")); if(!(u instanceof Admin a)||u.getStatut()!=AccountStatus.ACTIF) throw error(HttpStatus.FORBIDDEN,"ADMIN_REQUIRED","Administrateur actif requis."); return a; }
    private String reason(String value) { String r=value==null?"":value.strip(); if(r.isBlank()||r.length()>500) throw error(HttpStatus.BAD_REQUEST,"INVALID_REASON","Le motif est obligatoire et limité à 500 caractères."); return r; }
    private String normalizeQuery(String value) { if(value==null||value.isBlank()) return null; return value.strip(); }
    private String normalizePhone(String value) { return value==null||value.isBlank()?null:value.strip(); }
    private String randomSecret() { byte[] bytes=new byte[48]; secureRandom.nextBytes(bytes); return Base64.getEncoder().encodeToString(bytes); }
    private BusinessException notFound() { return error(HttpStatus.NOT_FOUND,"USER_NOT_FOUND","Utilisateur introuvable."); }
    private BusinessException deleted() { return error(HttpStatus.CONFLICT,"USER_DELETED","Ce compte est supprimé."); }
    private BusinessException transition() { return error(HttpStatus.CONFLICT,"INVALID_STATUS_TRANSITION","Cette transition de statut n’est pas autorisée."); }
    private BusinessException error(HttpStatus status,String code,String message) { return new BusinessException(status,code,message); }
}
