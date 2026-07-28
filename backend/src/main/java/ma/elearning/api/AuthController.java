package ma.elearning.api;

import jakarta.validation.Valid;
import ma.elearning.auth.AuthService;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import static ma.elearning.api.AuthDtos.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth=auth; }
    @PostMapping("/register/participant")
    ResponseEntity<UserResponse> participant(@Valid @RequestBody RegisterRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registerParticipant(r));
    }
    @PostMapping("/register/formateur")
    ResponseEntity<UserResponse> formateur(@Valid @RequestBody RegisterRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registerFormateur(r));
    }
    @PostMapping("/login") AuthResponse login(@Valid @RequestBody LoginRequest r) { return auth.login(r); }
    @PostMapping("/forgot-password") MessageResponse forgot(@Valid @RequestBody ForgotPasswordRequest r) {
        auth.forgotPassword(r); return new MessageResponse("Si ce compte existe, un email de réinitialisation a été envoyé.");
    }
    @PostMapping("/reset-password") MessageResponse reset(@Valid @RequestBody ResetPasswordRequest r) {
        auth.resetPassword(r); return new MessageResponse("Le mot de passe a été modifié.");
    }
    @GetMapping("/me") UserResponse me(Authentication authentication) { return auth.me(authentication.getName()); }
}

