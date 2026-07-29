package ma.elearning.api;

import ma.elearning.formation.*;

import static ma.elearning.api.FormationDtos.*;

public final class FormationMapper {
    private FormationMapper() {}

    public static FormationSummary toSummary(Formation formation) {
        return new FormationSummary(formation.getId(), formation.getTitre(), formation.getDescription(),
                formation.getImageCouvertureKey(), formation.getLangue(), formation.getNiveau(),
                formation.getCategorie(), formation.getPrix(), formation.getSupplementClasses(), formation.isClassesGratuites(), formation.getStatut(),
                formation.getModules().size(), formation.getCreatedAt(), formation.getUpdatedAt());
    }

    public static FormationDetail toDetail(Formation formation) {
        return new FormationDetail(formation.getId(), formation.getTitre(), formation.getDescription(),
                formation.getImageCouvertureKey(), formation.getLangue(), formation.getNiveau(),
                formation.getCategorie(), formation.getPrix(), formation.getSupplementClasses(), formation.isClassesGratuites(), formation.getStatut(),
                formation.getCreatedAt(), formation.getUpdatedAt(),
                formation.getModules().stream().map(FormationMapper::toModule).toList());
    }

    public static ModuleResponse toModule(FormationModule module) {
        return new ModuleResponse(module.getId(), module.getTitre(), module.getDescription(),
                module.getPosition(), module.isApercuGratuit(),
                module.getChapitres().stream().map(FormationMapper::toChapitre).toList());
    }

    public static ChapitreResponse toChapitre(Chapitre chapitre) {
        return new ChapitreResponse(chapitre.getId(), chapitre.getTitre(), chapitre.getDescription(),
                chapitre.getPosition(),
                chapitre.getRessources().stream().map(FormationMapper::toRessource).toList());
    }

    public static RessourceResponse toRessource(RessourcePedagogique resource) {
        return new RessourceResponse(resource.getId(), resource.getType(), resource.getTitre(),
                resource.getPosition(), resource.getNomOriginal(), resource.getTypeMime(),
                resource.getTaille(), resource.getCleStockage(), resource.getUrlYoutube(),
                resource.isTelechargeable(), resource.getStatut(), resource.getCreatedAt());
    }
}
