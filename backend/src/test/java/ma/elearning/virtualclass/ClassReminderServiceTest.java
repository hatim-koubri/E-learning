package ma.elearning.virtualclass;

import ma.elearning.engagement.EngagementService;
import ma.elearning.engagement.NotificationCategory;
import ma.elearning.user.Participant;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class ClassReminderServiceTest {
    @Test void dispatchesAtExactBoundaryOnlyToAcceptedMembersWithoutJitsiUrl() {
        Instant now = Instant.parse("2026-08-10T10:00:00Z");
        Clock clock = Clock.fixed(now, ZoneOffset.UTC);
        SeanceVirtuelleRepository sessions = mock(SeanceVirtuelleRepository.class);
        ClasseMembreRepository members = mock(ClasseMembreRepository.class);
        EngagementService engagement = mock(EngagementService.class);
        Classe classe = new Classe();
        SeanceVirtuelle session = new SeanceVirtuelle(); session.setClasse(classe);
        session.setTitre("Architecture"); session.setDateDebut(now.plus(Duration.ofMinutes(60)));
        session.setDateFin(now.plus(Duration.ofMinutes(120))); session.setStatut("PLANIFIEE");
        ClasseMembre accepted = member(classe, "accepted@test.local");
        when(sessions.findReminderCandidates(now, session.getDateDebut())).thenReturn(List.of(session));
        when(members.findByClasseId(classe.getId())).thenReturn(List.of(accepted));
        ClassReminderService service = new ClassReminderService(sessions, members, engagement, clock, 60);

        assertEquals(1, service.dispatchDueReminders());
        verify(engagement).sendNotification(eq("accepted@test.local"), eq(NotificationCategory.CLASSE),
                startsWith("class-session-reminder:"), eq("Rappel de séance"),
                argThat(message -> message != null && !message.contains("http")),
                eq("/participant/classes"), eq(false));
    }

    @Test void repositoryExclusionMeansCancelledPastAndNonMembersProduceNothing() {
        Instant now = Instant.parse("2026-08-10T10:00:00Z");
        SeanceVirtuelleRepository sessions = mock(SeanceVirtuelleRepository.class);
        ClasseMembreRepository members = mock(ClasseMembreRepository.class);
        EngagementService engagement = mock(EngagementService.class);
        when(sessions.findReminderCandidates(now, now.plusSeconds(3600))).thenReturn(List.of());
        ClassReminderService service = new ClassReminderService(sessions, members, engagement,
                Clock.fixed(now, ZoneOffset.UTC), 60);
        assertEquals(0, service.dispatchDueReminders());
        verifyNoInteractions(members, engagement);
    }

    private ClasseMembre member(Classe classe, String email) {
        Participant participant = new Participant(); participant.setEmail(email); participant.setNom("P");
        ClasseMembre member = new ClasseMembre(); member.setClasse(classe); member.setParticipant(participant);
        return member;
    }
}
