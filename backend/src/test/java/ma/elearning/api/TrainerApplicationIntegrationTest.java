package ma.elearning.api;

import ma.elearning.storage.ObjectStorage;
import ma.elearning.user.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class TrainerApplicationIntegrationTest {
    @Autowired MockMvc mvc; @Autowired UserRepository users; @Autowired TrainerCredentialRepository credentials;
    @MockitoBean JavaMailSender mail; @MockitoBean ObjectStorage storage;

    @Test void registrationRequiresAndStoresARealCredentialWithProfile() throws Exception {
        String profile="{\"nom\":\"Nora Trainer\",\"email\":\"nora.credentials@test.local\",\"telephone\":\"0600000000\",\"specialite\":\"Java et Spring\",\"biographie\":\"Formatrice avec huit années d'expérience professionnelle.\",\"password\":\"Password1!\"}";
        var profilePart=new MockMultipartFile("profile","","application/json",profile.getBytes());
        var pdf=new MockMultipartFile("cv","cv-nora.pdf","application/pdf","%PDF-1.4 test".getBytes());
        mvc.perform(multipart("/api/auth/register/formateur").file(profilePart).file(pdf))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.statut").value("EN_ATTENTE"));
        Formateur trainer=(Formateur)users.findByEmail("nora.credentials@test.local").orElseThrow();
        assertEquals("Java et Spring",trainer.getSpecialite());assertEquals(1,credentials.countByFormateurId(trainer.getId()));
        assertEquals(TrainerDocumentType.CV,credentials.findByFormateurIdOrderByIdAsc(trainer.getId()).getFirst().getType());
        verify(storage).put(startsWith("trainer-applications/"+trainer.getId()+"/"),any(),longThat(value->value>0),eq("application/pdf"));
    }

    @Test void registrationRejectsMissingDocuments() throws Exception {
        String profile="{\"nom\":\"No Paper\",\"email\":\"no.paper@test.local\",\"specialite\":\"Design\",\"biographie\":\"Présentation professionnelle suffisante.\",\"password\":\"Password1!\"}";
        mvc.perform(multipart("/api/auth/register/formateur").file(new MockMultipartFile("profile","","application/json",profile.getBytes())))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("TRAINER_CV_REQUIRED"));
        assertTrue(users.findByEmail("no.paper@test.local").isEmpty());
    }
}
