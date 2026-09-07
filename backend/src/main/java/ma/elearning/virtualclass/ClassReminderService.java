package ma.elearning.virtualclass;

import ma.elearning.engagement.EngagementService;
import ma.elearning.engagement.NotificationCategory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@Service
public class ClassReminderService {
    private final SeanceVirtuelleRepository sessions;
    private final ClasseMembreRepository members;
    private final EngagementService engagement;
    private final Clock clock;
    private final Duration leadTime;

    public ClassReminderService(SeanceVirtuelleRepository sessions, ClasseMembreRepository members,
                                EngagementService engagement, Clock clock,
                                @Value("${app.notifications.class-reminder-minutes:60}") long leadMinutes) {
        this.sessions = sessions;
        this.members = members;
        this.engagement = engagement;
        this.clock = clock;
        this.leadTime = Duration.ofMinutes(leadMinutes);
    }

    @Scheduled(fixedDelayString = "${app.notifications.class-reminder-scan-ms:60000}")
    @Transactional
    public int dispatchDueReminders() {
        Instant now = clock.instant();
        int[] delivered = {0};
        sessions.findReminderCandidates(now, now.plus(leadTime)).forEach(session ->
                members.findByClasseId(session.getClasse().getId()).stream()
                        .filter(member -> "ACCEPTE".equals(member.getStatut()))
                        .forEach(member -> {
                            engagement.sendNotification(member.getParticipant().getEmail(),
                                    NotificationCategory.CLASSE, "class-session-reminder:" + session.getId(),
                                    "Rappel de séance", session.getTitre() + " commence à " + session.getDateDebut() + ".",
                                    "/participant/classes", false);
                            delivered[0]++;
                        }));
        return delivered[0];
    }
}
