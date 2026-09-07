package ma.elearning.orientation;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import static ma.elearning.orientation.OrientationDtos.*;

@RestController @RequestMapping("/api/orientation")
@Tag(name="Conseiller pédagogique",description="Conversations d’orientation avec recommandations calculées depuis le catalogue publié.")
public class OrientationController {
    private final OrientationService service; public OrientationController(OrientationService s){service=s;}
    @PostMapping("/conversations") @ResponseStatus(HttpStatus.CREATED)
    ConversationResponse create(@RequestBody(required=false) @Valid CreateConversationRequest request,Authentication auth){return service.create(request,auth);}
    @GetMapping("/conversations") List<ConversationSummary> list(Authentication auth){return service.list(auth);}
    @GetMapping("/conversations/{id}") ConversationResponse get(@PathVariable Long id,@RequestHeader(value="X-Orientation-Session",required=false) String session,Authentication auth){return service.get(id,session,auth);}
    @PostMapping("/conversations/{id}/messages") SendMessageResponse send(@PathVariable Long id,@RequestHeader(value="X-Orientation-Session",required=false) String session,Authentication auth,@Valid @RequestBody SendMessageRequest request){return service.send(id,session,auth,request);}
    @PostMapping("/conversations/{id}/preferences") ConversationResponse preferences(@PathVariable Long id,@RequestHeader(value="X-Orientation-Session",required=false) String session,Authentication auth,@Valid @RequestBody PreferenceUpdate request){return service.updatePreferences(id,session,auth,request);}
    @DeleteMapping("/conversations/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id,@RequestHeader(value="X-Orientation-Session",required=false) String session,Authentication auth){service.delete(id,session,auth);}
}
