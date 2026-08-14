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
    @GetMapping("/demandes") FormateurPage pending(@RequestParam(defaultValue="0") int page,
                                                    @RequestParam(defaultValue="20") int size) {
        return service.pending(page,size);
    }
    @GetMapping("/demandes/{id}") FormateurApplicationResponse get(@PathVariable Long id) { return service.application(id); }
    @PatchMapping("/{id}/accepter") FormateurResponse accept(@PathVariable Long id) {
        return service.accept(id);
    }
    @PatchMapping("/{id}/refuser") FormateurResponse refuse(@PathVariable Long id,@Valid @RequestBody RefusalRequest r) {
        return service.refuse(id,r.motif());
    }
}
