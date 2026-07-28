package ma.elearning.auth;

import ma.elearning.api.AuthDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@DirtiesContext(classMode= DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PasswordResetTest {
    @Autowired AuthService auth; @Autowired UserRepository users; @Autowired PasswordResetTokenRepository tokens;
    @Test void validTokenIsSingleUseAndExpiredTokenIsRejected() throws Exception {
        auth.registerParticipant(new RegisterRequest("Test","test@reset.com",null,"Password1!"));
        User user=users.findByEmail("test@reset.com").orElseThrow();
        PasswordResetToken token=create("raw-token",user,Instant.now().plusSeconds(60));
        auth.resetPassword(new ResetPasswordRequest("raw-token","NewPassword2!"));
        assertNotNull(tokens.findByTokenHash(token.getTokenHash()).orElseThrow().getUsedAt());
        assertNotNull(auth.login(new LoginRequest("test@reset.com","NewPassword2!")).accessToken());
        assertThrows(BusinessException.class,()->auth.resetPassword(new ResetPasswordRequest("raw-token","AgainPass3!")));
        create("expired",user,Instant.now().minusSeconds(1));
        assertThrows(BusinessException.class,()->auth.resetPassword(new ResetPasswordRequest("expired","AgainPass3!")));
    }
    private PasswordResetToken create(String raw,User user,Instant expiry) throws Exception {
        PasswordResetToken t=new PasswordResetToken();
        t.setTokenHash(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8))));
        t.setUser(user);t.setExpiresAt(expiry);return tokens.save(t);
    }
}
