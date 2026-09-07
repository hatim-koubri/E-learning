package ma.elearning.api;

import jakarta.validation.constraints.*;
import ma.elearning.auth.AccountCredentialPolicy;
import ma.elearning.user.*;
import java.time.Instant;

public final class AuthDtos {
    private AuthDtos() {}
    public record RegisterRequest(
            @NotBlank @Size(max=120) String nom,
            @NotBlank @Email @Size(max=190) String email,
            @Size(max=30) String telephone,
            @NotBlank
            @Size(min=AccountCredentialPolicy.PASSWORD_MIN_LENGTH,max=AccountCredentialPolicy.PASSWORD_MAX_LENGTH)
            @Pattern(regexp=AccountCredentialPolicy.REQUIRED_PATTERN,
                    message=AccountCredentialPolicy.REQUIREMENTS_MESSAGE)
            String password) {}
    public record TrainerRegisterRequest(
            @NotBlank @Size(max=120) String nom,
            @NotBlank @Email @Size(max=190) String email,
            @Size(max=30) String telephone,
            @NotBlank @Size(max=160) String specialite,
            @NotBlank @Size(max=3000) String biographie,
            @NotBlank @Size(min=AccountCredentialPolicy.PASSWORD_MIN_LENGTH,max=AccountCredentialPolicy.PASSWORD_MAX_LENGTH)
            @Pattern(regexp=AccountCredentialPolicy.REQUIRED_PATTERN,message=AccountCredentialPolicy.REQUIREMENTS_MESSAGE)
            String password) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record ForgotPasswordRequest(@NotBlank @Email String email) {}
    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank
            @Size(min=AccountCredentialPolicy.PASSWORD_MIN_LENGTH,max=AccountCredentialPolicy.PASSWORD_MAX_LENGTH)
            @Pattern(regexp=AccountCredentialPolicy.REQUIRED_PATTERN,
                    message=AccountCredentialPolicy.REQUIREMENTS_MESSAGE)
            String password) {}
    public record UserResponse(Long id, String nom, String email, String telephone,
                               Role role, AccountStatus statut, Instant createdAt) {}
    public record AuthResponse(String accessToken, String tokenType, long expiresInSeconds, UserResponse user) {}
    public record MessageResponse(String message) {}
}
