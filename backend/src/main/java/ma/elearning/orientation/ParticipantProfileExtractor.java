package ma.elearning.orientation;
import org.springframework.stereotype.Service;
import java.util.*;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.regex.Pattern;

@Service
public class ParticipantProfileExtractor {
    private static final Set<String> LEVELS=Set.of("DEBUTANT","INTERMEDIAIRE","AVANCE","TOUS_NIVEAUX");
    public void merge(OrientationConversation c,OrientationDtos.PreferenceUpdate p){
        if(p==null)return;
        if(text(p.objectif())!=null)c.setObjectif(text(p.objectif()));
        String level=text(p.niveau()); if(level!=null&&LEVELS.contains(level.toUpperCase(Locale.ROOT)))c.setNiveau(level.toUpperCase(Locale.ROOT));
        if(p.competences()!=null&&!p.competences().isEmpty()){
            LinkedHashSet<String> all=new LinkedHashSet<>(); if(c.getCompetences()!=null)all.addAll(List.of(c.getCompetences().split("\\|")));
            p.competences().stream().map(this::text).filter(Objects::nonNull).limit(10).forEach(v->all.add(v.replace("|",""))); c.setCompetences(String.join("|",all));
        }
        if(text(p.langue())!=null)c.setLangue(language(text(p.langue()))); if(p.budget()!=null)c.setBudget(p.budget());
        if(p.minutesHebdomadaires()!=null)c.setMinutesHebdomadaires(p.minutesHebdomadaires()); if(text(p.formatPedagogique())!=null)c.setFormatPedagogique(text(p.formatPedagogique()));
        if(p.besoinClasses()!=null)c.setBesoinClasses(p.besoinClasses());
    }
    public void enrichFromMessage(OrientationConversation c,String message){String normalized=norm(message);
        var budget=Pattern.compile("(\\d+(?:[.,]\\d{1,2})?)\\s*(?:dh|mad)",Pattern.CASE_INSENSITIVE).matcher(normalized);
        if(budget.find())c.setBudget(new BigDecimal(budget.group(1).replace(',','.')));
        var hours=Pattern.compile("(\\d+)\\s*(?:h|heure|heures)\\s*(?:par|/)\\s*semaine",Pattern.CASE_INSENSITIVE).matcher(normalized);
        if(hours.find())c.setMinutesHebdomadaires(Math.min(10080,Integer.parseInt(hours.group(1))*60));
        Map<String,Integer> numbers=Map.of("une",1,"deux",2,"trois",3,"quatre",4,"cinq",5,"six",6,"sept",7,"huit",8,"neuf",9,"dix",10);
        var wordHours=Pattern.compile("(une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\\s+heures?\\s*(?:par|/)\\s*semaine",Pattern.CASE_INSENSITIVE).matcher(normalized);
        if(wordHours.find())c.setMinutesHebdomadaires(numbers.get(wordHours.group(1).toLowerCase(Locale.ROOT))*60);
        var minutes=Pattern.compile("(\\d+)\\s*minutes?\\s*(?:par|/)\\s*semaine",Pattern.CASE_INSENSITIVE).matcher(normalized);
        if(minutes.find())c.setMinutesHebdomadaires(Math.min(10080,Integer.parseInt(minutes.group(1))));
        if(normalized.contains("debutant"))c.setNiveau("DEBUTANT");else if(normalized.contains("intermediaire"))c.setNiveau("INTERMEDIAIRE");else if(normalized.contains("avance"))c.setNiveau("AVANCE");
        if(normalized.contains("francais"))c.setLangue("fr");else if(normalized.contains("anglais"))c.setLangue("en");else if(normalized.contains("arabe"))c.setLangue("ar");
        if(normalized.contains("je veux")||normalized.contains("mon objectif"))c.setObjectif(message.strip().substring(0,Math.min(500,message.strip().length())));
        if(normalized.contains("avec classes")||normalized.contains("besoin de classes"))c.setBesoinClasses(true);else if(normalized.contains("sans classes")||normalized.contains("autonome"))c.setBesoinClasses(false);
    }
    private String language(String value){String v=norm(value);if(v.startsWith("fr"))return "fr";if(v.startsWith("en")||v.startsWith("ang"))return "en";if(v.startsWith("ar"))return "ar";return value;}
    private String norm(String value){return Normalizer.normalize(value,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT);}
    private String text(String v){if(v==null)return null;String t=v.strip();return t.isEmpty()?null:t.substring(0,Math.min(t.length(),500));}
}
