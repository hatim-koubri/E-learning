package ma.elearning.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.elearning.formation.FormationService;
import ma.elearning.formation.ResourceType;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static ma.elearning.api.FormationDtos.*;

@Validated
@RestController
@RequestMapping("/api/formateur")
public class FormationController {
    private final FormationService service;

    public FormationController(FormationService service) { this.service = service; }

    @PostMapping("/formations")
    @ResponseStatus(HttpStatus.CREATED)
    FormationDetail create(Authentication auth, @Valid @RequestBody FormationRequest request) {
        return service.create(auth.getName(), request);
    }

    @GetMapping("/formations")
    List<FormationSummary> list(Authentication auth) { return service.list(auth.getName()); }

    @GetMapping("/formations/{id}")
    FormationDetail detail(Authentication auth, @PathVariable Long id) {
        return service.detail(auth.getName(), id);
    }

    @PutMapping("/formations/{id}")
    FormationDetail update(Authentication auth, @PathVariable Long id,
                           @Valid @RequestBody FormationRequest request) {
        return service.update(auth.getName(), id, request);
    }

    @PutMapping("/formations/{id}/statut")
    FormationDetail status(Authentication auth, @PathVariable Long id,
                           @Valid @RequestBody FormationStatusRequest request) {
        return service.changeStatus(auth.getName(), id, request.statut());
    }

    @PostMapping(value = "/formations/{id}/couverture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    FormationDetail cover(Authentication auth, @PathVariable Long id,
                          @RequestPart("file") MultipartFile file) {
        return service.uploadCover(auth.getName(), id, file);
    }

    @PostMapping("/formations/{formationId}/modules")
    @ResponseStatus(HttpStatus.CREATED)
    ModuleResponse addModule(Authentication auth, @PathVariable Long formationId,
                             @Valid @RequestBody ModuleRequest request) {
        return service.addModule(auth.getName(), formationId, request);
    }

    @PutMapping("/modules/{id}")
    ModuleResponse updateModule(Authentication auth, @PathVariable Long id,
                                @Valid @RequestBody ModuleRequest request) {
        return service.updateModule(auth.getName(), id, request);
    }

    @DeleteMapping("/modules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteModule(Authentication auth, @PathVariable Long id) {
        service.deleteModule(auth.getName(), id);
    }

    @PutMapping("/formations/{formationId}/modules/ordre")
    List<ModuleResponse> reorderModules(Authentication auth, @PathVariable Long formationId,
                                        @Valid @RequestBody ReorderRequest request) {
        return service.reorderModules(auth.getName(), formationId, request);
    }

    @PostMapping("/modules/{moduleId}/chapitres")
    @ResponseStatus(HttpStatus.CREATED)
    ChapitreResponse addChapitre(Authentication auth, @PathVariable Long moduleId,
                                 @Valid @RequestBody ChapitreRequest request) {
        return service.addChapitre(auth.getName(), moduleId, request);
    }

    @PutMapping("/chapitres/{id}")
    ChapitreResponse updateChapitre(Authentication auth, @PathVariable Long id,
                                    @Valid @RequestBody ChapitreRequest request) {
        return service.updateChapitre(auth.getName(), id, request);
    }

    @DeleteMapping("/chapitres/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteChapitre(Authentication auth, @PathVariable Long id) {
        service.deleteChapitre(auth.getName(), id);
    }

    @PutMapping("/modules/{moduleId}/chapitres/ordre")
    List<ChapitreResponse> reorderChapitres(Authentication auth, @PathVariable Long moduleId,
                                            @Valid @RequestBody ReorderRequest request) {
        return service.reorderChapitres(auth.getName(), moduleId, request);
    }

    @PostMapping(value = "/chapitres/{chapitreId}/ressources/fichier",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    RessourceResponse upload(Authentication auth, @PathVariable Long chapitreId,
                             @RequestParam @NotBlank String titre,
                             @RequestParam ResourceType type,
                             @RequestParam(defaultValue = "false") boolean telechargeable,
                             @RequestPart("file") MultipartFile file) {
        return service.uploadResource(auth.getName(), chapitreId, titre, type, telechargeable, file);
    }

    @PostMapping("/chapitres/{chapitreId}/ressources/youtube")
    @ResponseStatus(HttpStatus.CREATED)
    RessourceResponse youtube(Authentication auth, @PathVariable Long chapitreId,
                              @Valid @RequestBody YoutubeRequest request) {
        return service.addYoutube(auth.getName(), chapitreId, request);
    }

    @PutMapping("/ressources/{id}")
    RessourceResponse updateResource(Authentication auth, @PathVariable Long id,
                                     @Valid @RequestBody ResourceUpdateRequest request) {
        return service.updateResource(auth.getName(), id, request);
    }

    @DeleteMapping("/ressources/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteResource(Authentication auth, @PathVariable Long id) {
        service.deleteResource(auth.getName(), id);
    }

    @PutMapping("/chapitres/{chapitreId}/ressources/ordre")
    List<RessourceResponse> reorderResources(Authentication auth, @PathVariable Long chapitreId,
                                              @Valid @RequestBody ReorderRequest request) {
        return service.reorderResources(auth.getName(), chapitreId, request);
    }
}
