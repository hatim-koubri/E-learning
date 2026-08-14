package ma.elearning.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import ma.elearning.admin.AdminReviewModerationService;
import ma.elearning.api.AdminModerationDtos.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/avis")
@Tag(name = "Administration - modération des avis",
        description = "File de signalements, contexte minimisé et décisions persistantes de modération.")
public class AdminReviewModerationController {
    private final AdminReviewModerationService service;

    public AdminReviewModerationController(AdminReviewModerationService service) {
        this.service = service;
    }

    @GetMapping("/signalements")
    @Operation(summary = "Lister les signalements en attente, du plus ancien au plus récent")
    ModerationQueueResponse pending(@RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return service.pending(page, size);
    }

    @GetMapping("/signalements/{reportId}")
    @Operation(summary = "Consulter le contexte minimisé d’un signalement en attente")
    ModerationReportResponse detail(@PathVariable Long reportId) {
        return service.detail(reportId);
    }

    @PatchMapping("/{reviewId}/republier")
    @Operation(summary = "Republier l’avis et résoudre tous ses signalements en attente")
    ModerationResolutionResponse republish(@PathVariable Long reviewId) {
        return service.republish(reviewId);
    }

    @PatchMapping("/{reviewId}/masquer")
    @Operation(summary = "Confirmer le masquage et résoudre tous les signalements en attente")
    ModerationResolutionResponse hide(@PathVariable Long reviewId) {
        return service.hide(reviewId);
    }
}
