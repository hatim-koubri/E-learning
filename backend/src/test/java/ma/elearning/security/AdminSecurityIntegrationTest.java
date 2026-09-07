package ma.elearning.security;

import ma.elearning.user.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AdminSecurityIntegrationTest {
    private static final String SECRET="test-secret-key-with-at-least-thirty-two-characters";
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtService jwt;

    @Test
    void missingAndExpiredJwtReturnStructured401WithoutSensitiveDetails() throws Exception {
        Admin admin=save(new Admin(),"expired-admin@test.local",Role.ADMIN,AccountStatus.ACTIF);
        String expired=new JwtService(SECRET,-1).generate(admin);
        assertUnauthorized(null);
        assertUnauthorized("Bearer "+expired);
    }

    @Test
    void activeWrongRoleReturnsStructured403() throws Exception {
        Participant participant=save(new Participant(),"participant-security@test.local",
                Role.PARTICIPANT,AccountStatus.ACTIF);
        mvc.perform(get("/api/admin/formateurs/demandes")
                        .header("Authorization","Bearer "+jwt.generate(participant)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.message").value("Vous n’avez pas l’autorisation d’accéder à cette ressource."))
                .andExpect(jsonPath("$.errors").isMap())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }

    @Test
    void inactiveAccountJwtReturns401Not403() throws Exception {
        Admin admin=save(new Admin(),"inactive-admin@test.local",Role.ADMIN,AccountStatus.ACTIF);
        String token=jwt.generate(admin);
        admin.setStatut(AccountStatus.SUSPENDU);
        users.saveAndFlush(admin);
        assertUnauthorized("Bearer "+token);
    }

    @Test
    void healthIsAnonymousAndOtherActuatorEndpointsAreNotExposed() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
        mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/actuator/beans")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    private void assertUnauthorized(String authorization) throws Exception {
        var request=get("/api/admin/formateurs/demandes");
        if(authorization!=null)request.header("Authorization",authorization);
        mvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Authentification requise ou session expirée."))
                .andExpect(jsonPath("$.errors").isMap())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }

    @SuppressWarnings("unchecked")
    private <T extends User> T save(T user,String email,Role role,AccountStatus status){
        user.setNom("Compte sécurité");user.setEmail(email);user.setPasswordHash(encoder.encode("Password1!"));
        user.setRole(role);user.setStatut(status);return (T)users.saveAndFlush(user);
    }
}
