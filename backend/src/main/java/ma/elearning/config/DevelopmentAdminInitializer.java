package ma.elearning.config;

import ma.elearning.user.*;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;

@Component
public class DevelopmentAdminInitializer implements ApplicationRunner {
    private static final Logger log=LoggerFactory.getLogger(DevelopmentAdminInitializer.class);
    private final UserRepository users; private final PasswordEncoder encoder;
    private final boolean enabled; private final String email; private final String password;
    public DevelopmentAdminInitializer(UserRepository users,PasswordEncoder encoder,
            @Value("${app.admin.enabled}") boolean enabled,@Value("${app.admin.email}") String email,
            @Value("${app.admin.password}") String password) {
        this.users=users;this.encoder=encoder;this.enabled=enabled;this.email=email;this.password=password;
    }
    @Override @Transactional public void run(ApplicationArguments args) {
        if(!enabled) return;
        if(email.isBlank()||password.isBlank()) throw new IllegalStateException("DEV_ADMIN_EMAIL et DEV_ADMIN_PASSWORD sont requis.");
        String normalized=email.trim().toLowerCase(Locale.ROOT);
        if(users.existsByEmail(normalized)) return;
        Admin admin=new Admin(); admin.setNom("Administrateur"); admin.setEmail(normalized);
        admin.setPasswordHash(encoder.encode(password)); admin.setRole(Role.ADMIN); admin.setStatut(AccountStatus.ACTIF);
        users.save(admin); log.info("Administrateur de développement créé pour {}",normalized);
    }
}

