package ma.elearning.api;
import jakarta.validation.Valid;
import ma.elearning.api.LearningDtos.*;
import ma.elearning.formation.NiveauFormation;
import ma.elearning.learning.LearningService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class LearningController {
 private final LearningService service; public LearningController(LearningService service){this.service=service;}
 @GetMapping("/catalogue")
 CataloguePage catalogue(@RequestParam(defaultValue="")String q,@RequestParam(defaultValue="")String categorie,
  @RequestParam(defaultValue="")String langue,@RequestParam(required=false)NiveauFormation niveau,
  @RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="12")int size){return service.catalogue(q,categorie,langue,niveau,page,size);}
 @GetMapping("/catalogue/{id}")
 CatalogueDetail detail(@PathVariable Long id,Authentication auth){return service.detail(id,auth==null?null:auth.getName());}
 @GetMapping("/catalogue/{formationId}/ressources/{resourceId}/acces")
 ResourceAccess resource(@PathVariable Long formationId,@PathVariable Long resourceId,Authentication auth){
  return service.resource(auth==null?null:auth.getName(),formationId,resourceId);}
 @PostMapping("/participant/formations/{id}/inscription")
 InscriptionResponse enroll(@PathVariable Long id,Authentication auth){return service.enroll(auth.getName(),id);}
 @PostMapping("/participant/formations/{id}/upgrade-classes")
 UpgradeResponse upgrade(@PathVariable Long id,@RequestHeader("Idempotency-Key")String key,Authentication auth){
  return service.upgrade(auth.getName(),id,key);}
 @GetMapping("/participant/formations")
 java.util.List<MyFormation> mine(Authentication auth){return service.mine(auth.getName());}
 @PostMapping("/participant/formations/{id}/inscription-avec-classes")
 UpgradeResponse enrollComplete(@PathVariable Long id,@RequestHeader("Idempotency-Key")String key,Authentication auth){
  return service.enrollComplete(auth.getName(),id,key);}
 @PutMapping("/participant/formations/{formationId}/chapitres/{chapterId}/progression")
 ProgressResponse progress(@PathVariable Long formationId,@PathVariable Long chapterId,Authentication auth,@Valid @RequestBody ProgressRequest request){
  return service.progress(auth.getName(),formationId,chapterId,request.termine(),request.positionVideoSecondes());}
}
