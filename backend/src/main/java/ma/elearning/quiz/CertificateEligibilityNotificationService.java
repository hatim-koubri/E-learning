package ma.elearning.quiz;

import ma.elearning.engagement.NotificationCategory;
import ma.elearning.engagement.NotificationDeliveryService;
import ma.elearning.learning.Inscription;
import ma.elearning.learning.InscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CertificateEligibilityNotificationService {
    private final CertificateEligibilityService eligibility;
    private final NotificationDeliveryService delivery;
    private final InscriptionRepository inscriptions;

    public CertificateEligibilityNotificationService(CertificateEligibilityService eligibility,
                                                     NotificationDeliveryService delivery,
                                                     InscriptionRepository inscriptions) {
        this.eligibility = eligibility;
        this.delivery = delivery;
        this.inscriptions = inscriptions;
    }

    @Transactional
    public void notifyIfEligible(Inscription inscription) {
        notifyIfEligible(inscription.getId());
    }

    @Transactional
    public void notifyIfEligible(Long inscriptionId) {
        Inscription inscription = inscriptions.findLockedById(inscriptionId).orElseThrow();
        if (!eligibility.isEligible(inscription)) return;
        String title = inscription.getFormation().getTitre();
        delivery.deliverRequiredInAppOptionalEmail(inscription.getParticipant(),
                NotificationCategory.CERTIFICATE_AVAILABLE, "certificate-eligible:" + inscription.getId(),
                "Votre certificat est disponible",
                "Félicitations, vous avez terminé la formation « " + title
                        + " » et réussi toutes les évaluations obligatoires. Vous pouvez maintenant télécharger votre certificat.",
                "/apprentissage/" + inscription.getFormation().getId() + "/quiz");
    }
}
