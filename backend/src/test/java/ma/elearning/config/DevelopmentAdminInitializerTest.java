package ma.elearning.config;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.core.read.ListAppender;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import ma.elearning.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DevelopmentAdminInitializerTest {
    private UserRepository users;
    private PasswordEncoder encoder;
    private Validator validator;
    private ApplicationArguments arguments;

    @BeforeEach
    void setup() {
        users = mock(UserRepository.class);
        encoder = new BCryptPasswordEncoder(4);
        validator = Validation.buildDefaultValidatorFactory().getValidator();
        arguments = mock(ApplicationArguments.class);
    }

    @Test
    void beanIsAbsentWithoutLocalProfileEvenWhenEnvironmentRequestsCreation() {
        new ApplicationContextRunner()
                .withBean(UserRepository.class, () -> users)
                .withBean(PasswordEncoder.class, () -> encoder)
                .withBean(Validator.class, () -> validator)
                .withUserConfiguration(DevelopmentAdminInitializer.class)
                .withPropertyValues(
                        "app.admin.enabled=true",
                        "app.admin.email=admin@example.test",
                        "app.admin.password=StrongPassword1!")
                .run(context -> assertThat(context).doesNotHaveBean(DevelopmentAdminInitializer.class));
        verifyNoInteractions(users);
    }

    @Test
    void disabledInitializationDoesNothing() {
        initializer(false, "", "").run(arguments);
        verifyNoInteractions(users);
    }

    @Test
    void missingInvalidEmailAndWeakPasswordFailWithoutLeakingPassword() {
        assertInvalid("", "", "email", "password");
        assertInvalid("not-an-email", "StrongPassword1!", "email");
        assertInvalid("admin@example.test", "weak", "password");
    }

    @Test
    void validCreationNormalizesEmailHashesPasswordAndLogsNoSecret() {
        String rawPassword = "StrongPassword1!";
        AtomicReference<Admin> saved = new AtomicReference<>();
        when(users.findByEmail("admin@example.test")).thenReturn(Optional.empty());
        when(users.save(any(Admin.class))).thenAnswer(invocation -> {
            saved.set(invocation.getArgument(0));
            return saved.get();
        });
        Logger logger = (Logger) LoggerFactory.getLogger(DevelopmentAdminInitializer.class);
        ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            initializer(true, "  ADMIN@Example.Test ", rawPassword).run(arguments);
        } finally {
            logger.detachAppender(appender);
        }

        Admin admin = saved.get();
        assertNotNull(admin);
        assertEquals("admin@example.test", admin.getEmail());
        assertEquals(Role.ADMIN, admin.getRole());
        assertEquals(AccountStatus.ACTIF, admin.getStatut());
        assertTrue(encoder.matches(rawPassword, admin.getPasswordHash()));
        assertNotEquals(rawPassword, admin.getPasswordHash());
        assertTrue(appender.list.stream().noneMatch(event -> event.getFormattedMessage().contains(rawPassword)));
    }

    @Test
    void secondExecutionForAnActiveAdminIsIdempotentAndKeepsPassword() {
        Admin existing = account(new Admin(), Role.ADMIN, AccountStatus.ACTIF);
        String existingHash = "existing-bcrypt-hash";
        existing.setPasswordHash(existingHash);
        when(users.findByEmail("admin@example.test")).thenReturn(Optional.of(existing));

        initializer(true, "admin@example.test", "AnotherStrong1!").run(arguments);

        verify(users, never()).save(any());
        assertEquals(existingHash, existing.getPasswordHash());
    }

    @Test
    void participantTrainerAndInactiveAdminCollisionsFailWithoutMutation() {
        assertCollision(account(new Participant(), Role.PARTICIPANT, AccountStatus.ACTIF), "autre type de compte");
        assertCollision(account(new Formateur(), Role.FORMATEUR, AccountStatus.EN_ATTENTE), "autre type de compte");
        assertCollision(account(new Admin(), Role.ADMIN, AccountStatus.SUSPENDU), "n’est pas actif");
    }

    private void assertInvalid(String email, String password, String... fields) {
        IllegalStateException failure = assertThrows(IllegalStateException.class,
                () -> initializer(true, email, password).run(arguments));
        for (String field : fields) assertTrue(failure.getMessage().contains(field));
        if (!password.isBlank()) assertFalse(failure.getMessage().contains(password));
        verifyNoInteractions(users);
        clearInvocations(users);
    }

    private void assertCollision(User existing, String expectedMessage) {
        String originalHash = existing.getPasswordHash();
        Role originalRole = existing.getRole();
        AccountStatus originalStatus = existing.getStatut();
        when(users.findByEmail("admin@example.test")).thenReturn(Optional.of(existing));
        IllegalStateException failure = assertThrows(IllegalStateException.class,
                () -> initializer(true, "admin@example.test", "StrongPassword1!").run(arguments));
        assertTrue(failure.getMessage().contains(expectedMessage));
        assertEquals(originalHash, existing.getPasswordHash());
        assertEquals(originalRole, existing.getRole());
        assertEquals(originalStatus, existing.getStatut());
        verify(users, never()).save(any());
        reset(users);
    }

    private <T extends User> T account(T account, Role role, AccountStatus status) {
        account.setNom("Existing");
        account.setEmail("admin@example.test");
        account.setPasswordHash("unchanged-hash");
        account.setRole(role);
        account.setStatut(status);
        return account;
    }

    private DevelopmentAdminInitializer initializer(boolean enabled, String email, String password) {
        return new DevelopmentAdminInitializer(users, encoder, validator, enabled, email, password);
    }
}
