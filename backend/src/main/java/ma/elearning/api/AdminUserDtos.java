package ma.elearning.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.elearning.user.AccountStatus;
import ma.elearning.user.Role;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class AdminUserDtos {
    private AdminUserDtos() {}
    public record UserSummary(Long id, String nom, String email, String telephone, Role role,
                              AccountStatus statut, Instant createdAt, Instant updatedAt,
                              Instant suspendedAt, String suspensionReason, Instant deletedAt,
                              Instant anonymizedAt, long version) {}
    public record UserPage(List<UserSummary> content, int page, int size, int totalPages,
                           long totalElements) {}
    public record UserDetail(UserSummary user, Map<String, Long> relations, boolean editable,
                             boolean suspendable, boolean reactivatable, boolean deletable) {}
    public record UpdateUserRequest(@NotBlank @Size(max=120) String nom, @Size(max=30) String telephone,
                                    @NotNull Long expectedVersion) {}
    public record LifecycleRequest(@NotBlank @Size(max=500) String motif, @NotNull Long expectedVersion) {}
    public record DeletionRequest(@NotBlank String confirmation, @NotBlank String expectedMode,
                                  @NotNull Long expectedVersion) {}
    public record DeletionImpact(Long userId, String mode, Map<String, Long> relations,
                                 boolean allowed, String explanation, long version) {}
    public record AuditItem(Long id, Long actorId, String actorName, String targetType, Long targetId,
                            String action, String result, String reason, String previousStatus,
                            String newStatus, String beforeSnapshot, String afterSnapshot,
                            Instant occurredAt) {}
    public record AuditPage(List<AuditItem> content, int page, int size, int totalPages, long totalElements) {}
}
