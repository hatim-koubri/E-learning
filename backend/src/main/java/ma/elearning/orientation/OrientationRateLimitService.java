package ma.elearning.orientation;
import ma.elearning.common.BusinessException;
import ma.elearning.orientation.ollama.OllamaProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.*;
import java.time.temporal.ChronoUnit;

@Service
public class OrientationRateLimitService {
    private final OrientationMessageRepository messages; private final OllamaProperties properties;
    public OrientationRateLimitService(OrientationMessageRepository m,OllamaProperties p){messages=m;properties=p;}
    public void check(String session){Instant now=Instant.now();long hour=messages.countByConversationSessionIdAndRoleAndCreatedAtAfter(session,"USER",now.minus(1,ChronoUnit.HOURS));
        long day=messages.countByConversationSessionIdAndRoleAndCreatedAtAfter(session,"USER",now.minus(1,ChronoUnit.DAYS));
        if(hour>=properties.getHourlyLimit()||day>=properties.getDailyLimit())throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS,"AI_RATE_LIMIT","Limite de messages atteinte. Réessayez plus tard.");}
}
