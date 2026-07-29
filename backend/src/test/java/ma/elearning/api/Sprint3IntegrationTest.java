package ma.elearning.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.api.FormationDtos.*;
import ma.elearning.api.QuizDtos.*;
import ma.elearning.formation.*;
import ma.elearning.learning.InscriptionRepository;
import ma.elearning.quiz.QuizService;
import ma.elearning.security.JwtService;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class Sprint3IntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired JwtService jwt;
 @Autowired FormationService formationService; @Autowired InscriptionRepository inscriptions; @Autowired QuizService quizService;
 @MockitoBean ObjectStorage storage;
 private Formateur trainer; private Participant participant; private Admin admin; private Long formationId; private Long previewResource; private Long lockedResource;
 @BeforeEach void setup(){
  when(storage.temporaryUrl(anyString())).thenAnswer(i->"http://temporary.test/"+i.getArgument(0));
  trainer=save(new Formateur(),"trainer@s3.test",Role.FORMATEUR);participant=save(new Participant(),"participant@s3.test",Role.PARTICIPANT);admin=save(new Admin(),"admin@s3.test",Role.ADMIN);
  formationId=formationService.create(trainer.getEmail(),new FormationRequest("Spring sécurisé","Catalogue public","fr",NiveauFormation.DEBUTANT,"Java",new BigDecimal("99.00"))).id();
  Long m1=formationService.addModule(trainer.getEmail(),formationId,new ModuleRequest("Aperçu",null,true)).id();
  Long c1=formationService.addChapitre(trainer.getEmail(),m1,new ChapitreRequest("Introduction",null)).id();
  previewResource=formationService.addYoutube(trainer.getEmail(),c1,new YoutubeRequest("Présentation","https://youtu.be/preview")).id();
  Long m2=formationService.addModule(trainer.getEmail(),formationId,new ModuleRequest("Complet",null,false)).id();
  Long c2=formationService.addChapitre(trainer.getEmail(),m2,new ChapitreRequest("Avancé",null)).id();
  lockedResource=formationService.addYoutube(trainer.getEmail(),c2,new YoutubeRequest("Cours","https://youtu.be/full")).id();
  formationService.changeStatus(trainer.getEmail(),formationId,FormationStatus.PUBLIEE);
 }
 @Test void catalogueIsPublicSearchableAndPreviewOnlyBeforeEnrollment() throws Exception{
  mvc.perform(get("/api/catalogue").param("q","Spring")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
  mvc.perform(get("/api/catalogue/"+formationId)).andExpect(status().isOk()).andExpect(jsonPath("$.inscrit").value(false))
   .andExpect(jsonPath("$.modules[0].verrouille").value(false)).andExpect(jsonPath("$.modules[1].verrouille").value(true));
  mvc.perform(get("/api/catalogue/"+formationId+"/ressources/"+previewResource+"/acces")).andExpect(status().isOk());
  mvc.perform(get("/api/catalogue/"+formationId+"/ressources/"+lockedResource+"/acces")).andExpect(status().isForbidden());
 }
 @Test void simulatedEnrollmentIsParticipantOnlyIdempotentAndUnlocksContent() throws Exception{
  String token=jwt.generate(participant);
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+token))
   .andExpect(status().isOk()).andExpect(jsonPath("$.modePaiement").value("SIMULATION")).andExpect(jsonPath("$.prixPaye").value(99.0))
   .andExpect(jsonPath("$.typeAcces").value("CONTENU"));
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+token)).andExpect(status().isOk());
  assertEquals(1,inscriptions.count());
  mvc.perform(get("/api/catalogue/"+formationId+"/ressources/"+lockedResource+"/acces").header("Authorization","Bearer "+token)).andExpect(status().isOk());
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+jwt.generate(trainer))).andExpect(status().isForbidden());
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+jwt.generate(admin))).andExpect(status().isForbidden());
 }
 @Test void unpublishedFormationCannotBeEnrolledOrListed() throws Exception{
  formationService.changeStatus(trainer.getEmail(),formationId,FormationStatus.DEPUBLIEE);
  mvc.perform(get("/api/catalogue")).andExpect(jsonPath("$.totalElements").value(0));
  mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+jwt.generate(participant))).andExpect(status().isNotFound());
 }
 @Test void quizNeverExposesCorrectAnswersAndServerComputesScore() throws Exception{
  String token=jwt.generate(participant);mvc.perform(post("/api/participant/formations/"+formationId+"/inscription").header("Authorization","Bearer "+token)).andExpect(status().isOk());
  var detail=formationService.detail(trainer.getEmail(),formationId);
  for(var module:detail.modules())for(var chapter:module.chapitres())mvc.perform(put("/api/participant/formations/"+formationId+"/chapitres/"+chapter.id()+"/progression")
   .header("Authorization","Bearer "+token).contentType("application/json").content("{\"termine\":true,\"positionVideoSecondes\":0}")).andExpect(status().isOk());
  QuizAdmin created=quizService.create(trainer.getEmail(),formationId,new QuizRequest("Validation",new BigDecimal("50"),false,true,List.of(
   new QuestionEdit(null,"Java est typé ?",0,BigDecimal.ONE,List.of(new AnswerEdit(null,"Oui",true,0),new AnswerEdit(null,"Non",false,1))))));
  String body=mvc.perform(get("/api/participant/quiz/"+created.id()).header("Authorization","Bearer "+token)).andExpect(status().isOk())
   .andExpect(jsonPath("$.questions[0].reponses[0].correcte").doesNotExist()).andReturn().getResponse().getContentAsString();
  assertFalse(body.contains("correcte"));
  Long q=created.questions().getFirst().id(),answer=created.questions().getFirst().reponses().getFirst().id();
  mvc.perform(post("/api/participant/quiz/"+created.id()+"/tentatives").header("Authorization","Bearer "+token).contentType("application/json")
   .content(json.writeValueAsString(new Submission(Map.of(q,List.of(answer))))))
   .andExpect(status().isOk()).andExpect(jsonPath("$.pourcentage").value(100.0)).andExpect(jsonPath("$.reussi").value(true));
 }
 private <T extends User>T save(T u,String email,Role role){u.setNom("Test");u.setEmail(email);u.setPasswordHash("hash");u.setRole(role);u.setStatut(AccountStatus.ACTIF);return (T)users.saveAndFlush(u);}
}
