package ma.elearning.orientation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.common.BusinessException;
import ma.elearning.formation.*;
import ma.elearning.orientation.RecommendationScoringService.Scored;
import ma.elearning.orientation.ollama.*;
import ma.elearning.user.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import static ma.elearning.orientation.OrientationDtos.*;

@Service
public class OrientationService {
    private final OrientationConversationRepository conversations; private final OrientationMessageRepository messages;
    private final OrientationRecommendationRepository recommendations; private final FormationRepository formations; private final UserRepository users;
    private final OllamaClient ollama; private final OrientationPromptService prompts; private final ParticipantProfileExtractor extractor;
    private final RecommendationScoringService scoring; private final OrientationRateLimitService limits; private final ObjectMapper json;
    private final ConcurrentHashMap<Long,ReentrantLock> locks=new ConcurrentHashMap<>();
    public OrientationService(OrientationConversationRepository c,OrientationMessageRepository m,OrientationRecommendationRepository r,
        FormationRepository f,UserRepository u,OllamaClient o,OrientationPromptService p,ParticipantProfileExtractor e,
        RecommendationScoringService s,OrientationRateLimitService l,ObjectMapper j){conversations=c;messages=m;recommendations=r;formations=f;users=u;ollama=o;prompts=p;extractor=e;scoring=s;limits=l;json=j;}

    @Transactional
    public ConversationResponse create(CreateConversationRequest request,Authentication auth){Participant participant=participantOrNull(auth);
        OrientationConversation c=new OrientationConversation();c.setParticipant(participant);c.setSessionId(participant==null?validOrNewSession(request==null?null:request.sessionId()):UUID.randomUUID().toString());
        return response(conversations.save(c));}
    @Transactional(readOnly=true)
    public List<ConversationSummary> list(Authentication auth){Participant p=requireParticipant(auth);return conversations.findByParticipantEmailOrderByUpdatedAtDesc(p.getEmail()).stream().map(c->new ConversationSummary(c.getId(),c.getTitre(),c.getStatut(),c.getCreatedAt(),c.getUpdatedAt())).toList();}
    @Transactional(readOnly=true)
    public ConversationResponse get(Long id,String session,Authentication auth){return response(owned(id,session,auth));}
    @Transactional
    public void delete(Long id,String session,Authentication auth){conversations.delete(owned(id,session,auth));}
    @Transactional
    public ConversationResponse updatePreferences(Long id,String session,Authentication auth,PreferenceUpdate update){OrientationConversation c=owned(id,session,auth);extractor.merge(c,update);return response(c);}

