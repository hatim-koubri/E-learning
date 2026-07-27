package ma.elearning.api;

import jakarta.validation.constraints.*;
import ma.elearning.user.*;
import java.time.Instant;

public final class AuthDtos {
    private AuthDtos() {}
    public record RegisterRequest(
            @NotBlank @Size(max=120) String nom,
            @NotBlank @Email @Size(max=190) String email,
            @Size(max=30) String telephone,
            @NotBlank @Size(min=8,max=72)
            @Pattern(regexp="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                    message="doit contenir une minuscule, une majuscule, un chiffre et un caractère spécial")
            String password) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record ForgotPasswordRequest(@NotBlank @Email String email) {}
    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min=8,max=72)
            @Pattern(regexp="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                    message="doit contenir une minuscule, une majuscule, un chiffre et un caractère spécial")
            String password) {}
    public record UserResponse(Long id, String nom, String email, String telephone,
                               Role role, AccountStatus statut, Instant createdAt) {}
    public record AuthResponse(String accessToken, String tokenType, long expiresInSeconds, UserResponse user) {}
    public record MessageResponse(String message) {}
}

