package ma.elearning.formation;

import ma.elearning.api.FormationDtos.*;
import ma.elearning.api.FormationMapper;
import ma.elearning.common.BusinessException;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.storage.UploadValidator;
import ma.elearning.storage.UploadValidator.ValidatedFile;
import ma.elearning.user.AccountStatus;
import ma.elearning.user.Formateur;
import ma.elearning.user.FormateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.*;

@Service
public class FormationService {
    private static final Logger log = LoggerFactory.getLogger(FormationService.class);
    private static final int REORDER_OFFSET = 1_000_000;

    private final FormationRepository formations;
    private final FormationModuleRepository modules;
    private final ChapitreRepository chapitres;
    private final RessourceRepository ressources;
    private final FormateurRepository formateurs;
    private final ObjectStorage storage;
    private final UploadValidator uploads;

    public FormationService(FormationRepository formations, FormationModuleRepository modules,
                            ChapitreRepository chapitres, RessourceRepository ressources,
                            FormateurRepository formateurs, ObjectStorage storage, UploadValidator uploads) {
        this.formations = formations;
        this.modules = modules;
        this.chapitres = chapitres;
        this.ressources = ressources;
        this.formateurs = formateurs;
        this.storage = storage;
        this.uploads = uploads;
    }

    @Transactional
    public FormationDetail create(String email, FormationRequest request) {
        Formation formation = new Formation();
        formation.setFormateur(activeTrainer(email));
        apply(formation, request);
        return FormationMapper.toDetail(formations.saveAndFlush(formation));
    }

