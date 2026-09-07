package ma.elearning.admin;

import ma.elearning.api.AdminDashboardDtos.*;
import ma.elearning.engagement.*;
import ma.elearning.formation.*;
import ma.elearning.learning.*;
import ma.elearning.user.*;
import ma.elearning.virtualclass.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
public class AdminDashboardService {
    private static final List<InscriptionStatut> ACTIVE_ENROLLMENTS=List.of(InscriptionStatut.ACTIVE,InscriptionStatut.CONFIRMEE);
    private final UserRepository users; private final FormationRepository formations;
    private final InscriptionRepository inscriptions; private final ClasseRepository classes;
    private final SeanceVirtuelleRepository sessions; private final CourseReviewRepository reviews;
    private final ReviewReportRepository reports; private final Clock clock;
    public AdminDashboardService(UserRepository users,FormationRepository formations,InscriptionRepository inscriptions,
            ClasseRepository classes,SeanceVirtuelleRepository sessions,CourseReviewRepository reviews,
            ReviewReportRepository reports,Clock clock){this.users=users;this.formations=formations;this.inscriptions=inscriptions;
        this.classes=classes;this.sessions=sessions;this.reviews=reviews;this.reports=reports;this.clock=clock;}

    @Transactional(readOnly=true)
    public DashboardResponse dashboard(int requestedMonths){
        int months=Math.min(Math.max(requestedMonths,1),24); Instant now=clock.instant();
        YearMonth end=YearMonth.from(now.atZone(ZoneOffset.UTC)); YearMonth start=end.minusMonths(months-1L);
        Instant from=start.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant to=end.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Map<String,Long> indicators=new LinkedHashMap<>();
        indicators.put("participants",users.countByRoleAndStatutNot(Role.PARTICIPANT,AccountStatus.SUPPRIME));
        indicators.put("formateurs",users.countByRoleAndStatutNot(Role.FORMATEUR,AccountStatus.SUPPRIME));
        indicators.put("formateursActifs",users.countByRoleAndStatut(Role.FORMATEUR,AccountStatus.ACTIF));
        indicators.put("demandesFormateur",users.countByRoleAndStatut(Role.FORMATEUR,AccountStatus.EN_ATTENTE));
        indicators.put("comptesSuspendus",users.countByStatut(AccountStatus.SUSPENDU));
        indicators.put("formationsPubliees",formations.countByStatut(FormationStatus.PUBLIEE));
        indicators.put("inscriptionsActives",inscriptions.countByStatutIn(ACTIVE_ENROLLMENTS));
        indicators.put("classesActives",classes.countByStatut("ACTIVE"));
        indicators.put("seancesPlanifiees",sessions.countByStatutAndDateFinAfter("PLANIFIEE",now));
        indicators.put("avisPublies",reviews.countByStatut(ReviewStatus.PUBLIE));
        indicators.put("signalementsEnAttente",reports.countByStatutTraitement(ReviewReportStatus.EN_ATTENTE));
        indicators.put("dossiersModeration",reports.countDistinctReviewIdByStatutTraitement(ReviewReportStatus.EN_ATTENTE));
        Map<String,Long> roles=groups(users.countByRoleGroup());
        Map<String,Long> formationStatuses=new LinkedHashMap<>();
        for(FormationStatus status:FormationStatus.values()) formationStatuses.put(status.name(),0L);
        formations.countByStatusGroup().forEach(value->formationStatuses.put(value.getLabel(),value.getTotal()));
        Map<YearMonth,Long> enrollmentMonths=new HashMap<>();
        inscriptions.countMonthly(from,to,ACTIVE_ENROLLMENTS).forEach(v->enrollmentMonths.put(YearMonth.of(v.getYearValue(),v.getMonthValue()),v.getTotal()));
        Map<YearMonth,Long> accountMonths=new HashMap<>();
        users.countCreatedMonthly(from,to).forEach(v->accountMonths.put(YearMonth.of(v.getYearValue(),v.getMonthValue()),v.getTotal()));
        List<MonthlyPoint> series=new ArrayList<>();
        for(YearMonth cursor=start;!cursor.isAfter(end);cursor=cursor.plusMonths(1)) series.add(new MonthlyPoint(cursor,enrollmentMonths.getOrDefault(cursor,0L),accountMonths.getOrDefault(cursor,0L)));
        List<PopularFormation> popular=inscriptions.findPopular(ACTIVE_ENROLLMENTS,PageRequest.of(0,5)).stream()
                .map(v->new PopularFormation(v.getFormationId(),v.getTitre(),v.getTotal())).toList();
        return new DashboardResponse(now,"UTC",start,end,indicators,roles,formationStatuses,series,popular);
    }
    private Map<String,Long> groups(List<UserRepository.GroupCount> values){Map<String,Long> result=new LinkedHashMap<>();for(Role role:Role.values())result.put(role.name(),0L);values.forEach(v->result.put(v.getLabel(),v.getTotal()));return result;}
}
