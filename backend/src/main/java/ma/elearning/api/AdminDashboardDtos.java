package ma.elearning.api;

import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

public final class AdminDashboardDtos {
    private AdminDashboardDtos() {}
    public record MonthlyPoint(YearMonth month,long inscriptions,long comptesCrees) {}
    public record PopularFormation(Long formationId,String titre,long inscriptions) {}
    public record DashboardResponse(Instant generatedAt,String timezone,YearMonth periodStart,YearMonth periodEnd,
            Map<String,Long> indicators,Map<String,Long> roleDistribution,Map<String,Long> formationStatusDistribution,
            List<MonthlyPoint> monthlySeries,List<PopularFormation> popularFormations) {}
}
