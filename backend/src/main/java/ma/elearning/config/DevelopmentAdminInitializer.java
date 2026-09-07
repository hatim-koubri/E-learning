package ma.elearning.config;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.elearning.auth.AccountCredentialPolicy;
import ma.elearning.user.*;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.Comparator;
import java.util.Locale;
import java.util.Set;

@Component
@Profile("local")
public class DevelopmentAdminInitializer implements ApplicationRunner {
    private static final Logger log=LoggerFactory.getLogger(DevelopmentAdminInitializer.class);
    private final UserRepository users; private final PasswordEncoder encoder;
    private final Validator validator;
    private final boolean enabled; private final String email; private final String password;
    public DevelopmentAdminInitializer(UserRepository users,PasswordEncoder encoder,
            Validator validator,
            @Value("${app.admin.enabled:false}") boolean enabled,@Value("${app.admin.email:}") String email,
            @Value("${app.admin.password:}") String password) {
        this.users=users;this.encoder=encoder;this.validator=validator;
        this.enabled=enabled;this.email=email;this.password=password;
    }
    @Override @Transactional public void run(ApplicationArguments args) {
        if(!enabled) return;
        String normalized=email.trim().toLowerCase(Locale.ROOT);
        validateConfiguration(normalized, password);
        User existing=users.findByEmail(normalized).orElse(null);
        if(existing!=null){
            if(existing instanceof Admin && existing.getRole()==Role.ADMIN && existing.getStatut()==AccountStatus.ACTIF){
                log.info("Initialisation de l’administrateur local déjà satisfaite");
                return;
            }
            if(existing instanceof Admin){
                throw new IllegalStateException("L’administrateur local configuré existe mais son compte n’est pas actif.");
            }
            throw new IllegalStateException("L’email de l’administrateur local est déjà utilisé par un autre type de compte.");
        }
        Admin admin=new Admin(); admin.setNom("Administrateur"); admin.setEmail(normalized);
        admin.setPasswordHash(encoder.encode(password)); admin.setRole(Role.ADMIN); admin.setStatut(AccountStatus.ACTIF);
        users.save(admin); log.info("Administrateur local créé");
    }
    private void validateConfiguration(String normalizedEmail,String rawPassword){
        Set<ConstraintViolation<LocalAdminCredentials>> violations=validator.validate(
                new LocalAdminCredentials(normalizedEmail,rawPassword));
        if(violations.isEmpty())return;
        String fields=violations.stream().map(value->value.getPropertyPath().toString())
                .distinct().sorted(Comparator.naturalOrder()).reduce((left,right)->left+", "+right).orElse("configuration");
        throw new IllegalStateException("Configuration de l’administrateur local invalide : "+fields+".");
    }
    private record LocalAdminCredentials(
            @NotBlank @Email @Size(max=190) String email,
            @NotBlank
            @Size(min=AccountCredentialPolicy.PASSWORD_MIN_LENGTH,max=AccountCredentialPolicy.PASSWORD_MAX_LENGTH)
            @Pattern(regexp=AccountCredentialPolicy.REQUIRED_PATTERN,message=AccountCredentialPolicy.REQUIREMENTS_MESSAGE)
            String password){}
}
