package ma.elearning.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.api.FormationDtos.ChapitreRequest;
import ma.elearning.api.FormationDtos.FormationRequest;
import ma.elearning.api.FormationDtos.ModuleRequest;
import ma.elearning.api.FormationDtos.ReorderRequest;
import ma.elearning.api.FormationDtos.YoutubeRequest;
import ma.elearning.formation.FormationModuleRepository;
import ma.elearning.formation.FormationService;
import ma.elearning.formation.FormationStatus;
import ma.elearning.formation.NiveauFormation;
import ma.elearning.learning.InscriptionRepository;
import ma.elearning.learning.LearningService;
import ma.elearning.learning.TypeAcces;
import ma.elearning.security.JwtService;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.user.AccountStatus;
import ma.elearning.user.Formateur;
import ma.elearning.user.Participant;
import ma.elearning.user.Role;
import ma.elearning.user.User;
import ma.elearning.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ParticipantModuleVisibilityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired FormationService formations;
    @Autowired LearningService learning;
    @Autowired FormationModuleRepository modules;
    @Autowired InscriptionRepository inscriptions;
    @MockitoBean ObjectStorage storage;

    Formateur trainer;
    Formateur otherTrainer;
    Participant participant;
    Participant visitor;
    Long formationId;
    Long previewModuleId;
    Long lockedModuleId;
    Long emptyModuleId;

    @BeforeEach
    void setUp() {
        trainer = save(new Formateur(), "module-owner@test.local", Role.FORMATEUR);
        otherTrainer = save(new Formateur(), "module-other@test.local", Role.FORMATEUR);
        participant = save(new Participant(), "module-participant@test.local", Role.PARTICIPANT);
        visitor = save(new Participant(), "module-visitor@test.local", Role.PARTICIPANT);

        formationId = formations.create(trainer.getEmail(), request("Programme principal")).id();
        previewModuleId = formations.addModule(trainer.getEmail(), formationId,
                new ModuleRequest("Introduction", null, true)).id();
        Long previewChapter = formations.addChapitre(trainer.getEmail(), previewModuleId,
                new ChapitreRequest("Bienvenue", null)).id();
        formations.addYoutube(trainer.getEmail(), previewChapter,
                new YoutubeRequest("Présentation", "https://youtu.be/preview-module"));

        lockedModuleId = formations.addModule(trainer.getEmail(), formationId,
                new ModuleRequest("Approfondissement", null, false)).id();
        Long lockedChapter = formations.addChapitre(trainer.getEmail(), lockedModuleId,
                new ChapitreRequest("Cas pratique", null)).id();
        formations.addYoutube(trainer.getEmail(), lockedChapter,
                new YoutubeRequest("Démonstration", "https://youtu.be/locked-module"));

        formations.changeStatus(trainer.getEmail(), formationId, FormationStatus.PUBLIEE);
        emptyModuleId = formations.addModule(trainer.getEmail(), formationId,
                new ModuleRequest("Questions à venir", null, false)).id();
    }

    @Test
    void enrolledParticipantSeesModuleCreatedAfterEnrollmentIncludingEmptyModule() throws Exception {
        learning.enroll(participant.getEmail(), formationId);
        assertEquals(TypeAcces.CONTENU, inscriptions
                .findByParticipantEmailAndFormationId(participant.getEmail(), formationId)
                .orElseThrow().getTypeAcces());

        String title = "Nouveau module après inscription";
        String response = mvc.perform(post("/api/formateur/formations/" + formationId + "/modules")
                        .header("Authorization", bearer(trainer))
                        .contentType("application/json")
                        .content(json.writeValueAsString(new ModuleRequest(title, "Module encore vide", false))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titre").value(title))
                .andExpect(jsonPath("$.chapitres").isEmpty())
                .andReturn().getResponse().getContentAsString();
        Long createdId = json.readTree(response).path("id").longValue();

        var stored = modules.findById(createdId).orElseThrow();
        assertEquals(formationId, stored.getFormation().getId());
        assertEquals(3, stored.getPosition());
        assertNotNull(stored.getCreatedAt());

        mvc.perform(get("/api/catalogue/" + formationId)
                        .header("Authorization", bearer(participant)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modules.length()").value(2))
                .andExpect(jsonPath("$.modules[?(@.id == %s)]".formatted(createdId)).isEmpty());

        mvc.perform(get("/api/participant/formations/" + formationId + "/parcours")
                        .header("Authorization", bearer(participant)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modules.length()").value(2))
                .andExpect(jsonPath("$.modules[?(@.id == %s)]".formatted(createdId)).isEmpty());
    }

    @Test
    void participantProgramKeepsTrainerOrder() {
        learning.enroll(participant.getEmail(), formationId);
        formations.reorderModules(trainer.getEmail(), formationId,
                new ReorderRequest(List.of(emptyModuleId, previewModuleId, lockedModuleId)));

        var detail = learning.detail(formationId, participant.getEmail());
        assertEquals(List.of(previewModuleId, lockedModuleId),
                detail.modules().stream().map(LearningDtos.PublicModule::id).toList());
        assertEquals(List.of(0, 1),
                detail.modules().stream().map(LearningDtos.PublicModule::ordre).toList());
    }

    @Test
    void visitorReceivesOnlyLockedMetadataOutsideFreePreview() throws Exception {
        mvc.perform(get("/api/catalogue/" + formationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inscrit").value(false))
                .andExpect(jsonPath("$.modules[0].verrouille").value(false))
                .andExpect(jsonPath("$.modules[1].verrouille").value(true))
                .andExpect(jsonPath("$.modules[1].chapitres[0].verrouille").value(true))
                .andExpect(jsonPath("$.modules[1].chapitres[0].ressources[0].verrouille").value(true))
                .andExpect(jsonPath("$.modules[1].chapitres[0].ressources[0].url").doesNotExist());

        mvc.perform(get("/api/participant/formations/" + formationId + "/parcours")
                        .header("Authorization", bearer(visitor)))
                .andExpect(status().isForbidden());
    }

    @Test
    void moduleAndResourceFromAnotherFormationAreNeverExposed() throws Exception {
        learning.enroll(participant.getEmail(), formationId);
        Long otherFormation = formations.create(otherTrainer.getEmail(), request("Autre programme")).id();
        Long otherModule = formations.addModule(otherTrainer.getEmail(), otherFormation,
                new ModuleRequest("Module confidentiel", null, true)).id();
        Long otherChapter = formations.addChapitre(otherTrainer.getEmail(), otherModule,
                new ChapitreRequest("Chapitre confidentiel", null)).id();
        Long otherResource = formations.addYoutube(otherTrainer.getEmail(), otherChapter,
                new YoutubeRequest("Ressource confidentielle", "https://youtu.be/foreign-module")).id();
        formations.changeStatus(otherTrainer.getEmail(), otherFormation, FormationStatus.PUBLIEE);

        String body = mvc.perform(get("/api/catalogue/" + formationId)
                        .header("Authorization", bearer(participant)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode response = json.readTree(body);
        assertFalse(response.path("modules").findValuesAsText("id").contains(otherModule.toString()));
        assertTrue(response.path("modules").findValuesAsText("titre").stream()
                .noneMatch("Module confidentiel"::equals));

        mvc.perform(get("/api/catalogue/" + formationId + "/ressources/" + otherResource + "/acces")
                        .header("Authorization", bearer(participant)))
                .andExpect(status().isNotFound());
    }

    private String bearer(User user) {
        return "Bearer " + jwt.generate(user);
    }

    private FormationRequest request(String title) {
        return new FormationRequest(title, "Formation de recette des modules", "fr",
                NiveauFormation.DEBUTANT, "Développement", new BigDecimal("49.00"));
    }

    @SuppressWarnings("unchecked")
    private <T extends User> T save(T user, String email, Role role) {
        user.setNom(role.name() + " modules");
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setStatut(AccountStatus.ACTIF);
        return (T) users.saveAndFlush(user);
    }
}
