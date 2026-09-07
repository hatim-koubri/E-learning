package ma.elearning.quiz;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class QuizAttemptWindowTest {
    private static final Instant NOW = Instant.parse("2026-08-10T12:00:00Z");

    @Test
    void zeroOneAndTwoAttemptsRemainImmediatelyAvailable() {
        assertAvailability(List.of(), Duration.ofHours(8), 3, null);
        assertAvailability(List.of(NOW.minusSeconds(60)), Duration.ofHours(8), 2, null);
        assertAvailability(List.of(NOW.minusSeconds(120), NOW.minusSeconds(60)),
                Duration.ofHours(8), 1, null);
    }

    @Test
    void thirdNormalAttemptOpensANewSeriesEightHoursAfterTheFirst() {
        Instant first = NOW.minus(Duration.ofHours(2));
        QuizAttemptWindow.Availability result = QuizAttemptWindow.evaluate(
                List.of(first, first.plusSeconds(60), first.plusSeconds(120)), Duration.ofHours(8), NOW);
        assertEquals(0, result.remaining());
        assertEquals(first.plus(Duration.ofHours(8)), result.next());
    }

    @Test
    void thirdImportantAttemptWaitsTwentyFourHours() {
        Instant first = NOW.minus(Duration.ofHours(2));
        QuizAttemptWindow.Availability result = QuizAttemptWindow.evaluate(
                List.of(first, first.plusSeconds(60), first.plusSeconds(120)), Duration.ofHours(24), NOW);
        assertEquals(0, result.remaining());
        assertEquals(first.plus(Duration.ofHours(24)), result.next());
    }

    @Test
    void remainsBlockedJustBeforeDeadlineAndResetsExactlyAtDeadline() {
        Instant first = NOW.minus(Duration.ofHours(8));
        List<Instant> attempts = List.of(first, first.plusSeconds(60), first.plusSeconds(120));
        QuizAttemptWindow.Availability before = QuizAttemptWindow.evaluate(
                attempts, Duration.ofHours(8), NOW.minusNanos(1));
        QuizAttemptWindow.Availability exact = QuizAttemptWindow.evaluate(
                attempts, Duration.ofHours(8), NOW);
        assertEquals(0, before.remaining());
        assertEquals(NOW, before.next());
        assertEquals(3, exact.remaining());
        assertNull(exact.next());
    }

    @Test
    void startsAFreshSeriesAfterTheDeadlineWithoutMixingOldAttempts() {
        Instant oldStart = NOW.minus(Duration.ofHours(10));
        Instant newStart = NOW.minus(Duration.ofMinutes(10));
        QuizAttemptWindow.Availability result = QuizAttemptWindow.evaluate(List.of(
                oldStart, oldStart.plusSeconds(60), oldStart.plusSeconds(120), newStart
        ), Duration.ofHours(8), NOW);
        assertEquals(2, result.remaining());
        assertNull(result.next());
    }

    private void assertAvailability(List<Instant> attempts, Duration duration, int remaining, Instant next) {
        QuizAttemptWindow.Availability result = QuizAttemptWindow.evaluate(attempts, duration, NOW);
        assertEquals(remaining, result.remaining());
        assertEquals(next, result.next());
    }
}