    @Transactional(readOnly = true)
    public List<FormationSummary> list(String email) {
        return formations.findByFormateurEmailOrderByUpdatedAtDesc(email).stream()
                .map(FormationMapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public FormationDetail detail(String email, Long id) {
        return FormationMapper.toDetail(ownedFormation(email, id));
    }

    @Transactional
    public FormationDetail update(String email, Long id, FormationRequest request) {
        Formation formation = ownedFormation(email, id);
        apply(formation, request);
        return FormationMapper.toDetail(formations.saveAndFlush(formation));
    }

    @Transactional
    public FormationDetail changeStatus(String email, Long id, FormationStatus status) {
        Formation formation = ownedFormation(email, id);
        if (status == FormationStatus.PUBLIEE && (formation.getModules().isEmpty() ||
                formation.getModules().stream().anyMatch(module -> module.getChapitres().isEmpty()))) {
            throw new BusinessException(HttpStatus.CONFLICT, "INCOMPLETE_FORMATION",
                    "Une formation publiée doit contenir au moins un module et un chapitre par module.");
        }
        formation.setStatut(status);
        return FormationMapper.toDetail(formations.saveAndFlush(formation));
    }

    @Transactional
    public FormationDetail uploadCover(String email, Long id, MultipartFile file) {
        Formation formation = ownedFormation(email, id);
        ValidatedFile valid = uploads.validate(file, ResourceType.IMAGE);
        String key = "formations/" + formation.getId() + "/couverture/" + UUID.randomUUID() + "." + valid.extension();
        put(file, key, valid);
        String oldKey = formation.getImageCouvertureKey();
        try {
            formation.setImageCouvertureKey(key);
            formations.saveAndFlush(formation);
        } catch (RuntimeException ex) {
            safeDelete(key);
            throw ex;
        }
        if (oldKey != null) deleteAfterCommit(oldKey);
        return FormationMapper.toDetail(formation);
    }

    @Transactional
    public ModuleResponse addModule(String email, Long formationId, ModuleRequest request) {
        Formation formation = ownedFormation(email, formationId);
        long count = modules.countByFormationId(formationId);
        if (request.apercuGratuit() && count != 0) throw previewError();
        FormationModule module = new FormationModule();
        module.setFormation(formation);
        apply(module, request);
        module.setPosition(Math.toIntExact(count));
        return FormationMapper.toModule(modules.saveAndFlush(module));
    }

    @Transactional
    public ModuleResponse updateModule(String email, Long id, ModuleRequest request) {
        FormationModule module = ownedModule(email, id);
        if (request.apercuGratuit() && module.getPosition() != 0) throw previewError();
        apply(module, request);
        return FormationMapper.toModule(modules.saveAndFlush(module));
    }

    @Transactional
    public void deleteModule(String email, Long id) {
        FormationModule module = ownedModule(email, id);
        Long formationId = module.getFormation().getId();
        List<String> keys = module.getChapitres().stream().flatMap(c -> c.getRessources().stream())
                .map(RessourcePedagogique::getCleStockage).filter(Objects::nonNull).toList();
        modules.delete(module);
        modules.flush();
        compactModules(formationId);
        keys.forEach(this::deleteAfterCommit);
    }

    @Transactional
    public List<ModuleResponse> reorderModules(String email, Long formationId, ReorderRequest request) {
        ownedFormation(email, formationId);
        List<FormationModule> current = modules.findByFormationIdOrderByPosition(formationId);
        assertExactIds(request.ids(), current.stream().map(FormationModule::getId).toList());
        Map<Long, FormationModule> byId = indexModules(current);
        for (int i = 0; i < request.ids().size(); i++) byId.get(request.ids().get(i)).setPosition(REORDER_OFFSET + i);
        modules.flush();
        for (int i = 0; i < request.ids().size(); i++) {
            FormationModule module = byId.get(request.ids().get(i));
            module.setPosition(i);
            if (i != 0) module.setApercuGratuit(false);
        }
        modules.flush();
        return request.ids().stream().map(byId::get).map(FormationMapper::toModule).toList();
    }

    @Transactional
    public ChapitreResponse addChapitre(String email, Long moduleId, ChapitreRequest request) {
        FormationModule module = ownedModule(email, moduleId);
        Chapitre chapitre = new Chapitre();
        chapitre.setModule(module);
        apply(chapitre, request);
        chapitre.setPosition(Math.toIntExact(chapitres.countByModuleId(moduleId)));
        return FormationMapper.toChapitre(chapitres.saveAndFlush(chapitre));
    }

    @Transactional
    public ChapitreResponse updateChapitre(String email, Long id, ChapitreRequest request) {
        Chapitre chapitre = ownedChapitre(email, id);
        apply(chapitre, request);
        return FormationMapper.toChapitre(chapitres.saveAndFlush(chapitre));
    }

    @Transactional
    public void deleteChapitre(String email, Long id) {
        Chapitre chapitre = ownedChapitre(email, id);
        Long moduleId = chapitre.getModule().getId();
        List<String> keys = chapitre.getRessources().stream().map(RessourcePedagogique::getCleStockage)
                .filter(Objects::nonNull).toList();
        chapitres.delete(chapitre);
        chapitres.flush();
        compactChapitres(moduleId);
        keys.forEach(this::deleteAfterCommit);
    }

    @Transactional
    public List<ChapitreResponse> reorderChapitres(String email, Long moduleId, ReorderRequest request) {
        ownedModule(email, moduleId);
        List<Chapitre> current = chapitres.findByModuleIdOrderByPosition(moduleId);
        assertExactIds(request.ids(), current.stream().map(Chapitre::getId).toList());
        Map<Long, Chapitre> byId = new HashMap<>();
        current.forEach(chapter -> byId.put(chapter.getId(), chapter));
        for (int i = 0; i < request.ids().size(); i++) byId.get(request.ids().get(i)).setPosition(REORDER_OFFSET + i);
        chapitres.flush();
        for (int i = 0; i < request.ids().size(); i++) byId.get(request.ids().get(i)).setPosition(i);
        chapitres.flush();
        return request.ids().stream().map(byId::get).map(FormationMapper::toChapitre).toList();
    }

    @Transactional
    public RessourceResponse uploadResource(String email, Long chapitreId, String titre,
                                             ResourceType type, boolean telechargeable, MultipartFile file) {
        Chapitre chapitre = ownedChapitre(email, chapitreId);
        String safeTitle = title(titre);
        ValidatedFile valid = uploads.validate(file, type);
        String key = "formations/" + chapitre.getModule().getFormation().getId() + "/chapitres/" +
                chapitreId + "/" + UUID.randomUUID() + "." + valid.extension();
        put(file, key, valid);
        RessourcePedagogique resource = new RessourcePedagogique();
        resource.setChapitre(chapitre);
        resource.setType(type);
        resource.setTitre(safeTitle);
        resource.setPosition(Math.toIntExact(ressources.countByChapitreId(chapitreId)));
        resource.setNomOriginal(valid.originalName());
        resource.setTypeMime(valid.contentType());
        resource.setTaille(valid.size());
        resource.setCleStockage(key);
        resource.setTelechargeable(telechargeable && (type == ResourceType.PDF || type == ResourceType.VIDEO));
        try {
            return FormationMapper.toRessource(ressources.saveAndFlush(resource));
        } catch (RuntimeException ex) {
            safeDelete(key);
            throw ex;
        }
    }

    @Transactional
    public RessourceResponse addYoutube(String email, Long chapitreId, YoutubeRequest request) {
        Chapitre chapitre = ownedChapitre(email, chapitreId);
        RessourcePedagogique resource = new RessourcePedagogique();
        resource.setChapitre(chapitre);
        resource.setType(ResourceType.YOUTUBE);
        resource.setTitre(title(request.titre()));
        resource.setPosition(Math.toIntExact(ressources.countByChapitreId(chapitreId)));
        resource.setUrlYoutube(validYoutubeUrl(request.urlYoutube()));
        resource.setTelechargeable(false);
        return FormationMapper.toRessource(ressources.saveAndFlush(resource));
    }

    @Transactional
    public RessourceResponse updateResource(String email, Long id, ResourceUpdateRequest request) {
        RessourcePedagogique resource = ownedResource(email, id);
        resource.setTitre(title(request.titre()));
        resource.setTelechargeable(request.telechargeable() &&
                (resource.getType() == ResourceType.PDF || resource.getType() == ResourceType.VIDEO));
        return FormationMapper.toRessource(ressources.saveAndFlush(resource));
    }

    @Transactional
    public void deleteResource(String email, Long id) {
        RessourcePedagogique resource = ownedResource(email, id);
        Long chapitreId = resource.getChapitre().getId();
        String key = resource.getCleStockage();
        ressources.delete(resource);
        ressources.flush();
        compactResources(chapitreId);
        if (key != null) deleteAfterCommit(key);
    }

    @Transactional
    public List<RessourceResponse> reorderResources(String email, Long chapitreId, ReorderRequest request) {
        ownedChapitre(email, chapitreId);
        List<RessourcePedagogique> current = ressources.findByChapitreIdOrderByPosition(chapitreId);
        assertExactIds(request.ids(), current.stream().map(RessourcePedagogique::getId).toList());
        Map<Long, RessourcePedagogique> byId = new HashMap<>();
        current.forEach(resource -> byId.put(resource.getId(), resource));
        for (int i = 0; i < request.ids().size(); i++) byId.get(request.ids().get(i)).setPosition(REORDER_OFFSET + i);
        ressources.flush();
        for (int i = 0; i < request.ids().size(); i++) byId.get(request.ids().get(i)).setPosition(i);
        ressources.flush();
        return request.ids().stream().map(byId::get).map(FormationMapper::toRessource).toList();
    }

    private void apply(Formation formation, FormationRequest request) {
        formation.setTitre(request.titre().trim());
        formation.setDescription(request.description().trim());
        formation.setLangue(request.langue().trim().toLowerCase(Locale.ROOT));
        formation.setNiveau(request.niveau());
        formation.setCategorie(request.categorie().trim());
        formation.setPrix(request.prix().setScale(2, RoundingMode.UNNECESSARY));
        formation.setSupplementClasses(request.supplementClasses().setScale(2, RoundingMode.UNNECESSARY));
        formation.setClassesGratuites(request.classesGratuites());
        if (request.supplementClasses().signum() == 0 && !request.classesGratuites()) {
            formation.setClassesGratuites(false);
        }
    }

    private void apply(FormationModule module, ModuleRequest request) {
        module.setTitre(request.titre().trim());
        module.setDescription(trimToNull(request.description()));
        module.setApercuGratuit(request.apercuGratuit());
    }

    private void apply(Chapitre chapitre, ChapitreRequest request) {
        chapitre.setTitre(request.titre().trim());
        chapitre.setDescription(trimToNull(request.description()));
    }

    private Formateur activeTrainer(String email) {
        return formateurs.findByEmailAndStatut(email, AccountStatus.ACTIF)
                .orElseThrow(() -> new BusinessException(HttpStatus.FORBIDDEN, "FORMATEUR_NOT_ACTIVE",
                        "Seul un formateur validé peut gérer des formations."));
    }

    private Formation ownedFormation(String email, Long id) {
        return formations.findByIdAndFormateurEmail(id, email).orElseThrow(this::notFound);
    }

    private FormationModule ownedModule(String email, Long id) {
        return modules.findByIdAndFormationFormateurEmail(id, email).orElseThrow(this::notFound);
    }

    private Chapitre ownedChapitre(String email, Long id) {
        return chapitres.findByIdAndModuleFormationFormateurEmail(id, email).orElseThrow(this::notFound);
    }

    private RessourcePedagogique ownedResource(String email, Long id) {
        return ressources.findByIdAndChapitreModuleFormationFormateurEmail(id, email).orElseThrow(this::notFound);
    }

    private BusinessException notFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "CONTENT_NOT_FOUND", "Formation ou contenu introuvable.");
    }

