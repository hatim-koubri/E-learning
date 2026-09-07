package ma.elearning.api;

import ma.elearning.user.*;
import static ma.elearning.api.AuthDtos.*;
import static ma.elearning.api.AdminDtos.*;

public final class UserMapper {
    private UserMapper() {}
    public static UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getNom(), user.getEmail(), user.getTelephone(),
                user.getRole(), user.getStatut(), user.getCreatedAt());
    }
    public static FormateurResponse toFormateurResponse(Formateur f) {
        return new FormateurResponse(f.getId(), f.getNom(), f.getEmail(), f.getTelephone(),
                f.getStatut(), f.getDecisionResult(),
                f.getDecisionAdmin() == null ? null : f.getDecisionAdmin().getId(),
                f.getMotifRefus(), f.getDateDecision(), f.getCreatedAt(),f.getSpecialite(),f.getBiographie());
    }
}
