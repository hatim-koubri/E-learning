package ma.elearning.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.api.AuthDtos.RegisterRequest;
import ma.elearning.security.JwtService;
import ma.elearning.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
@DirtiesContext(classMode= DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AuthControllerIntegrationTest {
    @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder; @Autowired JwtService jwt;
    @Test void registerDoesNotExposePassword() throws Exception {
        mvc.perform(post("/api/auth/register/participant").contentType("application/json")
                .content(json.writeValueAsString(new RegisterRequest("Test","test@example.com",null,"Password1!"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.passwordHash").doesNotExist());
    }
    @Test void nonAdminCannotReadRequests() throws Exception {
        mvc.perform(get("/api/admin/formateurs/demandes")).andExpect(status().isUnauthorized());
    }
    @Test void authenticatedParticipantGetsForbiddenOnAdminRoute() throws Exception {
        Participant participant=new Participant();
        participant.setNom("Participant"); participant.setEmail("participant@roles.test");
        participant.setPasswordHash(encoder.encode("Password1!"));
        participant.setRole(Role.PARTICIPANT); participant.setStatut(AccountStatus.ACTIF);
        users.save(participant);
        mvc.perform(get("/api/admin/formateurs/demandes")
                        .header("Authorization","Bearer "+jwt.generate(participant)))
                .andExpect(status().isForbidden());
    }
}
