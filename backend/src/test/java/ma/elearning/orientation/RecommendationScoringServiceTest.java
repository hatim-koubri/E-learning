package ma.elearning.orientation;

import ma.elearning.formation.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class RecommendationScoringServiceTest {
    private final RecommendationScoringService service=new RecommendationScoringService();
    @Test void scoreIsDeterministicAndUsesBudgetLevelLanguageAndClasses(){
        OrientationConversation profile=new OrientationConversation();profile.setObjectif("devenir développeur Java");profile.setCompetences("java|spring");profile.setNiveau("DEBUTANT");profile.setLangue("fr");profile.setBudget(new BigDecimal("600"));profile.setBesoinClasses(true);
        Formation formation=formation(12L,"Java Spring Boot","Développement","Java et Spring avec projets",new BigDecimal("499"));formation.setSupplementClasses(new BigDecimal("50"));
        var first=service.score(profile,List.of(formation));var second=service.score(profile,List.of(formation));
        assertEquals(1,first.size());assertEquals(first.getFirst().score(),second.getFirst().score());assertTrue(first.getFirst().score()>=85);assertTrue(first.getFirst().reasons().stream().anyMatch(r->r.contains("budget")));
    }
    @Test void unpublishedCoursesAndWeakMatchesAreExcluded(){OrientationConversation p=new OrientationConversation();p.setObjectif("design graphique");
        Formation draft=formation(1L,"Java","Développement","backend",BigDecimal.ZERO);draft.setStatut(FormationStatus.BROUILLON);assertTrue(service.score(p,List.of(draft)).isEmpty());}
    @Test void tiesAreResolvedByFormationId(){OrientationConversation p=new OrientationConversation();p.setObjectif("java");
        Formation later=formation(9L,"Java B","Java","java",BigDecimal.ZERO),earlier=formation(3L,"Java A","Java","java",BigDecimal.ZERO);
        assertEquals(3L,service.score(p,List.of(later,earlier)).getFirst().formation().getId());}
    @Test void genericProfilePointsCannotReplaceAnExplicitGoalMatch(){OrientationConversation p=new OrientationConversation();p.setObjectif("Je veux apprendre le frontend pour un stage");p.setNiveau("DEBUTANT");p.setLangue("fr");p.setBudget(new BigDecimal("600"));p.setFormatPedagogique("PRATIQUE");
        Formation java=formation(20L,"Java orienté objet","Développement Backend","Formation pratique pour débutant",new BigDecimal("450"));assertTrue(service.score(p,List.of(java)).isEmpty());}
    private Formation formation(long id,String title,String category,String description,BigDecimal price){Formation f=new Formation();ReflectionTestUtils.setField(f,"id",id);f.setTitre(title);f.setCategorie(category);f.setDescription(description);f.setPrix(price);f.setLangue("fr");f.setNiveau(NiveauFormation.DEBUTANT);f.setStatut(FormationStatus.PUBLIEE);f.setSupplementClasses(BigDecimal.ZERO);return f;}
}
