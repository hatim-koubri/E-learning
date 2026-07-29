package ma.elearning.api;
import jakarta.validation.Valid;
import ma.elearning.api.QuizDtos.*;
import ma.elearning.quiz.QuizService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api")
public class QuizController {
 private final QuizService service;public QuizController(QuizService service){this.service=service;}
 @GetMapping("/formateur/formations/{formationId}/quiz") List<QuizAdmin> list(Authentication a,@PathVariable Long formationId){return service.trainerList(a.getName(),formationId);}
 @PostMapping("/formateur/formations/{formationId}/quiz") @ResponseStatus(HttpStatus.CREATED) QuizAdmin create(Authentication a,@PathVariable Long formationId,@Valid @RequestBody QuizRequest r){return service.create(a.getName(),formationId,r);}
 @PutMapping("/formateur/quiz/{id}") QuizAdmin update(Authentication a,@PathVariable Long id,@Valid @RequestBody QuizRequest r){return service.update(a.getName(),id,r);}
 @DeleteMapping("/formateur/quiz/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(Authentication a,@PathVariable Long id){service.delete(a.getName(),id);}
 @GetMapping("/participant/formations/{formationId}/quiz") List<QuizParticipant> participantList(Authentication a,@PathVariable Long formationId){return service.participantList(a.getName(),formationId);}
 @GetMapping("/participant/quiz/{id}") QuizParticipant open(Authentication a,@PathVariable Long id){return service.open(a.getName(),id);}
 @PostMapping("/participant/quiz/{id}/tentatives") QuizResult submit(Authentication a,@PathVariable Long id,@Valid @RequestBody Submission r){return service.submit(a.getName(),id,r);}
}
