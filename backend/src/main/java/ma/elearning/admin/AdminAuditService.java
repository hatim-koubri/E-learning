package ma.elearning.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.user.Admin;
import ma.elearning.user.User;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AdminAuditService {
    private final AdminAuditEventRepository events;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public AdminAuditService(AdminAuditEventRepository events, ObjectMapper objectMapper, Clock clock) {
        this.events = events; this.objectMapper = objectMapper; this.clock = clock;
    }

    public String safeSnapshot(User user) {
        if (user == null) return null;
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("nom", user.getNom());
        value.put("telephone", user.getTelephone());
        value.put("role", user.getRole());
        value.put("statut", user.getStatut());
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Audit snapshot serialization failed", exception); }
    }

    public void success(Admin actor, String targetType, Long targetId, String action, String reason,
                        String previousStatus, String newStatus, String before, String after) {
        events.save(new AdminAuditEvent(actor, targetType, targetId, action, "SUCCESS", reason,
                previousStatus, newStatus, before, after, clock.instant()));
    }
}
