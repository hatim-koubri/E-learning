package ma.elearning.quiz;

import ma.elearning.common.BusinessException;
import ma.elearning.formation.Formation;
import ma.elearning.learning.Inscription;
import ma.elearning.learning.InscriptionRepository;
import ma.elearning.user.Participant;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CertificateServiceTest {
    private final CertificateEligibilityService eligibility = mock(CertificateEligibilityService.class);
    private final InscriptionRepository inscriptions = mock(InscriptionRepository.class);
    private final CertificateService service = new CertificateService(eligibility, inscriptions);

    @Test
    void refusesAnUnknownEnrollment() {
        when(inscriptions.findByParticipantEmailAndFormationId("absent@test.local", 9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generate("absent@test.local", 9L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Inscription introuvable.");
    }

    @Test
    void refusesAnEnrollmentThatIsNotEligible() {
        Inscription inscription = mock(Inscription.class);
        when(inscriptions.findByParticipantEmailAndFormationId("learner@test.local", 12L)).thenReturn(Optional.of(inscription));
        when(eligibility.isEligible(inscription)).thenReturn(false);

        assertThatThrownBy(() -> service.generate("learner@test.local", 12L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Terminez les modules");
    }

    @Test
    void generatesAReadablePdfAndSanitizesCertificateText() throws Exception {
        Inscription inscription = mock(Inscription.class);
        Participant participant = mock(Participant.class);
        Formation formation = mock(Formation.class);
        when(inscription.getId()).thenReturn(44L);
        when(inscription.getParticipant()).thenReturn(participant);
        when(inscription.getFormation()).thenReturn(formation);
        when(participant.getNom()).thenReturn("  Hatim\nKoubri  ");
        when(formation.getTitre()).thenReturn("CI/CD — automatisation des déploiements");
        when(inscriptions.findByParticipantEmailAndFormationId("ADA@Test.Local", 12L)).thenReturn(Optional.of(inscription));
        when(eligibility.isEligible(inscription)).thenReturn(true);

        byte[] pdf = service.generate("ADA@Test.Local", 12L);

        assertThat(pdf).startsWith((byte) '%', (byte) 'P', (byte) 'D', (byte) 'F').hasSizeGreaterThan(1_000);
        try (var document = Loader.loadPDF(pdf)) {
            assertThat(document.getNumberOfPages()).isOne();
            assertThat(document.getPage(0).getRotation()).isZero();
            assertThat(document.getPage(0).getMediaBox().getWidth())
                    .isGreaterThan(document.getPage(0).getMediaBox().getHeight());
            assertThat(document.getDocumentInformation().getAuthor()).isEqualTo("Khotwa");
            assertThat(new PDFTextStripper().getText(document))
                    .contains("Khotwa", "CERTIFICAT DE RÉUSSITE", "Hatim Koubri",
                            "CI/CD - automatisation des déploiements", "IDENTIFIANT DE VÉRIFICATION")
                    .doesNotContain("NEXALEARN");
        }
        if (Boolean.getBoolean("certificate.preview")) {
            Files.createDirectories(Path.of("target"));
            Files.write(Path.of("target", "certificate-preview.pdf"), pdf);
        }
    }
}
