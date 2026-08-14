package ma.elearning.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.api.FormationDtos.*;
import ma.elearning.formation.*;
import ma.elearning.learning.*;
import ma.elearning.security.JwtService;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.user.*;
import ma.elearning.virtualclass.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class Sprint4IntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired JwtService jwt;
 @Autowired FormationService formations; @Autowired VirtualClassService classes;
 @Autowired ClassReminderService reminders; @Autowired ma.elearning.engagement.UserNotificationRepository notifications;
 @Autowired InscriptionRepository inscriptions; @Autowired OperationAccesRepository operations;
 @MockitoBean ObjectStorage storage;
 Formateur trainer,otherTrainer;Participant member,outsider;Long formationId;
 @BeforeEach void setup(){
  trainer=save(new Formateur(),"trainer@s4.test",Role.FORMATEUR);otherTrainer=save(new Formateur(),"other@s4.test",Role.FORMATEUR);
  member=save(new Participant(),"member@s4.test",Role.PARTICIPANT);outsider=save(new Participant(),"outsider@s4.test",Role.PARTICIPANT);
  formationId=formations.create(trainer.getEmail(),new FormationRequest("Classe Spring","Cours","fr",NiveauFormation.DEBUTANT,"Java",new BigDecimal("100.00"),new BigDecimal("25.00"),false)).id();
  Long module=formations.addModule(trainer.getEmail(),formationId,new ModuleRequest("Module",null,true)).id();
  Long chapter=formations.addChapitre(trainer.getEmail(),module,new ChapitreRequest("Chapitre",null)).id();
  formations.addYoutube(trainer.getEmail(),chapter,new YoutubeRequest("Ressource","https://youtu.be/sprint4-resource"));
  formations.changeStatus(trainer.getEmail(),formationId,FormationStatus.PUBLIEE);
 }
 @Test void upgradeIsPricedIdempotentAndPreservesSnapshot()throws Exception{
  String token=jwt.generate(member);
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+token)).andExpect(status().isOk());
  mvc.perform(post("/api/participant/formations/"+formationId+"/upgrade-classes").header("Authorization","Bearer "+token).header("Idempotency-Key","upgrade-1"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.montant").value(25.0)).andExpect(jsonPath("$.devise").value("DH")).andExpect(jsonPath("$.typeAcces").value("CONTENU_ET_CLASSES")).andExpect(jsonPath("$.mode").value("SIMULATION")).andExpect(jsonPath("$.statut").value("CONFIRME"));
  mvc.perform(post("/api/participant/formations/"+formationId+"/upgrade-classes").header("Authorization","Bearer "+token).header("Idempotency-Key","upgrade-1")).andExpect(status().isOk());
  assertEquals(1,operations.count());assertEquals(new BigDecimal("25.00"),operations.findAll().getFirst().getMontantSimule());
  mvc.perform(post("/api/participant/formations/"+formationId+"/upgrade-classes").header("Authorization","Bearer "+token).header("Idempotency-Key","upgrade-2")).andExpect(status().isConflict());
 }
 @Test void classOwnershipDatesMembershipAndJitsiAreEnforced()throws Exception{
  String participant=jwt.generate(member),outside=jwt.generate(outsider),trainerToken=jwt.generate(trainer),otherTrainerToken=jwt.generate(otherTrainer);
  mvc.perform(get("/api/catalogue")).andExpect(status().isOk()).andExpect(jsonPath("$.content[0].offreClasses").value(true)).andExpect(jsonPath("$.content[0].classeActive").value(false));
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription-avec-classes").header("Authorization","Bearer "+participant).header("Idempotency-Key","full-1"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.montant").value(125.0));
  var c=classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(formationId,"Groupe A",null,10,LocalDate.now().minusDays(1),LocalDate.now().plusDays(30)));
  mvc.perform(get("/api/catalogue")).andExpect(status().isOk()).andExpect(jsonPath("$.content[0].classeActive").value(true));
  assertThrows(RuntimeException.class,()->classes.update(otherTrainer.getEmail(),c.id(),new VirtualClassDtos.ClasseRequest(formationId,"Vol",null,10,LocalDate.now(),LocalDate.now().plusDays(1))));
  classes.addMember(trainer.getEmail(),c.id(),member.getId());
  var future=classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Bientôt",Instant.now().plusSeconds(3600),Instant.now().plusSeconds(7200),"Africa/Casablanca"));
  mvc.perform(get("/api/formateur/seances/"+future.id()+"/join")).andExpect(status().isUnauthorized());
  mvc.perform(get("/api/formateur/seances/"+future.id()+"/join").header("Authorization","Bearer "+otherTrainerToken)).andExpect(status().isNotFound());
  mvc.perform(get("/api/participant/seances/"+future.id()+"/join").header("Authorization","Bearer "+outside)).andExpect(status().isForbidden());
  mvc.perform(get("/api/participant/seances/"+future.id()+"/join").header("Authorization","Bearer "+participant)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SESSION_NOT_ACTIVE"));
  mvc.perform(get("/api/formateur/seances/"+future.id()+"/join").header("Authorization","Bearer "+trainerToken)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SESSION_NOT_ACTIVE"));
  var live=classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Direct",Instant.now().minusSeconds(30),Instant.now().plusSeconds(3000),"Africa/Casablanca"));
  mvc.perform(get("/api/participant/seances/"+live.id()+"/join").header("Authorization","Bearer "+participant)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("TRAINER_NOT_JOINED"));
  mvc.perform(get("/api/formateur/seances/"+live.id()+"/join").header("Authorization","Bearer "+trainerToken)).andExpect(status().isOk())
   .andExpect(jsonPath("$.displayName").value(trainer.getNom())).andExpect(jsonPath("$.moderator").value(true))
   .andExpect(jsonPath("$.joinUrl").value(org.hamcrest.Matchers.containsString("config.prejoinPageEnabled=false")));
  mvc.perform(get("/api/participant/seances/"+live.id()+"/join").header("Authorization","Bearer "+participant)).andExpect(status().isOk())
   .andExpect(jsonPath("$.roomName").value(org.hamcrest.Matchers.startsWith("elearning-")))
   .andExpect(jsonPath("$.displayName").value(member.getNom())).andExpect(jsonPath("$.moderator").value(false))
   .andExpect(jsonPath("$.joinUrl").value(org.hamcrest.Matchers.startsWith("https://meet.jit.si/")));
  var cancelled=classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Annulée",Instant.now().plusSeconds(10800),Instant.now().plusSeconds(14400),"Africa/Casablanca"));
  classes.cancel(trainer.getEmail(),cancelled.id());
  mvc.perform(get("/api/participant/seances/"+cancelled.id()+"/join").header("Authorization","Bearer "+participant))
   .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SESSION_UNAVAILABLE"));
  var ended=classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Terminée",Instant.now().minusSeconds(7200),Instant.now().minusSeconds(3600),"Africa/Casablanca"));
  mvc.perform(get("/api/formateur/seances/"+ended.id()+"/join").header("Authorization","Bearer "+trainerToken))
   .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SESSION_NOT_ACTIVE"));
 }
 @Test void invalidSessionDatesAndContentOnlyAssignmentAreRejected()throws Exception{
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+jwt.generate(member))).andExpect(status().isOk());
  var c=classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(formationId,"Groupe B",null,2,LocalDate.now(),LocalDate.now()));
  assertThrows(RuntimeException.class,()->classes.addMember(trainer.getEmail(),c.id(),member.getId()));
  assertThrows(RuntimeException.class,()->classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Erreur",Instant.now(),Instant.now(),"UTC")));
 }
 @Test void classCapacityEligibilityAndSchedulingConflictsAreEnforced()throws Exception{
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription-avec-classes").header("Authorization","Bearer "+jwt.generate(member)).header("Idempotency-Key","phase2-member")).andExpect(status().isOk());
  var c=classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(formationId,"Contraintes",null,1,LocalDate.now(),LocalDate.now().plusDays(2)));
  classes.addMember(trainer.getEmail(),c.id(),member.getId());
  assertThrows(RuntimeException.class,()->classes.update(trainer.getEmail(),c.id(),new VirtualClassDtos.ClasseRequest(formationId,"Contraintes",null,0,LocalDate.now(),LocalDate.now().plusDays(2))));
  Instant start=Instant.now().plusSeconds(3600),end=start.plusSeconds(1800);
  var session=classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Créneau",start,end,"Africa/Casablanca"));
  assertThrows(RuntimeException.class,()->classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Doublon",start,end,"Africa/Casablanca")));
  assertThrows(RuntimeException.class,()->classes.updateSession(trainer.getEmail(),session.id(),new VirtualClassDtos.SessionRequest("Hors dates",start,Instant.now().plus(Duration.ofDays(4)),"Africa/Casablanca")));
  member.setStatut(AccountStatus.SUSPENDU);users.saveAndFlush(member);
  assertTrue(classes.eligible(trainer.getEmail(),c.id()).isEmpty());

  Long noOffer=formations.create(trainer.getEmail(),new FormationRequest("Sans classes","Cours","fr",NiveauFormation.DEBUTANT,"Java",BigDecimal.TEN,BigDecimal.ZERO,false)).id();
  Long module=formations.addModule(trainer.getEmail(),noOffer,new ModuleRequest("M",null,false)).id();
  Long chapter=formations.addChapitre(trainer.getEmail(),module,new ChapitreRequest("C",null)).id();
  formations.addYoutube(trainer.getEmail(),chapter,new YoutubeRequest("R","https://youtu.be/no-class-offer"));
  formations.changeStatus(trainer.getEmail(),noOffer,FormationStatus.PUBLIEE);
  assertThrows(RuntimeException.class,()->classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(noOffer,"Interdite",null,1,LocalDate.now(),LocalDate.now().plusDays(1))));
 }
 @Test void participantClassPayloadNeverExposesMemberIdentities()throws Exception{
  member.setNom("Participant principal");outsider.setNom("Autre membre");users.saveAllAndFlush(java.util.List.of(member,outsider));
  String memberToken=jwt.generate(member),outsiderToken=jwt.generate(outsider),trainerToken=jwt.generate(trainer);
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription-avec-classes").header("Authorization","Bearer "+memberToken).header("Idempotency-Key","privacy-member"))
   .andExpect(status().isOk());
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription-avec-classes").header("Authorization","Bearer "+outsiderToken).header("Idempotency-Key","privacy-outsider"))
   .andExpect(status().isOk());
  var c=classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(formationId,"Groupe confidentiel","Description visible",10,LocalDate.now(),LocalDate.now().plusDays(30)));
  classes.addMember(trainer.getEmail(),c.id(),member.getId());classes.addMember(trainer.getEmail(),c.id(),outsider.getId());
  classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Séance visible",Instant.now().plusSeconds(3600),Instant.now().plusSeconds(7200),"Africa/Casablanca"));

  String participantJson=mvc.perform(get("/api/participant/classes").header("Authorization","Bearer "+memberToken))
   .andExpect(status().isOk()).andExpect(jsonPath("$[0].nom").value("Groupe confidentiel"))
   .andExpect(jsonPath("$[0].seances[0].titre").value("Séance visible"))
   .andExpect(jsonPath("$[0].membres").doesNotExist()).andReturn().getResponse().getContentAsString();
  var payload=json.readTree(participantJson);var classFields=new java.util.HashSet<String>();payload.get(0).fieldNames().forEachRemaining(classFields::add);
  assertEquals(java.util.Set.of("id","formationId","formation","nom","description","capacite","dateDebut","dateFin","statut","seances"),classFields);
  var sessionFields=new java.util.HashSet<String>();payload.get(0).get("seances").get(0).fieldNames().forEachRemaining(sessionFields::add);
  assertEquals(java.util.Set.of("id","titre","dateDebut","dateFin","fuseauHoraire","statut","hostReady"),sessionFields);
  assertFalse(participantJson.contains(member.getNom()));assertFalse(participantJson.contains(member.getEmail()));
  assertFalse(participantJson.contains(outsider.getNom()));assertFalse(participantJson.contains(outsider.getEmail()));

  mvc.perform(get("/api/formateur/classes").header("Authorization","Bearer "+trainerToken))
   .andExpect(status().isOk()).andExpect(jsonPath("$[0].membres.length()").value(2))
   .andExpect(jsonPath("$[0].membres[*].email").value(org.hamcrest.Matchers.containsInAnyOrder(member.getEmail(),outsider.getEmail())));
 }
 @Test void classReminderIsEligibleIdempotentAndLimitedToMembers()throws Exception{
  var c=classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(formationId,"Rappels",null,10,LocalDate.now(),LocalDate.now().plusDays(2)));
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription-avec-classes").header("Authorization","Bearer "+jwt.generate(member)).header("Idempotency-Key","reminder-member"))
   .andExpect(status().isOk());
  classes.addMember(trainer.getEmail(),c.id(),member.getId());
  var eligible=classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Limite",Instant.now().plusSeconds(3500),Instant.now().plusSeconds(7100),"UTC"));
  var cancelled=classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Annulée",Instant.now().plusSeconds(7200),Instant.now().plusSeconds(10800),"UTC"));
  classes.cancel(trainer.getEmail(),cancelled.id());
  reminders.dispatchDueReminders(); reminders.dispatchDueReminders();
  var memberNotifications=notifications.findByUserEmailOrderByCreatedAtDesc(member.getEmail(),org.springframework.data.domain.PageRequest.of(0,50)).getContent();
  assertEquals(1,memberNotifications.stream().filter(n->"Rappel de séance".equals(n.getTitre())).count());
  assertTrue(memberNotifications.stream().filter(n->"Rappel de séance".equals(n.getTitre())).allMatch(n->!n.getMessage().contains("http")));
  assertTrue(memberNotifications.stream().allMatch(n->n.getMessage()==null||!n.getMessage().contains("http")));
  assertTrue(memberNotifications.stream().allMatch(n->n.getActionUrl()==null||!n.getActionUrl().contains("jit.si")));
  assertTrue(notifications.findByUserEmailOrderByCreatedAtDesc(outsider.getEmail(),org.springframework.data.domain.PageRequest.of(0,50)).isEmpty());
  assertNotNull(eligible.id());
 }
 @Test void sessionChangesNotifyAcceptedMembersOncePerBusinessVersion()throws Exception{
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription-avec-classes").header("Authorization","Bearer "+jwt.generate(member)).header("Idempotency-Key","session-events")).andExpect(status().isOk());
  var c=classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(formationId,"Événements",null,5,LocalDate.now(),LocalDate.now().plusDays(2)));classes.addMember(trainer.getEmail(),c.id(),member.getId());
  Instant start=Instant.now().plusSeconds(3600);var request=new VirtualClassDtos.SessionRequest("Initiale",start,start.plusSeconds(1800),"Africa/Casablanca");var session=classes.schedule(trainer.getEmail(),c.id(),request);
  classes.updateSession(trainer.getEmail(),session.id(),request);
  var moved1=new VirtualClassDtos.SessionRequest("Replanifiée",start.plusSeconds(3600),start.plusSeconds(5400),"Africa/Casablanca");classes.updateSession(trainer.getEmail(),session.id(),moved1);
  var moved2=new VirtualClassDtos.SessionRequest("Replanifiée encore",start.plusSeconds(7200),start.plusSeconds(9000),"Africa/Casablanca");classes.updateSession(trainer.getEmail(),session.id(),moved2);
  classes.cancel(trainer.getEmail(),session.id());classes.cancel(trainer.getEmail(),session.id());
  var delivered=notifications.findByUserEmailOrderByCreatedAtDesc(member.getEmail(),org.springframework.data.domain.PageRequest.of(0,50)).getContent();
  assertEquals(1,delivered.stream().filter(value->"Nouvelle séance planifiée".equals(value.getTitre())).count());assertEquals(2,delivered.stream().filter(value->"Séance replanifiée".equals(value.getTitre())).count());assertEquals(1,delivered.stream().filter(value->"Séance annulée".equals(value.getTitre())).count());
  assertTrue(delivered.stream().allMatch(value->"/participant/classes".equals(value.getActionUrl())));assertTrue(delivered.stream().allMatch(value->!value.getMessage().contains("http")));
 }
 @SuppressWarnings("unchecked") private <T extends User>T save(T u,String email,Role role){u.setNom("Test");u.setEmail(email);u.setPasswordHash("hash");u.setRole(role);u.setStatut(AccountStatus.ACTIF);return(T)users.saveAndFlush(u);}
}
