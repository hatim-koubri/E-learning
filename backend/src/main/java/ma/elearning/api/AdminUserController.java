package ma.elearning.api;

import jakarta.validation.Valid;
import ma.elearning.admin.AdminUserManagementService;
import ma.elearning.api.AdminUserDtos.*;
import ma.elearning.user.AccountStatus;
import ma.elearning.user.Role;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/admin")
public class AdminUserController {
    private final AdminUserManagementService service;
    public AdminUserController(AdminUserManagementService service) { this.service=service; }

    @GetMapping("/utilisateurs")
    public UserPage users(@RequestParam(required=false) String q,@RequestParam(required=false) Role role,
                          @RequestParam(required=false) AccountStatus statut,
                          @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant createdFrom,
                          @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant createdTo,
                          @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
                          @RequestParam(defaultValue="createdAt") String sort,@RequestParam(defaultValue="desc") String direction) {
        return service.search(q,role,statut,createdFrom,createdTo,page,size,sort,direction);
    }
    @GetMapping("/utilisateurs/{id}") public UserDetail detail(@PathVariable Long id){return service.detail(id);}
    @PatchMapping("/utilisateurs/{id}") public UserDetail update(@PathVariable Long id,@Valid @RequestBody UpdateUserRequest request){return service.update(id,request);}
    @PostMapping("/utilisateurs/{id}/suspension") public UserDetail suspend(@PathVariable Long id,@Valid @RequestBody LifecycleRequest request){return service.suspend(id,request);}
    @PostMapping("/utilisateurs/{id}/reactivation") public UserDetail reactivate(@PathVariable Long id,@Valid @RequestBody LifecycleRequest request){return service.reactivate(id,request);}
    @GetMapping("/utilisateurs/{id}/suppression-impact") public DeletionImpact impact(@PathVariable Long id){return service.impact(id);}
    @DeleteMapping("/utilisateurs/{id}") public DeletionImpact delete(@PathVariable Long id,@Valid @RequestBody DeletionRequest request){return service.delete(id,request);}
    @GetMapping("/audit") public AuditPage audit(@RequestParam(required=false) Long actorId,@RequestParam(required=false) Long targetId,
            @RequestParam(required=false) String action,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.audit(actorId,targetId,action,from,to,page,size);}
}
