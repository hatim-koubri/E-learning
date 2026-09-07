package ma.elearning.orientation;

import ma.elearning.formation.*;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;
import static ma.elearning.orientation.OrientationDtos.*;

@Service
public class RecommendationScoringService {
    public List<Scored> score(OrientationConversation profile,List<Formation> candidates){
        boolean objectiveRequired=profile.getObjectif()!=null&&!profile.getObjectif().isBlank();
        return candidates.stream().filter(f->f.getStatut()==FormationStatus.PUBLIEE).map(f->scoreOne(profile,f))
                .filter(s->s.score()>=20&&(!objectiveRequired||s.goalMatched())).sorted(Comparator.comparingInt(Scored::score).reversed().thenComparing(s->s.formation().getId()))
                .limit(3).toList();
    }
    private Scored scoreOne(OrientationConversation p,Formation f){
        int score=0; List<String> reasons=new ArrayList<>(); String corpus=norm(f.getTitre()+" "+f.getCategorie()+" "+f.getDescription()+" "+
                f.getModules().stream().map(m->m.getTitre()+" "+Objects.toString(m.getDescription(),"")+" "+m.getChapitres().stream().map(c->c.getTitre()+" "+Objects.toString(c.getDescription(),"")).reduce("",(a,b)->a+" "+b)).reduce("",(a,b)->a+" "+b));
        String objective=norm(Objects.toString(p.getObjectif(),"")); String skills=norm(Objects.toString(p.getCompetences(),"").replace('|',' '));
        String category=norm(f.getCategorie()); String goalCorpus=norm(f.getTitre()+" "+f.getCategorie());
        boolean goalMatched=!objective.isBlank()&&overlap(objective,goalCorpus);
        if(goalMatched){score+=30;reasons.add("Le domaine correspond à votre objectif (+30).");}
        if(!skills.isBlank()&&overlap(skills,corpus)){score+=20;reasons.add("Le contenu couvre des compétences recherchées (+20).");}
        if(p.getNiveau()!=null&&(p.getNiveau().equals(f.getNiveau().name())||f.getNiveau()==NiveauFormation.TOUS_NIVEAUX)){score+=15;reasons.add("Le niveau est adapté (+15).");}
        if(p.getLangue()!=null&&norm(p.getLangue()).equals(norm(f.getLangue()))){score+=10;reasons.add("La langue correspond (+10).");}
        if(p.getBudget()!=null&&f.getPrix().compareTo(p.getBudget())<=0){score+=10;reasons.add("Le prix respecte votre budget (+10).");}
        boolean classes=f.isClassesGratuites()||f.getSupplementClasses().compareTo(BigDecimal.ZERO)>0;
        if(p.getBesoinClasses()!=null&&p.getBesoinClasses()==classes){score+=5;reasons.add(classes?"Des classes sont disponibles (+5).":"L’offre autonome correspond (+5).");}
        if(p.getFormatPedagogique()!=null&&formatMatches(p.getFormatPedagogique(),corpus,classes)){score+=5;reasons.add("Le format pédagogique recherché est présent (+5).");}
        if(!f.getModules().isEmpty()&&f.getModules().stream().anyMatch(m->!m.getChapitres().isEmpty())){score+=5;reasons.add("Le parcours publié contient des modules et chapitres visibles (+5).");}
        if(reasons.isEmpty())reasons.add("Correspondance partielle avec le profil actuel.");
        return new Scored(f,score,List.copyOf(reasons),goalMatched);
    }
    public RecommendationResponse response(Scored s,int rank){Formation f=s.formation();boolean classes=f.isClassesGratuites()||f.getSupplementClasses().compareTo(BigDecimal.ZERO)>0;
        return new RecommendationResponse(f.getId(),f.getTitre(),f.getCategorie(),f.getFormateur().getNom(),f.getNiveau().name(),f.getLangue(),f.getPrix(),
                classes?f.getPrix().add(f.isClassesGratuites()?BigDecimal.ZERO:f.getSupplementClasses()):null,classes,s.score(),rank,s.reasons(),f.getModules().stream().map(FormationModule::getTitre).toList(),"/catalogue/"+f.getId());}
    private boolean formatMatches(String format,String corpus,boolean classes){String f=norm(format);return (f.contains("classe")&&classes)||(f.contains("pratique")&&(corpus.contains("projet")||corpus.contains("pratique")))||(f.contains("video")&&corpus.contains("video"))||(f.contains("lecture")&&(corpus.contains("cours")||corpus.contains("document")));}
    private boolean overlap(String a,String b){Set<String> stop=Set.of("les","des","une","pour","avec","dans","veux","faire","devenir","formation","formations","apprendre","stage","debutant","francais","pratique","budget","semaine","etudier","heures","est","suis","mon","peux","quatre","prefere","recommande","maximum","trois","publiees");
        Set<String> target=new HashSet<>(Arrays.asList(b.split("[^a-z0-9+#.]+")));
        return Arrays.stream(a.split("[^a-z0-9+#.]+" )).filter(w->w.length()>2&&!stop.contains(w)).anyMatch(target::contains);}
    private String norm(String value){return Normalizer.normalize(value==null?"":value,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT);}
    public record Scored(Formation formation,int score,List<String> reasons,boolean goalMatched){}
}