    private BusinessException previewError() {
        return new BusinessException(HttpStatus.CONFLICT, "INVALID_PREVIEW_MODULE",
                "Seul le premier module peut être défini comme aperçu gratuit.");
    }

    private void assertExactIds(List<Long> requested, List<Long> existing) {
        if (requested.size() != existing.size() || new HashSet<>(requested).size() != requested.size() ||
                !new HashSet<>(requested).equals(new HashSet<>(existing))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ORDER",
                    "La liste d'ordre doit contenir chaque élément exactement une fois.");
        }
    }

    private Map<Long, FormationModule> indexModules(List<FormationModule> current) {
        Map<Long, FormationModule> result = new HashMap<>();
        current.forEach(module -> result.put(module.getId(), module));
        return result;
    }

    private void compactModules(Long formationId) {
        List<FormationModule> remaining = modules.findByFormationIdOrderByPosition(formationId);
        for (int i = 0; i < remaining.size(); i++) remaining.get(i).setPosition(REORDER_OFFSET + i);
        modules.flush();
        for (int i = 0; i < remaining.size(); i++) remaining.get(i).setPosition(i);
        modules.flush();
    }

    private void compactChapitres(Long moduleId) {
        List<Chapitre> remaining = chapitres.findByModuleIdOrderByPosition(moduleId);
        for (int i = 0; i < remaining.size(); i++) remaining.get(i).setPosition(REORDER_OFFSET + i);
        chapitres.flush();
        for (int i = 0; i < remaining.size(); i++) remaining.get(i).setPosition(i);
        chapitres.flush();
    }

    private void compactResources(Long chapitreId) {
        List<RessourcePedagogique> remaining = ressources.findByChapitreIdOrderByPosition(chapitreId);
        for (int i = 0; i < remaining.size(); i++) remaining.get(i).setPosition(REORDER_OFFSET + i);
        ressources.flush();
        for (int i = 0; i < remaining.size(); i++) remaining.get(i).setPosition(i);
        ressources.flush();
    }

    private String validYoutubeUrl(String raw) {
        try {
            URI uri = new URI(raw.trim());
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            boolean allowedHost = host.equals("youtube.com") || host.equals("www.youtube.com") ||
                    host.equals("m.youtube.com") || host.equals("youtu.be");
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !allowedHost || uri.getUserInfo() != null ||
                    (uri.getPort() != -1 && uri.getPort() != 443) || uri.getPath().isBlank()) throw invalidYoutube();
            return uri.normalize().toASCIIString();
        } catch (URISyntaxException | NullPointerException ex) {
            throw invalidYoutube();
        }
    }

    private BusinessException invalidYoutube() {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_YOUTUBE_URL",
                "Le lien doit être une URL HTTPS valide de YouTube.");
    }

    private String title(String value) {
        if (value == null || value.isBlank() || value.trim().length() > 180) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_TITLE",
                    "Le titre est obligatoire et limité à 180 caractères.");
        }
        return value.trim();
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void put(MultipartFile file, String key, ValidatedFile valid) {
        try {
            storage.put(key, file.getInputStream(), valid.size(), valid.contentType());
        } catch (IOException ex) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Le fichier ne peut pas être lu.");
        }
    }

    private void deleteAfterCommit(String key) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safeDelete(key);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { safeDelete(key); }
        });
    }

    private void safeDelete(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException ex) {
            log.error("Impossible de supprimer l'objet MinIO {}", key, ex);
        }
    }
}
