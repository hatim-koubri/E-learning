package ma.elearning.orientation;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class ParticipantProfileExtractorTest {
    @Test void mergesOnlyValidNewValuesAndKeepsKnownSkills(){OrientationConversation c=new OrientationConversation();c.setObjectif("Stage frontend");c.setCompetences("html");
        new ParticipantProfileExtractor().merge(c,new OrientationDtos.PreferenceUpdate(null,"DEBUTANT",List.of("css","html"),"fr",new BigDecimal("600"),240,"PRATIQUE",true));
        assertEquals("Stage frontend",c.getObjectif());assertEquals("html|css",c.getCompetences());assertEquals("DEBUTANT",c.getNiveau());assertEquals(new BigDecimal("600"),c.getBudget());}
    @Test void rejectsUnknownLevel(){OrientationConversation c=new OrientationConversation();new ParticipantProfileExtractor().merge(c,new OrientationDtos.PreferenceUpdate(null,"EXPERT",List.of(),null,null,null,null,null));assertNull(c.getNiveau());}
    @Test void explicitFrenchBudgetAndWordHoursOverrideUnreliableAiNumbers(){OrientationConversation c=new OrientationConversation();c.setBudget(new BigDecimal("60"));c.setMinutesHebdomadaires(4);
        new ParticipantProfileExtractor().enrichFromMessage(c,"Je suis débutant, mon budget est de 600 DH et je peux étudier quatre heures par semaine, en français.");
        assertEquals(new BigDecimal("600"),c.getBudget());assertEquals(240,c.getMinutesHebdomadaires());assertEquals("DEBUTANT",c.getNiveau());assertEquals("fr",c.getLangue());}
}
