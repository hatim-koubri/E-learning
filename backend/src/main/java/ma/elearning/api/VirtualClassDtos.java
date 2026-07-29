package ma.elearning.api;
import jakarta.validation.constraints.*; import java.time.*; import java.util.List;
public final class VirtualClassDtos {
 private VirtualClassDtos(){}
 public record ClasseRequest(@NotNull Long formationId,@NotBlank @Size(max=180)String nom,@Size(max=10000)String description,
  @Min(1)int capacite,@NotNull LocalDate dateDebut,@NotNull LocalDate dateFin){}
 public record SessionRequest(@NotBlank @Size(max=180)String titre,@NotNull Instant dateDebut,@NotNull Instant dateFin,
  @NotBlank @Size(max=60)String fuseauHoraire){}
 public record MemberRequest(@NotNull Long participantId){}
 public record SessionResponse(Long id,String titre,Instant dateDebut,Instant dateFin,String fuseauHoraire,String statut){}
 public record MemberResponse(Long id,String nom,String email,String statut){}
 public record EligibleParticipant(Long id,String nom,String email){}
 public record ClasseResponse(Long id,Long formationId,String formation,String nom,String description,int capacite,
  LocalDate dateDebut,LocalDate dateFin,String statut,List<SessionResponse>seances,List<MemberResponse>membres){}
 public record JoinResponse(Long sessionId,String roomName,String baseUrl,String joinUrl){}
}
