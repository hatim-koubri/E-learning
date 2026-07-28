package ma.elearning.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.api.FormationDtos.FormationRequest;
import ma.elearning.formation.NiveauFormation;
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

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class FormationControllerIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
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

    private void prepare(User user, String email, Role role) {
        user.setNom("Test");
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setStatut(AccountStatus.ACTIF);
        users.saveAndFlush(user);
    }
}
