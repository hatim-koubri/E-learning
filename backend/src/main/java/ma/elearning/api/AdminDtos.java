package ma.elearning.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import ma.elearning.user.AccountStatus;
import ma.elearning.user.FormateurDecision;
import java.time.Instant;
import java.util.List;

public final class AdminDtos {
    private AdminDtos() {}
    public record RefusalRequest(@NotBlank @Size(max=500) String motif) {}
    public record FormateurResponse(Long id, String nom, String email, String telephone,
                                    AccountStatus statut, FormateurDecision decision,
                                    Long decideurAdminId, String motifRefus,
                                    Instant dateDecision, Instant createdAt,
                                    String specialite,String biographie) {}
    public record TrainerCredentialResponse(Long id,String type,String nomFichier,String contentType,
                                            long taille,Instant ajouteLe,String urlTemporaire){}
    public record FormateurApplicationResponse(FormateurResponse profil,
                                               List<TrainerCredentialResponse> justificatifs){}
    public record FormateurPage(List<FormateurResponse> content, int page, int totalPages,
                                long totalElements) {}
}