    @Transactional(noRollbackFor=BusinessException.class)
    public SendMessageResponse send(Long id,String session,Authentication auth,SendMessageRequest request){
        ReentrantLock lock=locks.computeIfAbsent(id,k->new ReentrantLock()); if(!lock.tryLock())throw error(HttpStatus.CONFLICT,"CONVERSATION_BUSY","Une réponse est déjà en cours pour cette conversation.");
        try{
            OrientationConversation c=loadOwned(id,session,auth); Optional<OrientationMessage> duplicate=messages.findByConversationIdAndRequestId(id,request.requestId());
            if(duplicate.isPresent())return latestResult(c);
            limits.check(c.getSessionId()); saveUserMessage(c,request);
            Instant start=Instant.now(); List<OrientationMessage> history=recent(id); List<RecommendationResponse> current=currentRecommendations(id);
            if(clearlyOffTopic(request.contenu()))return saveAssistant(c,"Je suis spécialisé dans l’orientation, les compétences, les métiers et les formations. Posez-moi une question sur votre projet d’apprentissage ou professionnel.",current,start,false);
            String raw;
            try{raw=ollama.chat(prompts.analysis(history,c,current));}catch(OllamaException e){throw mapAi(e);}
            AiAnalysis analysis=parse(raw); List<RecommendationResponse> result=List.of();
            if(Boolean.TRUE.equals(analysis.search())){
                extractor.merge(c,analysis.preferences()); extractor.enrichFromMessage(c,request.contenu()); List<Scored> scores=scoring.score(c,formations.orientationCandidates());
                result=new ArrayList<>();for(int i=0;i<scores.size();i++)result.add(scoring.response(scores.get(i),i+1));
                return saveAssistant(c,recommendationAnswer(analysis,result),result,start,true);
            }
            extractor.merge(c,analysis.preferences()); extractor.enrichFromMessage(c,request.contenu()); return saveAssistant(c,answerWithQuestion(analysis,false),current,start,false);
        }finally{lock.unlock();locks.remove(id,lock);}
    }
    private String answerWithQuestion(AiAnalysis a,boolean empty){String answer=empty?"Je ne trouve actuellement aucune formation publiée correspondant suffisamment à votre profil.":safe(a.answer());
        String q=safe(a.missingQuestion());return q.isBlank()?answer:answer+"\n\n"+q;}
    private String recommendationAnswer(AiAnalysis analysis,List<RecommendationResponse> result){
        if(result.isEmpty())return answerWithQuestion(analysis,true);
        StringBuilder text=new StringBuilder("J’ai trouvé ").append(result.size()).append(result.size()>1?" formations publiées correspondant à votre profil :":" formation publiée correspondant à votre profil :");
        for(RecommendationResponse item:result)text.append("\n").append(item.rang()).append(". ").append(item.titre()).append(" — ").append(item.score()).append("/100 — ").append(item.prix()).append(" DH.");
        String question=safe(analysis.missingQuestion());if(!question.isBlank())text.append("\n\n").append(question);return text.toString();
    }
    private AiAnalysis parse(String raw){try{int first=raw.indexOf('{'),last=raw.lastIndexOf('}');if(first<0||last<=first)throw new JsonProcessingException("json missing"){};
        AiAnalysis a=json.readValue(raw.substring(first,last+1),AiAnalysis.class);if(a.answer()==null||a.answer().isBlank()||a.answer().length()>6000)throw new JsonProcessingException("answer invalid"){};return a;
        }catch(JsonProcessingException e){throw error(HttpStatus.BAD_GATEWAY,"AI_INVALID_RESPONSE","Le modèle local a renvoyé une réponse invalide. Vos préférences n’ont pas été modifiées.");}}
    @Transactional
    protected void saveUserMessage(OrientationConversation c,SendMessageRequest request){OrientationConversation managed=conversations.findLocked(c.getId()).orElseThrow(this::notFound);
        OrientationMessage m=new OrientationMessage();m.setConversation(managed);m.setRole("USER");m.setContenu(request.contenu().strip());m.setRequestId(request.requestId());
        if(messages.findByConversationIdAndRequestId(c.getId(),request.requestId()).isPresent())return;
        if("Nouvelle orientation".equals(managed.getTitre()))managed.setTitre(m.getContenu().substring(0,Math.min(80,m.getContenu().length())));
        try{messages.saveAndFlush(m);}catch(DataIntegrityViolationException ignored){} }
    @Transactional
    protected SendMessageResponse saveAssistant(OrientationConversation detached,String content,List<RecommendationResponse> result,Instant start,boolean replaceRecommendations){OrientationConversation c=conversations.findLocked(detached.getId()).orElseThrow(this::notFound);
        copyProfile(detached,c); List<RecommendationResponse> stillPublished=new ArrayList<>();
        if(replaceRecommendations)recommendations.deleteByConversationId(c.getId());
        int rank=1;for(RecommendationResponse dto:result){Optional<Formation> formation=formations.findOneByIdAndStatut(dto.formationId(),FormationStatus.PUBLIEE);if(formation.isEmpty())continue;
            if(!replaceRecommendations){stillPublished.add(dto);continue;}
            RecommendationResponse safeDto=new RecommendationResponse(dto.formationId(),dto.titre(),dto.categorie(),dto.formateur(),dto.niveau(),dto.langue(),dto.prix(),dto.prixAvecClasses(),dto.classesDisponibles(),dto.score(),rank,dto.raisons(),dto.modules(),dto.href());
            OrientationRecommendation entity=new OrientationRecommendation();entity.setConversation(c);entity.setFormation(formation.get());entity.setScore(dto.score());entity.setRang(rank++);try{entity.setRaisonsJson(json.writeValueAsString(dto.raisons()));}catch(JsonProcessingException e){throw new IllegalStateException(e);}recommendations.save(entity);stillPublished.add(safeDto);}
        OrientationMessage m=new OrientationMessage();m.setConversation(c);m.setRole("ASSISTANT");m.setContenu(content.substring(0,Math.min(content.length(),6000)));m.setModele(ollama.properties().getModel());m.setDureeMs(Duration.between(start,Instant.now()).toMillis());messages.save(m);
        return new SendMessageResponse(message(m),List.copyOf(stillPublished),profile(c));}
    private List<RecommendationResponse> currentRecommendations(Long id){return recommendations.findByConversationIdOrderByRangAsc(id).stream().filter(r->r.getFormation().getStatut()==FormationStatus.PUBLIEE).map(this::recommendation).toList();}
    private void copyProfile(OrientationConversation from,OrientationConversation to){to.setObjectif(from.getObjectif());to.setNiveau(from.getNiveau());to.setCompetences(from.getCompetences());to.setLangue(from.getLangue());to.setBudget(from.getBudget());to.setMinutesHebdomadaires(from.getMinutesHebdomadaires());to.setFormatPedagogique(from.getFormatPedagogique());to.setBesoinClasses(from.getBesoinClasses());}
    @Transactional(readOnly=true) protected OrientationConversation loadOwned(Long id,String session,Authentication auth){return owned(id,session,auth);}
    private OrientationConversation owned(Long id,String session,Authentication auth){Participant p=participantOrNull(auth);Optional<OrientationConversation> found=p==null?conversations.findByIdAndParticipantIsNullAndSessionId(id,validSession(session)):conversations.findByIdAndParticipantEmail(id,p.getEmail());return found.orElseThrow(()->error(HttpStatus.NOT_FOUND,"CONVERSATION_NOT_FOUND","Conversation introuvable."));}
    private Participant participantOrNull(Authentication auth){if(auth==null||!auth.isAuthenticated()||"anonymousUser".equals(auth.getPrincipal()))return null;User u=users.findByEmail(auth.getName()).orElseThrow(()->error(HttpStatus.UNAUTHORIZED,"UNAUTHORIZED","Authentification requise."));if(!(u instanceof Participant p))throw error(HttpStatus.FORBIDDEN,"CONVERSATION_FORBIDDEN","L’orientation personnelle est réservée aux participants et visiteurs.");return p;}
    private Participant requireParticipant(Authentication auth){Participant p=participantOrNull(auth);if(p==null)throw error(HttpStatus.UNAUTHORIZED,"UNAUTHORIZED","Connectez-vous pour consulter l’historique.");return p;}
    private String validOrNewSession(String value){if(value==null||!value.matches("[A-Za-z0-9_-]{16,64}"))return UUID.randomUUID().toString();return value;}
    private String validSession(String value){if(value==null||!value.matches("[A-Za-z0-9_-]{16,64}"))throw notFound();return value;}
    private List<OrientationMessage> recent(Long id){List<OrientationMessage> list=new ArrayList<>(messages.recent(id,PageRequest.of(0,ollama.properties().getMaxHistoryMessages())));Collections.reverse(list);return list;}
    private SendMessageResponse latestResult(OrientationConversation c){ConversationResponse r=response(c);MessageResponse last=r.messages().stream().filter(m->m.role().equals("ASSISTANT")).reduce((a,b)->b).orElse(null);return new SendMessageResponse(last,r.recommandations(),r.profil());}
    private ConversationResponse response(OrientationConversation c){return new ConversationResponse(c.getId(),c.getSessionId(),c.getTitre(),c.getStatut(),profile(c),messages.findByConversationIdOrderByCreatedAtAscIdAsc(c.getId()).stream().map(this::message).toList(),recommendations.findByConversationIdOrderByRangAsc(c.getId()).stream().map(this::recommendation).toList(),c.getCreatedAt(),c.getUpdatedAt());}
    private MessageResponse message(OrientationMessage m){return new MessageResponse(m.getId(),m.getRole(),m.getContenu(),m.getStatut(),m.getModele(),m.getDureeMs(),m.getCreatedAt());}
    private RecommendationResponse recommendation(OrientationRecommendation r){Formation f=r.getFormation();List<String> reasons;try{reasons=json.readValue(r.getRaisonsJson(),json.getTypeFactory().constructCollectionType(List.class,String.class));}catch(Exception e){reasons=List.of();}
        boolean classes=f.isClassesGratuites()||f.getSupplementClasses().signum()>0;return new RecommendationResponse(f.getId(),f.getTitre(),f.getCategorie(),f.getFormateur().getNom(),f.getNiveau().name(),f.getLangue(),f.getPrix(),classes?f.getPrix().add(f.isClassesGratuites()?java.math.BigDecimal.ZERO:f.getSupplementClasses()):null,classes,r.getScore(),r.getRang(),reasons,f.getModules().stream().map(FormationModule::getTitre).toList(),"/catalogue/"+f.getId());}
    private PreferenceUpdate profile(OrientationConversation c){return new PreferenceUpdate(c.getObjectif(),c.getNiveau(),c.getCompetences()==null?List.of():List.of(c.getCompetences().split("\\|")),c.getLangue(),c.getBudget(),c.getMinutesHebdomadaires(),c.getFormatPedagogique(),c.getBesoinClasses());}
    private BusinessException mapAi(OllamaException e){HttpStatus status=e.getCode().equals("AI_INVALID_RESPONSE")?HttpStatus.BAD_GATEWAY:HttpStatus.SERVICE_UNAVAILABLE;return error(status,e.getCode(),e.getMessage());}
    private BusinessException notFound(){return error(HttpStatus.NOT_FOUND,"CONVERSATION_NOT_FOUND","Conversation introuvable.");}
    private BusinessException error(HttpStatus s,String c,String m){return new BusinessException(s,c,m);} private String safe(String s){return s==null?"":s.strip();}
    private boolean clearlyOffTopic(String message){String value=Normalizer.normalize(message,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT);return List.of("meteo","temps fera","football","match de","recette de cuisine","election","politique internationale").stream().anyMatch(value::contains);}
}
