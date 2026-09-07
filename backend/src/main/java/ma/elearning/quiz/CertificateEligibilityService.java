package ma.elearning.quiz;

import ma.elearning.formation.Chapitre;
import ma.elearning.formation.FormationModule;
import ma.elearning.learning.Inscription;
import ma.elearning.learning.InscriptionStatut;
import ma.elearning.learning.ProgressionChapitre;
import ma.elearning.learning.ProgressionChapitreRepository;
import ma.elearning.user.AccountStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CertificateEligibilityService {
    private final QuizRepository quizzes;
    private final TentativeQuizRepository attempts;
    private final ProgressionChapitreRepository progressions;

    public CertificateEligibilityService(QuizRepository quizzes, TentativeQuizRepository attempts,
                                         ProgressionChapitreRepository progressions) {
        this.quizzes = quizzes;
        this.attempts = attempts;
        this.progressions = progressions;
    }

    @Transactional(readOnly = true)
    public boolean isEligible(Inscription inscription) {
        if (!List.of(InscriptionStatut.ACTIVE, InscriptionStatut.CONFIRMEE).contains(inscription.getStatut())
                || inscription.getParticipant().getStatut() != AccountStatus.ACTIF) return false;
        List<Quiz> published = quizzes.findByFormationIdAndPublieTrueOrderByOrdre(inscription.getFormation().getId());
        Set<Long> completed = progressions.findByInscriptionId(inscription.getId()).stream()
                .filter(ProgressionChapitre::isTermine).map(value -> value.getChapitre().getId())
                .collect(Collectors.toSet());
        List<Chapitre> chapters = inscription.getFormation().getModules().stream()
                .flatMap(module -> module.getChapitres().stream()).toList();
        if (chapters.isEmpty() || !chapters.stream().allMatch(chapter -> completed.contains(chapter.getId()))) return false;
        for (FormationModule module : inscription.getFormation().getModules()) {
            if (module.getChapitres().isEmpty()) continue;
            Long lastChapterId = module.getChapitres().getLast().getId();
            Quiz required = published.stream().filter(quiz -> quiz.getChapitre() != null
                    && quiz.getChapitre().getId().equals(lastChapterId)).findFirst().orElse(null);
            if (required != null && !attempts.existsByInscriptionIdAndQuizIdAndReussiTrue(inscription.getId(), required.getId())) return false;
        }
        Quiz finalQuiz = published.stream().filter(quiz -> quiz.getChapitre() == null
                && quiz.getTitre().toLowerCase(Locale.ROOT).contains("quiz final"))
                .reduce((first, second) -> second).orElse(null);
        return finalQuiz != null && attempts.existsByInscriptionIdAndQuizIdAndReussiTrue(inscription.getId(), finalQuiz.getId());
    }
}
