package ma.elearning.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.api.FormationDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.formation.*;
import ma.elearning.security.JwtService;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class FormationControllerIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired FormationService formations;
    @MockitoBean ObjectStorage storage;
    private Formateur trainer;
    private Participant participant;

    @BeforeEach
    void setUp() {
        trainer = new Formateur();
        prepare(trainer, "trainer@api.test", Role.FORMATEUR);
        participant = new Participant();
        prepare(participant, "participant@api.test", Role.PARTICIPANT);
    }

    @Test
    void validatedTrainerCanCreateAndListDtoResponses() throws Exception {
        FormationRequest request = new FormationRequest("Spring Boot", "Cours complet", "fr",
                NiveauFormation.INTERMEDIAIRE, "Développement", new BigDecimal("149.00"));
        mvc.perform(post("/api/formateur/formations")
                        .header("Authorization", "Bearer " + jwt.generate(trainer))
                        .contentType("application/json").content(json.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titre").value("Spring Boot"))
                .andExpect(jsonPath("$.formateur").doesNotExist());
        mvc.perform(get("/api/formateur/formations")
                        .header("Authorization", "Bearer " + jwt.generate(trainer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].titre").value("Spring Boot"));
    }

    @Test
    void participantCannotUseTrainerApi() throws Exception {
        mvc.perform(get("/api/formateur/formations")
                        .header("Authorization", "Bearer " + jwt.generate(participant)))
                .andExpect(status().isForbidden());
    }

    @Test
    void publicationLifecycleIntegrityAndPricingAreEnforced() {
        FormationRequest noClasses = new FormationRequest("Architecture", "Cours complet", "fr",
                NiveauFormation.INTERMEDIAIRE, "Développement", new BigDecimal("100.00"), BigDecimal.ZERO, false);
        Long id = formations.create(trainer.getEmail(), noClasses).id();
        BusinessException empty = assertThrows(BusinessException.class,
                () -> formations.changeStatus(trainer.getEmail(), id, FormationStatus.PUBLIEE));
        org.junit.jupiter.api.Assertions.assertEquals("INCOMPLETE_FORMATION", empty.getCode());
        Long module = formations.addModule(trainer.getEmail(), id, new ModuleRequest("Module", null, true)).id();
        assertThrows(BusinessException.class, () -> formations.changeStatus(trainer.getEmail(), id, FormationStatus.PUBLIEE));
        Long chapter = formations.addChapitre(trainer.getEmail(), module, new ChapitreRequest("Chapitre", null)).id();
        assertThrows(BusinessException.class, () -> formations.changeStatus(trainer.getEmail(), id, FormationStatus.PUBLIEE));
        Long resource = formations.addYoutube(trainer.getEmail(), chapter,
                new YoutubeRequest("Vidéo", "https://youtu.be/phase2-valid")).id();
        org.junit.jupiter.api.Assertions.assertEquals(FormationStatus.PUBLIEE,
                formations.changeStatus(trainer.getEmail(), id, FormationStatus.PUBLIEE).statut());
        BusinessException deletion = assertThrows(BusinessException.class,
                () -> formations.deleteResource(trainer.getEmail(), resource));
        org.junit.jupiter.api.Assertions.assertEquals("UNPUBLISH_REQUIRED", deletion.getCode());
        org.junit.jupiter.api.Assertions.assertEquals(FormationStatus.DEPUBLIEE,
                formations.changeStatus(trainer.getEmail(), id, FormationStatus.DEPUBLIEE).statut());
        org.junit.jupiter.api.Assertions.assertEquals(FormationStatus.ARCHIVEE,
                formations.changeStatus(trainer.getEmail(), id, FormationStatus.ARCHIVEE).statut());
        assertThrows(BusinessException.class, () -> formations.update(trainer.getEmail(), id, noClasses));
        assertThrows(BusinessException.class, () -> formations.changeStatus(trainer.getEmail(), id, FormationStatus.PUBLIEE));

        assertThrows(BusinessException.class, () -> formations.create(trainer.getEmail(),
                new FormationRequest("Contradictoire", "Cours", "fr", NiveauFormation.DEBUTANT,
                        "Test", BigDecimal.TEN, BigDecimal.ONE, true)));
    }

    private void prepare(User user, String email, Role role) {
        user.setNom("Test");
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setStatut(AccountStatus.ACTIF);
        users.saveAndFlush(user);
    }
}
