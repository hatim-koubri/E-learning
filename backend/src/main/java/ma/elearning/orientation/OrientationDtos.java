package ma.elearning.orientation;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OrientationDtos {
    private OrientationDtos(){}
    public record CreateConversationRequest(@Size(max=64) String sessionId){}
    public record SendMessageRequest(@NotBlank @Size(max=2000) String contenu,
                                     @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestId){}
    public record PreferenceUpdate(@Size(max=500) String objectif,@Size(max=30) String niveau,
        @Size(max=10) List<@Size(max=80) String> competences,@Size(max=20) String langue,
        @DecimalMin("0") @DecimalMax("1000000") BigDecimal budget,
        @Min(0) @Max(10080) Integer minutesHebdomadaires,@Size(max=40) String formatPedagogique,Boolean besoinClasses){}
    public record MessageResponse(Long id,String role,String contenu,String statut,String modele,Long dureeMs,Instant createdAt){}
    public record RecommendationResponse(Long formationId,String titre,String categorie,String formateur,
        String niveau,String langue,BigDecimal prix,BigDecimal prixAvecClasses,boolean classesDisponibles,
        int score,int rang,List<String> raisons,List<String> modules,String href){}
    public record ConversationSummary(Long id,String titre,String statut,Instant createdAt,Instant updatedAt){}
    public record ConversationResponse(Long id,String sessionId,String titre,String statut,PreferenceUpdate profil,
        List<MessageResponse> messages,List<RecommendationResponse> recommandations,Instant createdAt,Instant updatedAt){}
    public record SendMessageResponse(MessageResponse message,List<RecommendationResponse> recommandations,PreferenceUpdate profil){}
    public record AiAnalysis(String answer,PreferenceUpdate preferences,Boolean search,String missingQuestion){}
}
