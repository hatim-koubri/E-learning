package ma.elearning.admin;

import ma.elearning.api.AdminDtos.FormateurResponse;
import ma.elearning.common.BusinessException;
import ma.elearning.user.*;
import ma.elearning.engagement.*;
import org.slf4j.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import static ma.elearning.api.UserMapper.toFormateurResponse;

@Service
public class FormateurAdminService {
    private static final Logger log=LoggerFactory.getLogger(FormateurAdminService.class);
    private final FormateurRepository formateurs;
    private final UserRepository users;
    private final EngagementService engagement;
    private final Clock clock;
    private final AdminAuditService audit;
    private final TrainerCredentialRepository credentials;
    private final ma.elearning.storage.ObjectStorage storage;
    public FormateurAdminService(FormateurRepository formateurs, UserRepository users,
                                 EngagementService engagement, Clock clock, AdminAuditService audit,
                                 TrainerCredentialRepository credentials,ma.elearning.storage.ObjectStorage storage) {
        this.formateurs=formateurs; this.users=users; this.engagement=engagement; this.clock=clock; this.audit=audit;
        this.credentials=credentials;this.storage=storage;
    }
    @Transactional(readOnly=true) public List<FormateurResponse> pending() {
        return formateurs.findByStatutOrderByCreatedAtAsc(AccountStatus.EN_ATTENTE).stream().map(ma.elearning.api.UserMapper::toFormateurResponse).toList();
    }
    @Transactional(readOnly=true) public ma.elearning.api.AdminDtos.FormateurPage pending(int page, int size) {
        int safePage=Math.max(0,page); int safeSize=Math.min(Math.max(1,size),100);
        var result=formateurs.findByStatut(AccountStatus.EN_ATTENTE,
                PageRequest.of(safePage,safeSize,Sort.by("createdAt").ascending().and(Sort.by("id").ascending())));
        return new ma.elearning.api.AdminDtos.FormateurPage(
                result.getContent().stream().map(ma.elearning.api.UserMapper::toFormateurResponse).toList(),
                result.getNumber(),result.getTotalPages(),result.getTotalElements());
    }
    @Transactional(readOnly=true) public FormateurResponse get(Long id) {
        return toFormateurResponse(formateurs.findByIdAndStatut(id,AccountStatus.EN_ATTENTE)
                .orElseThrow(this::notFound));
    }
    @Transactional(readOnly=true) public ma.elearning.api.AdminDtos.FormateurApplicationResponse application(Long id){
        Formateur trainer=formateurs.findByIdAndStatut(id,AccountStatus.EN_ATTENTE).orElseThrow(this::notFound);
        var documents=credentials.findByFormateurIdOrderByIdAsc(id).stream().map(document->
                new ma.elearning.api.AdminDtos.TrainerCredentialResponse(document.getId(),document.getType().name(),
                        document.getOriginalName(),document.getContentType(),document.getSize(),document.getUploadedAt(),
                        storage.temporaryUrl(document.getObjectKey()))).toList();
        return new ma.elearning.api.AdminDtos.FormateurApplicationResponse(toFormateurResponse(trainer),documents);
    }
    @Transactional public FormateurResponse accept(Long id) {
        Admin admin=authenticatedAdmin(); Formateur f=pendingLocked(id);
        String before=audit.safeSnapshot(f);
        applyDecision(f,admin,FormateurDecision.ACCEPTE,null);
        audit.success(admin,"USER",f.getId(),"TRAINER_REQUEST_ACCEPTED",null,AccountStatus.EN_ATTENTE.name(),AccountStatus.ACTIF.name(),before,audit.safeSnapshot(f));
        engagement.sendNotification(f.getEmail(), NotificationCategory.COMPTE_FORMATEUR,
                "trainer-account-decision:" + f.getId(), "Compte formateur validé",
                "Votre demande de compte formateur a été acceptée. Votre compte est maintenant actif et vous pouvez vous connecter.",
                "/login", true);
        log.info("Décision formateur enregistrée, formateurId={}, resultat={}, adminId={}",id,FormateurDecision.ACCEPTE,admin.getId());
        return toFormateurResponse(f);
    }
    @Transactional public FormateurResponse refuse(Long id,String motif) {
        String reason=normalizeReason(motif); Admin admin=authenticatedAdmin(); Formateur f=pendingLocked(id);
        String before=audit.safeSnapshot(f);
        applyDecision(f,admin,FormateurDecision.REFUSE,reason);
        audit.success(admin,"USER",f.getId(),"TRAINER_REQUEST_REFUSED",reason,AccountStatus.EN_ATTENTE.name(),AccountStatus.REFUSE.name(),before,audit.safeSnapshot(f));
        engagement.sendNotification(f.getEmail(), NotificationCategory.COMPTE_FORMATEUR,
                "trainer-account-decision:" + f.getId(), "Demande formateur refusée",
                "Votre demande de compte formateur a été refusée.\nMotif : " + reason, null, true);
        log.info("Décision formateur enregistrée, formateurId={}, resultat={}, adminId={}",id,FormateurDecision.REFUSE,admin.getId());
        return toFormateurResponse(f);
    }
    private void applyDecision(Formateur formateur,Admin admin,FormateurDecision decision,String reason){
        formateur.setStatut(decision==FormateurDecision.ACCEPTE?AccountStatus.ACTIF:AccountStatus.REFUSE);
        formateur.setMotifRefus(reason);
        formateur.setDecisionAdmin(admin);
        formateur.setDecisionResult(decision);
        formateur.setDateDecision(clock.instant());
    }
    private Formateur pendingLocked(Long id) {
        Formateur f=formateurs.findLockedById(id).orElseThrow(this::notFound);
        if(f.getStatut()!=AccountStatus.EN_ATTENTE) throw new BusinessException(HttpStatus.CONFLICT,"REQUEST_ALREADY_DECIDED","Cette demande a déjà été traitée.");
        return f;
    }
    private Admin authenticatedAdmin(){
        Authentication authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null||!authentication.isAuthenticated())throw adminRequired();
        User account=users.findByEmail(authentication.getName()).orElseThrow(this::adminRequired);
        if(!(account instanceof Admin admin)||account.getRole()!=Role.ADMIN||account.getStatut()!=AccountStatus.ACTIF)
            throw adminRequired();
        return admin;
    }
    private String normalizeReason(String value){
        String normalized=value==null?"":value.replace("\r\n","\n").replace('\r','\n').strip();
        if(normalized.isBlank()||normalized.length()>500)
            throw new BusinessException(HttpStatus.BAD_REQUEST,"INVALID_REFUSAL_REASON","Le motif de refus est obligatoire et limité à 500 caractères.");
        return normalized;
    }
    private BusinessException notFound(){
        return new BusinessException(HttpStatus.NOT_FOUND,"FORMATEUR_NOT_FOUND","Demande introuvable.");
    }
    private BusinessException adminRequired(){
        return new BusinessException(HttpStatus.FORBIDDEN,"ADMIN_REQUIRED","Cette action est réservée à un administrateur actif.");
    }
}
