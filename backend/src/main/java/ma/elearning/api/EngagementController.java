package ma.elearning.api;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import ma.elearning.api.EngagementDtos.*;
import ma.elearning.engagement.EngagementService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(
        name = "Engagement et personnalisation",
        description = "Orientation transparente, préférences, progression, favoris, notes privées, avis et notifications."
)
public class EngagementController {
    private final EngagementService service;

    public EngagementController(EngagementService service) {
        this.service = service;
    }

    @PostMapping("/orientation/recommandations")
    List<Recommendation> orientation(@Valid @RequestBody OrientationRequest request) {
        return service.orientation(request);
    }

    @GetMapping("/catalogue/{formationId}/avis")
    ReviewSummary publicReviews(@PathVariable Long formationId,
                                @RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "10") int size,
                                Authentication authentication) {
        return service.publicReviews(formationId, page, size,
                authentication == null ? null : authentication.getName());
    }

    @GetMapping("/formateurs/{id}")
    InstructorProfile instructor(@PathVariable Long id) {
        return service.instructor(id);
    }

    @GetMapping("/participant/preferences")
    PreferenceResponse preferences(Authentication authentication) {
        return service.preferences(authentication.getName());
    }

    @PutMapping("/participant/preferences")
    PreferenceResponse updatePreferences(Authentication authentication,
                                         @Valid @RequestBody PreferenceRequest request) {
        return service.savePreferences(authentication.getName(), request);
    }

    @PostMapping("/participant/preferences/ignorer-onboarding")
    PreferenceResponse skipOnboarding(Authentication authentication) {
        return service.skipOnboarding(authentication.getName());
    }

    @GetMapping("/participant/tableau-de-bord")
    DashboardResponse dashboard(Authentication authentication) {
        return service.dashboard(authentication.getName());
    }

    @GetMapping("/participant/favoris")
    List<FavoriteResponse> favorites(Authentication authentication) {
        return service.favorites(authentication.getName());
    }

    @PutMapping("/participant/favoris/{formationId}")
    FavoriteResponse addFavorite(Authentication authentication, @PathVariable Long formationId) {
        return service.addFavorite(authentication.getName(), formationId);
    }

    @DeleteMapping("/participant/favoris/{formationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removeFavorite(Authentication authentication, @PathVariable Long formationId) {
        service.removeFavorite(authentication.getName(), formationId);
    }

    @PutMapping("/participant/formations/{formationId}/position")
    ResumeResponse recordPosition(Authentication authentication, @PathVariable Long formationId,
                                  @Valid @RequestBody LearningPositionRequest request) {
        return service.recordPosition(authentication.getName(), formationId, request);
    }

    @GetMapping("/participant/reprise")
    ResumeResponse resume(Authentication authentication) {
        return service.resume(authentication.getName());
    }

    @GetMapping("/participant/notes")
    List<PrivateNoteResponse> notes(Authentication authentication,
                                    @RequestParam(required = false) Long formationId) {
        return service.notes(authentication.getName(), formationId);
    }

    @PostMapping("/participant/formations/{formationId}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    PrivateNoteResponse createNote(Authentication authentication, @PathVariable Long formationId,
                                   @Valid @RequestBody PrivateNoteRequest request) {
        return service.createNote(authentication.getName(), formationId, request);
    }

    @PutMapping("/participant/notes/{id}")
    PrivateNoteResponse updateNote(Authentication authentication, @PathVariable Long id,
                                   @Valid @RequestBody PrivateNoteRequest request) {
        return service.updateNote(authentication.getName(), id, request);
    }

    @DeleteMapping("/participant/notes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteNote(Authentication authentication, @PathVariable Long id) {
        service.deleteNote(authentication.getName(), id);
    }

    @GetMapping("/participant/objectif-hebdomadaire")
    WeeklyGoalResponse goal(Authentication authentication) {
        return service.goal(authentication.getName());
    }

    @PutMapping("/participant/objectif-hebdomadaire")
    WeeklyGoalResponse updateGoal(Authentication authentication,
                                  @Valid @RequestBody WeeklyGoalRequest request) {
        return service.updateGoal(authentication.getName(), request);
    }

    @GetMapping("/participant/recommandations")
    List<Recommendation> recommendations(Authentication authentication) {
        return service.recommendations(authentication.getName());
    }

    @GetMapping("/participant/formations/{formationId}/parcours")
    LearningJourney journey(Authentication authentication, @PathVariable Long formationId) {
        return service.journey(authentication.getName(), formationId);
    }

    @PostMapping("/participant/formations/{formationId}/avis")
    @ResponseStatus(HttpStatus.CREATED)
    ReviewResponse createReview(Authentication authentication, @PathVariable Long formationId,
                                @Valid @RequestBody ReviewRequest request) {
        return service.createReview(authentication.getName(), formationId, request);
    }

    @PutMapping("/participant/avis/{id}")
    ReviewResponse updateReview(Authentication authentication, @PathVariable Long id,
                                @Valid @RequestBody ReviewRequest request) {
        return service.updateReview(authentication.getName(), id, request);
    }

    @DeleteMapping("/participant/avis/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteReview(Authentication authentication, @PathVariable Long id) {
        service.deleteReview(authentication.getName(), id);
    }

    @PostMapping("/participant/avis/{id}/signalement")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reportReview(Authentication authentication, @PathVariable Long id,
                      @Valid @RequestBody ReviewReportRequest request) {
        service.reportReview(authentication.getName(), id, request);
    }

    @GetMapping("/formateur/engagement")
    TrainerEngagement trainerEngagement(Authentication authentication) {
        return service.trainerEngagement(authentication.getName());
    }

    @PutMapping("/formateur/avis/{id}/reponse")
    ReviewResponse reply(Authentication authentication, @PathVariable Long id,
                         @Valid @RequestBody ReviewReplyRequest request) {
        return service.replyToReview(authentication.getName(), id, request);
    }

    @PutMapping("/formateur/profil-public")
    InstructorProfile updateInstructor(Authentication authentication,
                                       @Valid @RequestBody InstructorProfileRequest request) {
        return service.updateInstructor(authentication.getName(), request);
    }

    @GetMapping("/notifications")
    NotificationPage notifications(Authentication authentication,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        return service.notifications(authentication.getName(), page, size);
    }

    @PutMapping("/notifications/{id}/lue")
    NotificationResponse markRead(Authentication authentication, @PathVariable Long id) {
        return service.markRead(authentication.getName(), id);
    }

    @PutMapping("/notifications/tout-lire")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void markAllRead(Authentication authentication) {
        service.markAllRead(authentication.getName());
    }

    @GetMapping("/notifications/preferences")
    List<NotificationPreferenceResponse> notificationPreferences(Authentication authentication) {
        return service.notificationPreferences(authentication.getName());
    }

    @PutMapping("/notifications/preferences")
    NotificationPreferenceResponse updateNotificationPreference(
            Authentication authentication,
            @Valid @RequestBody NotificationPreferenceRequest request) {
        return service.updateNotificationPreference(authentication.getName(), request);
    }
}
