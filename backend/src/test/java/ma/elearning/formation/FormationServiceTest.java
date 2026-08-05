package ma.elearning.formation;

import ma.elearning.api.FormationDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class FormationServiceTest {
    @Autowired FormationService service;
    @Autowired FormateurRepository formateurs;
    @MockitoBean ObjectStorage storage;
    private Formateur owner;
    private Formateur other;

    @BeforeEach
    void setUp() {
        owner = trainer("owner@formation.test");
        other = trainer("other@formation.test");
    }

    @Test
    void formationCrudIsRestrictedToItsOwner() {
        FormationDetail created = service.create(owner.getEmail(), request("Java moderne"));
        assertEquals(FormationStatus.BROUILLON, created.statut());
        assertEquals(1, service.list(owner.getEmail()).size());
        assertEquals(0, service.list(other.getEmail()).size());
        BusinessException hidden = assertThrows(BusinessException.class,
                () -> service.detail(other.getEmail(), created.id()));
        assertEquals("CONTENT_NOT_FOUND", hidden.getCode());

        FormationRequest update = new FormationRequest("Java avancé", "Une description complète",
                "fr", NiveauFormation.AVANCE, "Développement", new BigDecimal("199.00"));
        assertEquals("Java avancé", service.update(owner.getEmail(), created.id(), update).titre());
    }

    @Test
    void modulesAndChaptersAreReorderedTransactionallyAndPreviewStaysFirst() {
        Long formationId = service.create(owner.getEmail(), request("Architecture")).id();
        ModuleResponse first = service.addModule(owner.getEmail(), formationId,
                new ModuleRequest("Fondations", null, true));
        ModuleResponse second = service.addModule(owner.getEmail(), formationId,
                new ModuleRequest("Pratique", null, false));
        assertEquals("INVALID_PREVIEW_MODULE", assertThrows(BusinessException.class,
                () -> service.updateModule(owner.getEmail(), second.id(),
                        new ModuleRequest("Pratique", null, true))).getCode());

        List<ModuleResponse> modules = service.reorderModules(owner.getEmail(), formationId,
                new ReorderRequest(List.of(second.id(), first.id())));
        assertEquals(List.of(second.id(), first.id()), modules.stream().map(ModuleResponse::id).toList());
        assertFalse(modules.get(1).apercuGratuit());
        assertTrue(service.updateModule(owner.getEmail(), second.id(),
                new ModuleRequest("Pratique", null, true)).apercuGratuit());

        ChapitreResponse one = service.addChapitre(owner.getEmail(), second.id(),
                new ChapitreRequest("Chapitre 1", null));
        ChapitreResponse two = service.addChapitre(owner.getEmail(), second.id(),
                new ChapitreRequest("Chapitre 2", null));
        List<ChapitreResponse> reordered = service.reorderChapitres(owner.getEmail(), second.id(),
                new ReorderRequest(List.of(two.id(), one.id())));
        assertEquals(0, reordered.get(0).ordre());
        assertEquals(two.id(), reordered.get(0).id());
    }

    @Test
    void filesUseGeneratedStorageKeysAndDeletionRemovesTheObjectAfterCommit() {
        Long formationId = service.create(owner.getEmail(), request("Contenus")).id();
        Long moduleId = service.addModule(owner.getEmail(), formationId,
                new ModuleRequest("Module", null, false)).id();
        Long chapterId = service.addChapitre(owner.getEmail(), moduleId,
                new ChapitreRequest("Chapitre", null)).id();
        byte[] pdf = "%PDF-1.7\nsample".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile("file", "../support.pdf",
                "application/pdf", pdf);

        RessourceResponse resource = service.uploadResource(owner.getEmail(), chapterId,
                "Support", ResourceType.PDF, true, file);
        assertEquals("support.pdf", resource.nomOriginal());
        assertTrue(resource.telechargeable());
        assertTrue(resource.cleStockage().startsWith("formations/" + formationId + "/chapitres/" + chapterId + "/"));
        verify(storage).put(eq(resource.cleStockage()), any(), eq((long) pdf.length), eq("application/pdf"));

        service.deleteResource(owner.getEmail(), resource.id());
        verify(storage).delete(resource.cleStockage());
    }

    @Test
    void youtubeLinksAreStrictlyValidated() {
        Long formationId = service.create(owner.getEmail(), request("Vidéo")).id();
        Long moduleId = service.addModule(owner.getEmail(), formationId,
                new ModuleRequest("Module", null, false)).id();
        Long chapterId = service.addChapitre(owner.getEmail(), moduleId,
                new ChapitreRequest("Chapitre", null)).id();
        RessourceResponse resource = service.addYoutube(owner.getEmail(), chapterId,
                new YoutubeRequest("Démonstration", "https://youtu.be/abc123"));
        assertEquals(ResourceType.YOUTUBE, resource.type());
        assertEquals("https://www.youtube.com/watch?v=abc123", resource.urlYoutube());
        assertEquals("https://www.youtube.com/watch?v=watch123",
                service.addYoutube(owner.getEmail(), chapterId,
                        new YoutubeRequest("Watch", "https://www.youtube.com/watch?v=watch123&t=20")).urlYoutube());
        assertEquals("https://www.youtube.com/watch?v=shorts123",
                service.addYoutube(owner.getEmail(), chapterId,
                        new YoutubeRequest("Short", "https://youtube.com/shorts/shorts123?feature=share")).urlYoutube());
        assertEquals("https://www.youtube.com/watch?v=embed123",
                service.addYoutube(owner.getEmail(), chapterId,
                        new YoutubeRequest("Embed", "https://m.youtube.com/embed/embed123")).urlYoutube());
        assertEquals("INVALID_YOUTUBE_URL", assertThrows(BusinessException.class,
                () -> service.addYoutube(owner.getEmail(), chapterId,
                        new YoutubeRequest("Piège", "https://youtube.com.evil.test/watch?v=x"))).getCode());
    }

    private Formateur trainer(String email) {
        Formateur trainer = new Formateur();
        trainer.setNom("Formateur");
        trainer.setEmail(email);
        trainer.setPasswordHash("hash");
        trainer.setRole(Role.FORMATEUR);
        trainer.setStatut(AccountStatus.ACTIF);
        return formateurs.saveAndFlush(trainer);
    }

    private FormationRequest request(String title) {
        return new FormationRequest(title, "Description de la formation", "fr",
                NiveauFormation.DEBUTANT, "Développement", new BigDecimal("99.00"));
    }
}
