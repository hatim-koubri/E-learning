package ma.elearning.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.security.JwtService;
import ma.elearning.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AdminFormateurControllerIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtService jwt;
    @MockitoBean JavaMailSender mail;
    private Admin admin;
    private Formateur pending;
    private Formateur active;
    private Formateur refused;
    private Participant participant;

    @BeforeEach
    void setup() {
        admin = save(new Admin(), "detail-admin@test.local", Role.ADMIN, AccountStatus.ACTIF);
        pending = save(new Formateur(), "detail-pending@test.local", Role.FORMATEUR, AccountStatus.EN_ATTENTE);
        active = save(new Formateur(), "detail-active@test.local", Role.FORMATEUR, AccountStatus.ACTIF);
        refused = save(new Formateur(), "detail-refused@test.local", Role.FORMATEUR, AccountStatus.REFUSE);
        participant = save(new Participant(), "detail-participant@test.local", Role.PARTICIPANT, AccountStatus.ACTIF);
    }

    @Test
    void detailOnlyExposesAPendingTrainerAndNoCredential() throws Exception {
        mvc.perform(get("/api/admin/formateurs/demandes/" + pending.getId()).header("Authorization", adminAuthorization()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profil.id").value(pending.getId()))
                .andExpect(jsonPath("$.profil.statut").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.profil.email").value(pending.getEmail()))
                .andExpect(jsonPath("$.justificatifs").isArray())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.accessToken").doesNotExist());
        mvc.perform(get("/api/admin/formateurs/demandes/" + active.getId()).header("Authorization", adminAuthorization()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/formateurs/demandes/" + refused.getId()).header("Authorization", adminAuthorization()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/formateurs/demandes/" + participant.getId()).header("Authorization", adminAuthorization()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/formateurs/demandes/999999").header("Authorization", adminAuthorization()))
                .andExpect(status().isNotFound());
    }

    @Test
    void pendingRequestsArePagedWithGlobalCountAndStableOldestFirstOrder() throws Exception {
        Formateur secondPending=save(new Formateur(),"second-pending@test.local",Role.FORMATEUR,AccountStatus.EN_ATTENTE);
        mvc.perform(get("/api/admin/formateurs/demandes").param("page","0").param("size","1")
                        .header("Authorization",adminAuthorization()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.content[0].id").value(pending.getId()));
        mvc.perform(get("/api/admin/formateurs/demandes").param("page","1").param("size","1")
                        .header("Authorization",adminAuthorization()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(secondPending.getId()));
    }

    @Test
    void detailRejectsAnonymousParticipantAndTrainer() throws Exception {
        mvc.perform(get("/api/admin/formateurs/demandes/" + pending.getId()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/formateurs/demandes/" + pending.getId())
                        .header("Authorization", "Bearer " + jwt.generate(participant)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/formateurs/demandes/" + pending.getId())
                        .header("Authorization", "Bearer " + jwt.generate(active)))
                .andExpect(status().isForbidden());
    }

    @Test
    void endpointRecordsAuthenticatedAdminAndOldTrainerJwtObservesRefusal() throws Exception {
        String oldToken = jwt.generate(pending);
        mvc.perform(patch("/api/admin/formateurs/" + pending.getId() + "/refuser")
                        .header("Authorization", adminAuthorization()).contentType("application/json")
                        .content(json.writeValueAsString(new AdminDtos.RefusalRequest("Dossier incomplet"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("REFUSE"))
                .andExpect(jsonPath("$.decideurAdminId").value(admin.getId()));
        mvc.perform(get("/api/formateur/engagement")
                        .header("Authorization", "Bearer " + oldToken))
                .andExpect(status().isUnauthorized());
    }

    private String adminAuthorization() {
        return "Bearer " + jwt.generate(admin);
    }

    @SuppressWarnings("unchecked")
    private <T extends User> T save(T user, String email, Role role, AccountStatus status) {
        user.setNom("Compte test");
        user.setEmail(email);
        user.setPasswordHash(encoder.encode("Password1!"));
        user.setRole(role);
        user.setStatut(status);
        return (T) users.saveAndFlush(user);
    }
}
