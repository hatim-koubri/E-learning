package ma.elearning.admin;

import ma.elearning.api.AdminDtos.FormateurResponse;
import ma.elearning.common.BusinessException;
import ma.elearning.user.*;
import ma.elearning.engagement.*;
import org.slf4j.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import static ma.elearning.api.UserMapper.toFormateurResponse;

@Service
public class FormateurAdminService {
    private static final Logger log=LoggerFactory.getLogger(FormateurAdminService.class);
    private final FormateurRepository formateurs;
    private final EngagementService engagement;
    public FormateurAdminService(FormateurRepository formateurs, EngagementService engagement) {
        this.formateurs=formateurs; this.engagement=engagement;
    }
    public List<FormateurResponse> pending() {
        return formateurs.findByStatutOrderByCreatedAtAsc(AccountStatus.EN_ATTENTE).stream().map(ma.elearning.api.UserMapper::toFormateurResponse).toList();
    }
    public FormateurResponse get(Long id) { return toFormateurResponse(find(id)); }
    @Transactional public FormateurResponse accept(Long id) {
        Formateur f=pending(id); f.setStatut(AccountStatus.ACTIF); f.setMotifRefus(null); f.setDateDecision(Instant.now());
        engagement.sendNotification(f.getEmail(), NotificationCategory.COMPTE_FORMATEUR,
                "Compte formateur validé", "Votre compte formateur est maintenant actif.", "/login");
        log.info("Formateur {} accepté",id); return toFormateurResponse(f);
    }
    @Transactional public FormateurResponse refuse(Long id,String motif) {
        Formateur f=pending(id); f.setStatut(AccountStatus.REFUSE); f.setMotifRefus(motif.trim()); f.setDateDecision(Instant.now());
        engagement.sendNotification(f.getEmail(), NotificationCategory.COMPTE_FORMATEUR,
                "Demande formateur refusée",
                "Votre demande a été refusée. Consultez le motif associé à votre compte.", "/login");
        log.info("Formateur {} refusé",id); return toFormateurResponse(f);
    }
    private Formateur pending(Long id) {
        Formateur f=find(id);
        if(f.getStatut()!=AccountStatus.EN_ATTENTE) throw new BusinessException(HttpStatus.CONFLICT,"REQUEST_ALREADY_DECIDED","Cette demande a déjà été traitée.");
        return f;
    }
    private Formateur find(Long id) {
        return formateurs.findById(id).orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND,"FORMATEUR_NOT_FOUND","Demande introuvable."));
    }
}
