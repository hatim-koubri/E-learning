package ma.elearning.api;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
public final class QuizDtos {
 private QuizDtos(){}
 public record AnswerEdit(Long id,@NotBlank @Size(max=1000)String libelle,boolean correcte,@Min(0)int ordre){}
 public record QuestionEdit(Long id,@NotBlank @Size(max=10000)String libelle,@Min(0)int ordre,
  @NotNull @DecimalMin("0.01")BigDecimal points,@NotEmpty List<@Valid AnswerEdit> reponses){}
 public record QuizRequest(@NotBlank @Size(max=180)String titre,@NotNull @DecimalMin("0") @DecimalMax("100")BigDecimal scoreMinimal,
  boolean important,boolean publie,@NotEmpty List<@Valid QuestionEdit> questions){}
 public record AnswerAdmin(Long id,String libelle,boolean correcte,int ordre){}
 public record QuestionAdmin(Long id,String libelle,int ordre,BigDecimal points,List<AnswerAdmin> reponses){}
 public record QuizAdmin(Long id,Long formationId,String titre,int ordre,BigDecimal scoreMinimal,boolean important,boolean publie,List<QuestionAdmin> questions){}
 public record AnswerParticipant(Long id,String libelle,int ordre){}
 public record QuestionParticipant(Long id,String libelle,int ordre,BigDecimal points,List<AnswerParticipant> reponses){}
 public record QuizParticipant(Long id,String titre,BigDecimal scoreMinimal,boolean important,int tentativesRestantes,Instant prochaineDisponibilite,List<QuestionParticipant> questions){}
 public record Submission(@NotNull Map<@NotNull Long,@NotEmpty List<@NotNull Long>> reponses){}
 public record QuizResult(Long tentativeId,BigDecimal score,BigDecimal scoreMaximal,BigDecimal pourcentage,boolean reussi,Instant dateSoumission){}
}
