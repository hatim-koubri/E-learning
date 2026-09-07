package ma.elearning.quiz;

import ma.elearning.engagement.*;
import ma.elearning.formation.*;
import ma.elearning.learning.*;
import ma.elearning.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:certificate_concurrency;MODE=MySQL;DB_CLOSE_DELAY=-1")
class CertificateEligibilityConcurrencyTest {
    @Autowired UserRepository users;
    @Autowired FormationRepository formations;
    @Autowired InscriptionRepository inscriptions;
    @Autowired NotificationPreferenceRepository preferences;
    @Autowired UserNotificationRepository notifications;
    @Autowired NotificationDeliveryLogRepository deliveries;
    @Autowired CertificateEligibilityNotificationService service;
    @MockitoBean CertificateEligibilityService eligibility;
    @MockitoBean JavaMailSender mail;
    private Inscription inscription;

    @BeforeEach
    void setup() {
        deliveries.deleteAll();notifications.deleteAll();preferences.deleteAll();inscriptions.deleteAll();formations.deleteAll();users.deleteAll();
        Formateur trainer=new Formateur();account(trainer,"trainer-certificate@test.local",Role.FORMATEUR);trainer.setSpecialite("Java");trainer.setBiographie("QA");
        trainer=users.saveAndFlush(trainer);
        Participant participant=new Participant();account(participant,"participant-certificate@test.local",Role.PARTICIPANT);
        participant=(Participant) users.saveAndFlush(participant);
        Formation formation=new Formation();formation.setFormateur(trainer);formation.setTitre("Formation concurrence certificat");
        formation.setDescription("Recette");formation.setLangue("fr");formation.setNiveau(NiveauFormation.DEBUTANT);
        formation.setCategorie("Java");formation.setPrix(BigDecimal.ZERO);formation.setStatut(FormationStatus.PUBLIEE);
        formation=formations.saveAndFlush(formation);
        inscription=new Inscription();inscription.setParticipant(participant);inscription.setFormation(formation);inscription.setPrixPaye(BigDecimal.ZERO);
        inscription=inscriptions.saveAndFlush(inscription);
        NotificationPreference preference=new NotificationPreference();preference.setUser(participant);
        preference.setCategorie(NotificationCategory.CERTIFICATE_AVAILABLE);preference.setDansApplication(true);preference.setEmailActif(true);
        preferences.saveAndFlush(preference);
        when(eligibility.isEligible(any())).thenReturn(true);
    }

    @Test
    void concurrentChecksCreateOneInternalNotificationAndAtMostOneEmail() throws Exception {
        ExecutorService pool=Executors.newFixedThreadPool(2);
        CountDownLatch ready=new CountDownLatch(2);CountDownLatch start=new CountDownLatch(1);
        Callable<Void> task=()->{ready.countDown();assertTrue(start.await(5,TimeUnit.SECONDS));service.notifyIfEligible(inscription.getId());return null;};
        Future<Void> first=pool.submit(task);Future<Void> second=pool.submit(task);
        assertTrue(ready.await(5,TimeUnit.SECONDS));start.countDown();
        assertDoesNotThrow(()->first.get(10,TimeUnit.SECONDS));assertDoesNotThrow(()->second.get(10,TimeUnit.SECONDS));pool.shutdownNow();
        String key="certificate-eligible:"+inscription.getId();
        assertEquals(1,notifications.countByUserIdAndCategorieAndEventKey(inscription.getParticipant().getId(),NotificationCategory.CERTIFICATE_AVAILABLE,key));
        assertEquals(1,deliveries.countByUserIdAndCategorieAndEventKeyAndCanal(inscription.getParticipant().getId(),NotificationCategory.CERTIFICATE_AVAILABLE,key,"EMAIL"));
    }

    private void account(User user,String email,Role role){user.setNom("QA");user.setEmail(email);user.setPasswordHash("not-used");user.setRole(role);user.setStatut(AccountStatus.ACTIF);}
}
