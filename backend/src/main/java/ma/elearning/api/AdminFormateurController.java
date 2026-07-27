package ma.elearning.api;

import jakarta.validation.Valid;
import ma.elearning.admin.FormateurAdminService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import static ma.elearning.api.AdminDtos.*;

@RestController @RequestMapping("/api/admin/formateurs")
public class AdminFormateurController {
    private final FormateurAdminService service;
    public AdminFormateurController(FormateurAdminService service) { this.service=service; }
    @GetMapping("/demandes") List<FormateurResponse> pending() { return service.pending(); }
    @GetMapping("/demandes/{id}") FormateurResponse get(@PathVariable Long id) { return service.get(id); }
    @PatchMapping("/{id}/accepter") FormateurResponse accept(@PathVariable Long id) { return service.accept(id); }
    @PatchMapping("/{id}/refuser") FormateurResponse refuse(@PathVariable Long id,@Valid @RequestBody RefusalRequest r) {
        return service.refuse(id,r.motif());
    }
}

