package ma.elearning.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import ma.elearning.user.AccountStatus;
import java.time.Instant;

public final class AdminDtos {
    private AdminDtos() {}
    public record RefusalRequest(@NotBlank @Size(max=500) String motif) {}
    public record FormateurResponse(Long id, String nom, String email, String telephone,
                                    AccountStatus statut, String motifRefus,
                                    Instant dateDecision, Instant createdAt) {}
}

