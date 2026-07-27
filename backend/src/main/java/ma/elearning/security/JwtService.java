package ma.elearning.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import ma.elearning.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final Duration duration;
    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-minutes}") long minutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.duration = Duration.ofMinutes(minutes);
    }
    public String generate(User user) {
        Instant now = Instant.now();
        return Jwts.builder().subject(user.getEmail()).claim("role", user.getRole().name())
                .issuedAt(Date.from(now)).expiration(Date.from(now.plus(duration))).signWith(key).compact();
    }
    public String subject(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
    }
    public long expiresInSeconds() { return duration.toSeconds(); }
}

