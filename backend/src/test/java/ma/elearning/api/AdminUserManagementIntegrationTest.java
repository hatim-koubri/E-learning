package ma.elearning.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.admin.AdminAuditEventRepository;
import ma.elearning.security.JwtService;
import ma.elearning.user.*;
import org.junit.jupiter.api.*;
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

@SpringBootTest @AutoConfigureMockMvc
@DirtiesContext(classMode= DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AdminUserManagementIntegrationTest {
    @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder; @Autowired JwtService jwt; @Autowired AdminAuditEventRepository audit;
    @MockitoBean JavaMailSender mail; private Admin admin; private Participant participant;
    @BeforeEach void setup(){admin=save(new Admin(),"admin-users@test.local",Role.ADMIN,AccountStatus.ACTIF);participant=save(new Participant(),"participant-users@test.local",Role.PARTICIPANT,AccountStatus.ACTIF);}

    @Test void searchIsServerPagedFilteredAndDoesNotExposeCredentials() throws Exception {
        mvc.perform(get("/api/admin/utilisateurs").param("q","participant-users").param("role","PARTICIPANT").param("page","0").param("size","1").header("Authorization",auth()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.content[0].id").value(participant.getId())).andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());
    }

    @Test void suspensionInvalidatesExistingJwtAndWritesAudit() throws Exception {
        String old="Bearer "+jwt.generate(participant);
        mvc.perform(post("/api/admin/utilisateurs/"+participant.getId()+"/suspension").header("Authorization",auth()).contentType("application/json")
                .content(json.writeValueAsString(new AdminUserDtos.LifecycleRequest("Risque QA",participant.getLifecycleVersion()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.statut").value("SUSPENDU"));
        mvc.perform(get("/api/notifications").header("Authorization",old)).andExpect(status().isUnauthorized());
        Assertions.assertEquals("USER_SUSPENDED",audit.findAll().getFirst().getAction());
    }

    @Test void staleVersionAndSelfSuspensionAreRejected() throws Exception {
        mvc.perform(post("/api/admin/utilisateurs/"+participant.getId()+"/suspension").header("Authorization",auth()).contentType("application/json")
                .content(json.writeValueAsString(new AdminUserDtos.LifecycleRequest("Risque",99L))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("USER_STATE_CHANGED"));
        mvc.perform(post("/api/admin/utilisateurs/"+admin.getId()+"/suspension").header("Authorization",auth()).contentType("application/json")
                .content(json.writeValueAsString(new AdminUserDtos.LifecycleRequest("Test",admin.getLifecycleVersion()))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SELF_SUSPENSION_FORBIDDEN"));
    }

    @Test void dashboardReturnsExactDatabaseCountsAndServerFilledSeries() throws Exception {
        mvc.perform(get("/api/admin/dashboard").param("months","3").header("Authorization",auth()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.indicators.participants").value(1))
                .andExpect(jsonPath("$.indicators.formateurs").value(0)).andExpect(jsonPath("$.monthlySeries.length()").value(3))
                .andExpect(jsonPath("$.timezone").value("UTC"));
    }

    private String auth(){return "Bearer "+jwt.generate(admin);}
    @SuppressWarnings("unchecked") private <T extends User>T save(T user,String email,Role role,AccountStatus status){user.setNom("Compte QA");user.setEmail(email);user.setPasswordHash(encoder.encode("Password1!"));user.setRole(role);user.setStatut(status);return (T)users.saveAndFlush(user);}
}
