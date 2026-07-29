package ma.elearning.api;
import jakarta.validation.Valid; import ma.elearning.api.VirtualClassDtos.*; import ma.elearning.virtualclass.VirtualClassService;
import org.springframework.security.core.*; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api")
public class VirtualClassController {
 private final VirtualClassService service; public VirtualClassController(VirtualClassService s){service=s;}
 @GetMapping("/formateur/classes") List<ClasseResponse> trainer(Authentication a){return service.trainerClasses(a.getName());}
 @PostMapping("/formateur/classes") ClasseResponse create(Authentication a,@Valid @RequestBody ClasseRequest r){return service.create(a.getName(),r);}
 @PutMapping("/formateur/classes/{id}") ClasseResponse update(Authentication a,@PathVariable Long id,@Valid @RequestBody ClasseRequest r){return service.update(a.getName(),id,r);}
 @PostMapping("/formateur/classes/{id}/membres") ClasseResponse member(Authentication a,@PathVariable Long id,@Valid @RequestBody MemberRequest r){return service.addMember(a.getName(),id,r.participantId());}
 @GetMapping("/formateur/classes/{id}/participants-eligibles") List<EligibleParticipant> eligible(Authentication a,@PathVariable Long id){return service.eligible(a.getName(),id);}
 @PostMapping("/formateur/classes/{id}/seances") SessionResponse session(Authentication a,@PathVariable Long id,@Valid @RequestBody SessionRequest r){return service.schedule(a.getName(),id,r);}
 @PutMapping("/formateur/seances/{id}") SessionResponse updateSession(Authentication a,@PathVariable Long id,@Valid @RequestBody SessionRequest r){return service.updateSession(a.getName(),id,r);}
 @PostMapping("/formateur/seances/{id}/annulation") SessionResponse cancel(Authentication a,@PathVariable Long id){return service.cancel(a.getName(),id);}
 @GetMapping("/formateur/seances/{id}/join") JoinResponse trainerJoin(Authentication a,@PathVariable Long id){return service.join(a.getName(),id,true);}
 @GetMapping("/participant/classes") List<ClasseResponse> mine(Authentication a){return service.mine(a.getName());}
 @GetMapping("/participant/seances/{id}/join") JoinResponse join(Authentication a,@PathVariable Long id){return service.join(a.getName(),id,false);}
}
