package ma.elearning.quiz;

import ma.elearning.api.QuizDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.formation.*;
import ma.elearning.learning.*;
import ma.elearning.engagement.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.util.*;

@Service
public class QuizService {
 private final QuizRepository quizzes; private final FormationRepository formations; private final InscriptionRepository inscriptions;
 private final ProgressionChapitreRepository progressions; private final TentativeQuizRepository attempts;
 private final EngagementService engagement;
 private final CertificateEligibilityService eligibility; private final CertificateEligibilityNotificationService eligibilityNotifications;
 private final Clock clock;
 public QuizService(QuizRepository quizzes,FormationRepository formations,InscriptionRepository inscriptions,
  ProgressionChapitreRepository progressions,TentativeQuizRepository attempts,EngagementService engagement,Clock clock,
  CertificateEligibilityService eligibility,CertificateEligibilityNotificationService eligibilityNotifications){
  this.quizzes=quizzes;this.formations=formations;this.inscriptions=inscriptions;this.progressions=progressions;this.attempts=attempts;this.engagement=engagement;
  this.clock=clock;
  this.eligibility=eligibility;this.eligibilityNotifications=eligibilityNotifications;
 }
 @Transactional(readOnly=true)
 public List<QuizAdmin> trainerList(String email,Long formationId){
  ownedFormation(email,formationId);return quizzes.findByFormationIdOrderByOrdre(formationId).stream().map(this::admin).toList();
 }
 @Transactional
 public QuizAdmin create(String email,Long formationId,QuizRequest request){
  Formation f=ownedFormation(email,formationId);requireEditable(f);Quiz q=new Quiz();q.setFormation(f);q.setOrdre(Math.toIntExact(quizzes.countByFormationId(formationId)));
  apply(q,request);q=quizzes.saveAndFlush(q);
  if(q.isPublie())engagement.notifyFormationParticipants(f,NotificationCategory.QUIZ,"quiz-published:"+q.getId(),"Nouveau quiz disponible","Le quiz "+q.getTitre()+" est disponible dans "+f.getTitre()+".","/apprentissage/"+f.getId()+"/quiz");
  return admin(q);
 }
 @Transactional
 public QuizAdmin update(String email,Long id,QuizRequest request){
  Quiz q=ownedQuiz(email,id);requireEditable(q.getFormation());apply(q,request);return admin(quizzes.saveAndFlush(q));
 }
 @Transactional
 public void delete(String email,Long id){Quiz quiz=ownedQuiz(email,id);requireEditable(quiz.getFormation());quizzes.delete(quiz);}
 @Transactional(readOnly=true)
 public List<QuizParticipant> participantList(String email,Long formationId){
  Inscription i=inscriptions.findByParticipantEmailAndFormationId(email,formationId)
   .orElseThrow(()->error(HttpStatus.FORBIDDEN,"ENROLLMENT_REQUIRED","Une inscription active est requise."));
  return quizzes.findByFormationIdAndPublieTrueOrderByOrdre(formationId).stream().filter(q->prerequisitesMet(i,q)).map(q->{
   QuizAttemptWindow.Availability availability=availability(i,q);
   return participant(q,i,availability.remaining(),availability.next());
  }).toList();
 }
 @Transactional(readOnly=true)
 public QuizParticipant open(String email,Long id){
  Quiz q=quizzes.findByIdAndPublieTrue(id).orElseThrow(this::notFound);Inscription i=enrollment(email,q);
  requirePrerequisites(i,q);QuizAttemptWindow.Availability availability=availability(i,q);
  if(availability.remaining()==0)throw error(HttpStatus.TOO_MANY_REQUESTS,"ATTEMPT_LIMIT","Limite de trois tentatives atteinte pour la période.");
  return participant(q,i,availability.remaining(),availability.next());
 }
 @Transactional
 public QuizResult submit(String email,Long id,Submission submission){
  Quiz q=quizzes.findByIdAndPublieTrue(id).orElseThrow(this::notFound);
  enrollment(email,q);
  Inscription i=inscriptions.findLockedByParticipantEmailAndFormationId(email,q.getFormation().getId()).orElseThrow(this::notFound);
  requirePrerequisites(i,q);
  if(availability(i,q).remaining()==0)
   throw error(HttpStatus.CONFLICT,"ATTEMPT_LIMIT","Limite de trois tentatives atteinte pour la période.");
  validateSubmittedIds(q,submission);
  BigDecimal score=BigDecimal.ZERO,max=q.getQuestions().stream().map(Question::getPoints).reduce(BigDecimal.ZERO,BigDecimal::add);
  List<QuestionFeedback> feedback=new ArrayList<>();
  for(Question question:q.getQuestions()){
   Set<Long> expected=question.getReponses().stream().filter(ReponseProposee::isCorrecte).map(ReponseProposee::getId).collect(java.util.stream.Collectors.toSet());
   Set<Long> selected=new HashSet<>(submission.reponses().getOrDefault(question.getId(),List.of()));
   boolean correct=selected.equals(expected);if(correct)score=score.add(question.getPoints());
   feedback.add(new QuestionFeedback(question.getId(),correct,question.getExplication()));
  }
  BigDecimal percent=max.signum()==0?BigDecimal.ZERO:score.multiply(BigDecimal.valueOf(100)).divide(max,2,RoundingMode.HALF_UP);
  Instant submittedAt=clock.instant();TentativeQuiz a=new TentativeQuiz();a.setQuiz(q);a.setInscription(i);a.submit(score,max,percent.compareTo(q.getScoreMinimal())>=0,submittedAt);
  a=attempts.saveAndFlush(a);engagement.recordActivity(email,q.getFormation().getId(),ActivityType.QUIZ_SOUMIS,"quiz-attempt:"+a.getId(),10);
  if(Boolean.TRUE.equals(a.getReussi()))eligibilityNotifications.notifyIfEligible(i);
  List<ReviewChapter> reviewChapters=Boolean.TRUE.equals(a.getReussi())?List.of():q.getFormation().getModules().stream()
   .flatMap(module->module.getChapitres().stream()).limit(3).map(chapter->new ReviewChapter(chapter.getId(),chapter.getTitre())).toList();
  return new QuizResult(a.getId(),score,max,percent,Boolean.TRUE.equals(a.getReussi()),submittedAt,feedback,reviewChapters);
 }
 @Transactional(readOnly=true)
 public EvaluationPlan evaluationPlan(String email,Long formationId){
  Inscription inscription=inscriptions.findByParticipantEmailAndFormationId(email,formationId)
   .orElseThrow(()->error(HttpStatus.FORBIDDEN,"ENROLLMENT_REQUIRED","Une inscription active est requise."));
  Formation formation=inscription.getFormation();
  List<Quiz> published=quizzes.findByFormationIdAndPublieTrueOrderByOrdre(formationId);
  Set<Long> completed=progressions.findByInscriptionId(inscription.getId()).stream().filter(ProgressionChapitre::isTermine)
   .map(value->value.getChapitre().getId()).collect(java.util.stream.Collectors.toSet());
  List<PlannedQuiz> modules=new ArrayList<>();
  for(FormationModule module:formation.getModules()){
   if(module.getChapitres().isEmpty())continue;
   Chapitre last=module.getChapitres().get(module.getChapitres().size()-1);
   Quiz quiz=published.stream().filter(value->value.getChapitre()!=null&&value.getChapitre().getId().equals(last.getId())).findFirst().orElse(null);
   if(quiz!=null)modules.add(planned(quiz,module,completed.contains(last.getId()),inscription));
  }
  Quiz finalQuiz=published.stream().filter(value->value.getChapitre()==null&&value.getTitre().toLowerCase(Locale.ROOT).contains("quiz final"))
   .reduce((first,second)->second).orElse(null);
  boolean chaptersDone=formation.getModules().stream().flatMap(value->value.getChapitres().stream())
   .allMatch(value->completed.contains(value.getId()));
  boolean modulesPassed=modules.stream().allMatch(PlannedQuiz::reussi);
  PlannedQuiz finalPlan=finalQuiz==null?null:planned(finalQuiz,null,chaptersDone&&modulesPassed,inscription);
  int required=modules.size()+(finalPlan==null?0:1);
  int passed=(int)modules.stream().filter(PlannedQuiz::reussi).count()+(finalPlan!=null&&finalPlan.reussi()?1:0);
  return new EvaluationPlan(modules,finalPlan,passed,required,eligibility.isEligible(inscription));
 }
 private PlannedQuiz planned(Quiz quiz,FormationModule module,boolean available,Inscription inscription){
  boolean passed=attempts.existsByInscriptionIdAndQuizIdAndReussiTrue(inscription.getId(),quiz.getId());
  return new PlannedQuiz(quiz.getId(),quiz.getTitre(),module==null?null:module.getId(),module==null?null:module.getTitre(),
   quiz.getChapitre()==null?null:quiz.getChapitre().getId(),module==null?"FINAL":"MODULE",passed?"REUSSI":available?"DISPONIBLE":"VERROUILLE",passed);
 }
 private QuizAttemptWindow.Availability availability(Inscription inscription,Quiz quiz){
  Duration cooldown=quiz.isImportant()?Duration.ofHours(24):Duration.ofHours(8);
  List<Instant> passages=attempts.findByInscriptionIdAndQuizIdOrderByDatePassageAsc(inscription.getId(),quiz.getId())
   .stream().map(TentativeQuiz::getDatePassage).filter(Objects::nonNull).toList();
  return QuizAttemptWindow.evaluate(passages,cooldown,clock.instant());
 }
 private void requireEditable(Formation formation){if(formation.getStatut()==FormationStatus.ARCHIVEE)throw error(HttpStatus.CONFLICT,"FORMATION_ARCHIVED","Une formation archivée ne peut plus être modifiée.");}
 private void apply(Quiz q,QuizRequest r){
  validateConfiguration(r);q.setTitre(r.titre().trim());q.setScoreMinimal(r.scoreMinimal().setScale(2,RoundingMode.HALF_UP));
  q.setImportant(r.important());q.setPublie(r.publie());q.getQuestions().clear();
  r.questions().stream().sorted(Comparator.comparingInt(QuestionEdit::ordre)).forEach(qr->{
   Question question=new Question();question.setQuiz(q);question.setLibelle(qr.libelle().trim());question.setExplication(qr.explication()==null||qr.explication().isBlank()?null:qr.explication().trim());question.setOrdre(qr.ordre());question.setPoints(qr.points());
   qr.reponses().stream().sorted(Comparator.comparingInt(AnswerEdit::ordre)).forEach(ar->{ReponseProposee answer=new ReponseProposee();
    answer.setQuestion(question);answer.setLibelle(ar.libelle().trim());answer.setCorrecte(ar.correcte());answer.setOrdre(ar.ordre());question.getReponses().add(answer);});
   q.getQuestions().add(question);
  });
 }
 private void validateConfiguration(QuizRequest r){
  Set<Integer> questionOrders=new HashSet<>();
  for(QuestionEdit q:r.questions()){
   if(!questionOrders.add(q.ordre())||q.reponses().size()<2||q.reponses().stream().noneMatch(AnswerEdit::correcte))
    throw error(HttpStatus.BAD_REQUEST,"INVALID_QUIZ","Chaque question doit avoir un ordre unique, au moins deux réponses et une réponse correcte.");
   if(q.reponses().stream().map(AnswerEdit::ordre).distinct().count()!=q.reponses().size())
    throw error(HttpStatus.BAD_REQUEST,"INVALID_QUIZ","Les réponses doivent avoir des ordres uniques.");
  }
 }
 private void validateSubmittedIds(Quiz q,Submission s){
  Set<Long> questionIds=q.getQuestions().stream().map(Question::getId).collect(java.util.stream.Collectors.toSet());
  if(!questionIds.containsAll(s.reponses().keySet()))throw error(HttpStatus.BAD_REQUEST,"INVALID_ANSWERS","Question inconnue.");
  for(Question question:q.getQuestions()){
   Set<Long> allowed=question.getReponses().stream().map(ReponseProposee::getId).collect(java.util.stream.Collectors.toSet());
   if(!allowed.containsAll(s.reponses().getOrDefault(question.getId(),List.of())))
    throw error(HttpStatus.BAD_REQUEST,"INVALID_ANSWERS","Réponse inconnue ou étrangère au quiz.");
  }
 }
 private boolean prerequisitesMet(Inscription i,Quiz q){
  if(q.getChapitre()!=null)return progressions.findByInscriptionIdAndChapitreId(i.getId(),q.getChapitre().getId()).map(ProgressionChapitre::isTermine).orElse(false);
  long total=i.getFormation().getModules().stream().flatMap(m->m.getChapitres().stream()).count();
  long done=progressions.findByInscriptionId(i.getId()).stream().filter(ProgressionChapitre::isTermine).count();
  if(total>0&&done<total)return false;
  List<Quiz> published=quizzes.findByFormationIdAndPublieTrueOrderByOrdre(i.getFormation().getId());
  return i.getFormation().getModules().stream().filter(module->!module.getChapitres().isEmpty()).allMatch(module->{
   Long lastId=module.getChapitres().getLast().getId();
   Quiz moduleQuiz=published.stream().filter(value->value.getChapitre()!=null&&value.getChapitre().getId().equals(lastId)).findFirst().orElse(null);
   return moduleQuiz==null||attempts.existsByInscriptionIdAndQuizIdAndReussiTrue(i.getId(),moduleQuiz.getId());
  });
 }
 private void requirePrerequisites(Inscription i,Quiz q){
  if(!prerequisitesMet(i,q))throw error(HttpStatus.CONFLICT,"PREREQUISITES_REQUIRED",q.getChapitre()!=null?"Terminez ce chapitre avant son quiz.":"Terminez tous les chapitres avant le quiz final.");
 }
 private Inscription enrollment(String email,Quiz q){return inscriptions.findByParticipantEmailAndFormationId(email,q.getFormation().getId())
  .orElseThrow(()->error(HttpStatus.FORBIDDEN,"ENROLLMENT_REQUIRED","Une inscription active est requise."));}
 private Formation ownedFormation(String email,Long id){return formations.findByIdAndFormateurEmail(id,email).orElseThrow(this::notFound);}
 private Quiz ownedQuiz(String email,Long id){return quizzes.findByIdAndFormationFormateurEmail(id,email).orElseThrow(this::notFound);}
 private QuizAdmin admin(Quiz q){return new QuizAdmin(q.getId(),q.getFormation().getId(),q.getTitre(),q.getOrdre(),q.getScoreMinimal(),q.isImportant(),q.isPublie(),
  q.getQuestions().stream().map(x->new QuestionAdmin(x.getId(),x.getLibelle(),x.getExplication(),x.getOrdre(),x.getPoints(),x.getReponses().stream().map(a->new AnswerAdmin(a.getId(),a.getLibelle(),a.isCorrecte(),a.getOrdre())).toList())).toList());}
 private QuizParticipant participant(Quiz q,Inscription inscription,int remaining,Instant next){
  TentativeQuiz latest=attempts.findFirstByInscriptionIdAndQuizIdAndStatutOrderByDatePassageDesc(inscription.getId(),q.getId(),TentativeStatut.SOUMISE).orElse(null);
  BigDecimal latestPercent=latest==null||latest.getScoreMaximal()==null||latest.getScoreMaximal().signum()==0?null:
   latest.getScore().multiply(BigDecimal.valueOf(100)).divide(latest.getScoreMaximal(),2,RoundingMode.HALF_UP);
  return new QuizParticipant(q.getId(),q.getTitre(),q.getScoreMinimal(),q.isImportant(),remaining,next,
  latestPercent,latest==null?null:latest.getReussi(),latest==null?null:latest.getDateSoumission(),
  q.getQuestions().stream().map(x->new QuestionParticipant(x.getId(),x.getLibelle(),x.getOrdre(),x.getPoints(),x.getReponses().stream().map(a->new AnswerParticipant(a.getId(),a.getLibelle(),a.getOrdre())).toList())).toList());}
 private BusinessException notFound(){return error(HttpStatus.NOT_FOUND,"QUIZ_NOT_FOUND","Quiz introuvable.");}
 private BusinessException error(HttpStatus s,String c,String m){return new BusinessException(s,c,m);}
}
