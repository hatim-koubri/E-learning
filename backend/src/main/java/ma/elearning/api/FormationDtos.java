package ma.elearning.api;

import jakarta.validation.constraints.*;
import ma.elearning.formation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class FormationDtos {
    private FormationDtos() {}

    public record FormationRequest(
            @NotBlank @Size(max = 180) String titre,
            @NotBlank @Size(max = 10000) String description,
            @NotBlank @Pattern(regexp = "^[a-zA-Z]{2,3}(-[a-zA-Z]{2})?$") String langue,
            @NotNull NiveauFormation niveau,
            @NotBlank @Size(max = 120) String categorie,
            @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal prix) {}
    public record FormationStatusRequest(@NotNull FormationStatus statut) {}

    public record FormationSummary(Long id, String titre, String description, String imageCouvertureKey,
                                   String langue, NiveauFormation niveau, String categorie, BigDecimal prix,
                                   FormationStatus statut, int nombreModules, Instant createdAt, Instant updatedAt) {}

    public record FormationDetail(Long id, String titre, String description, String imageCouvertureKey,
                                  String langue, NiveauFormation niveau, String categorie, BigDecimal prix,
                                  FormationStatus statut, Instant createdAt, Instant updatedAt,
                                  List<ModuleResponse> modules) {}

    public record ModuleRequest(@NotBlank @Size(max = 180) String titre,
                                @Size(max = 10000) String description,
                                boolean apercuGratuit) {}

    public record ModuleResponse(Long id, String titre, String description, int ordre,
                                 boolean apercuGratuit, List<ChapitreResponse> chapitres) {}

    public record ChapitreRequest(@NotBlank @Size(max = 180) String titre,
                                  @Size(max = 10000) String description) {}

    public record ChapitreResponse(Long id, String titre, String description, int ordre,
                                   List<RessourceResponse> ressources) {}

    public record ReorderRequest(@NotEmpty List<@NotNull Long> ids) {}

    public record YoutubeRequest(@NotBlank @Size(max = 180) String titre,
                                 @NotBlank @Size(max = 500) String urlYoutube) {}

    public record ResourceUpdateRequest(@NotBlank @Size(max = 180) String titre,
                                        boolean telechargeable) {}

    public record RessourceResponse(Long id, ResourceType type, String titre, int ordre,
                                    String nomOriginal, String typeMime, Long taille,
                                    String cleStockage, String urlYoutube, boolean telechargeable,
                                    ResourceStatus statut, Instant createdAt) {}
}
