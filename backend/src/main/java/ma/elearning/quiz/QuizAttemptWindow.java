package ma.elearning.quiz;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public final class QuizAttemptWindow {
    public static final int MAX_ATTEMPTS = 3;

    private QuizAttemptWindow() {}

    public static Availability evaluate(List<Instant> passages, Duration cooldown, Instant now) {
        Instant seriesStart = null;
        int used = 0;
        for (Instant passage : passages.stream().filter(value -> !value.isAfter(now))
                .sorted(Comparator.naturalOrder()).toList()) {
            if (seriesStart == null || !passage.isBefore(seriesStart.plus(cooldown))) {
                seriesStart = passage;
                used = 1;
            } else {
                used++;
            }
        }
        if (seriesStart == null) return new Availability(MAX_ATTEMPTS, null);
        Instant next = seriesStart.plus(cooldown);
        if (!now.isBefore(next)) return new Availability(MAX_ATTEMPTS, null);
        return used >= MAX_ATTEMPTS
                ? new Availability(0, next)
                : new Availability(MAX_ATTEMPTS - used, null);
    }

    public record Availability(int remaining, Instant next) {}
}
