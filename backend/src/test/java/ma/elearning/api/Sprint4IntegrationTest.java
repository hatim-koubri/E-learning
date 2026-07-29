package ma.elearning.api;

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
 @Autowired MockMvc mvc; @Autowired UserRepository users; @Autowired JwtService jwt;
 @Autowired FormationService formations; @Autowired VirtualClassService classes;
 @Autowired InscriptionRepository inscriptions; @Autowired OperationAccesRepository operations;
 @MockitoBean ObjectStorage storage;
 Formateur trainer,otherTrainer;Participant member,outsider;Long formationId;
 @BeforeEach void setup(){
  trainer=save(new Formateur(),"trainer@s4.test",Role.FORMATEUR);otherTrainer=save(new Formateur(),"other@s4.test",Role.FORMATEUR);
  member=save(new Participant(),"member@s4.test",Role.PARTICIPANT);outsider=save(new Participant(),"outsider@s4.test",Role.PARTICIPANT);
  formationId=formations.create(trainer.getEmail(),new FormationRequest("Classe Spring","Cours","fr",NiveauFormation.DEBUTANT,"Java",new BigDecimal("100.00"),new BigDecimal("25.00"),false)).id();
  Long module=formations.addModule(trainer.getEmail(),formationId,new ModuleRequest("Module",null,true)).id();
  formations.addChapitre(trainer.getEmail(),module,new ChapitreRequest("Chapitre",null));
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
  String participant=jwt.generate(member),outside=jwt.generate(outsider),trainerToken=jwt.generate(trainer);
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription-avec-classes").header("Authorization","Bearer "+participant).header("Idempotency-Key","full-1"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.montant").value(125.0));
  var c=classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(formationId,"Groupe A",null,10,LocalDate.now(),LocalDate.now().plusDays(30)));
  assertThrows(RuntimeException.class,()->classes.update(otherTrainer.getEmail(),c.id(),new VirtualClassDtos.ClasseRequest(formationId,"Vol",null,10,LocalDate.now(),LocalDate.now().plusDays(1))));
  classes.addMember(trainer.getEmail(),c.id(),member.getId());
  var s=classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Direct",Instant.now().plusSeconds(3600),Instant.now().plusSeconds(7200),"Africa/Casablanca"));
  mvc.perform(get("/api/participant/seances/"+s.id()+"/join").header("Authorization","Bearer "+outside)).andExpect(status().isForbidden());
  mvc.perform(get("/api/participant/seances/"+s.id()+"/join").header("Authorization","Bearer "+participant)).andExpect(status().isOk()).andExpect(jsonPath("$.roomName").value(org.hamcrest.Matchers.startsWith("elearning-"))).andExpect(jsonPath("$.joinUrl").value(org.hamcrest.Matchers.startsWith("https://meet.jit.si/")));
  mvc.perform(get("/api/formateur/seances/"+s.id()+"/join").header("Authorization","Bearer "+trainerToken)).andExpect(status().isOk());
 }
 @Test void invalidSessionDatesAndContentOnlyAssignmentAreRejected()throws Exception{
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+jwt.generate(member))).andExpect(status().isOk());
  var c=classes.create(trainer.getEmail(),new VirtualClassDtos.ClasseRequest(formationId,"Groupe B",null,2,LocalDate.now(),LocalDate.now()));
  assertThrows(RuntimeException.class,()->classes.addMember(trainer.getEmail(),c.id(),member.getId()));
  assertThrows(RuntimeException.class,()->classes.schedule(trainer.getEmail(),c.id(),new VirtualClassDtos.SessionRequest("Erreur",Instant.now(),Instant.now(),"UTC")));
 }
 @SuppressWarnings("unchecked") private <T extends User>T save(T u,String email,Role role){u.setNom("Test");u.setEmail(email);u.setPasswordHash("hash");u.setRole(role);u.setStatut(AccountStatus.ACTIF);return(T)users.saveAndFlush(u);}
}
