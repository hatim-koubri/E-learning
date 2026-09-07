package ma.elearning.quiz;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.CharsetEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import ma.elearning.common.BusinessException;
import ma.elearning.learning.Inscription;
import ma.elearning.learning.InscriptionRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CertificateService {
    private static final Color NAVY = new Color(15, 27, 53);
    private static final Color PURPLE = new Color(101, 63, 230);
    private static final Color GREEN = new Color(11, 170, 132);
    private static final Color IVORY = new Color(251, 249, 244);
    private static final Color MUTED = new Color(84, 96, 118);
    private static final Color PALE_PURPLE = new Color(239, 234, 255);
    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.FRENCH);

    private final CertificateEligibilityService eligibilityService;
    private final InscriptionRepository inscriptionRepository;

    public CertificateService(CertificateEligibilityService eligibilityService,
                              InscriptionRepository inscriptionRepository) {
        this.eligibilityService = eligibilityService;
        this.inscriptionRepository = inscriptionRepository;
    }

    @Transactional(readOnly = true)
    public byte[] generate(String email, Long formationId) {
        Inscription inscription = inscriptionRepository.findByParticipantEmailAndFormationId(email, formationId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND,
                        "INSCRIPTION_NOT_FOUND", "Inscription introuvable."));
        if (!eligibilityService.isEligible(inscription)) {
            throw new BusinessException(HttpStatus.CONFLICT, "CERTIFICATE_NOT_AVAILABLE",
                    "Terminez les modules et réussissez les évaluations obligatoires avant de télécharger le certificat.");
        }

        String participant = safe(inscription.getParticipant().getNom());
        String formation = safe(inscription.getFormation().getTitre());
        LocalDate issuedAt = LocalDate.now();
        String verificationCode = verificationCode(inscription.getId(), email, formation);

        try {
            return render(participant, formation, issuedAt, verificationCode);
        } catch (IOException exception) {
            throw new IllegalStateException("Impossible de générer le certificat", exception);
        }
    }

    private byte[] render(String participant, String formation, LocalDate issuedAt,
                          String verificationCode) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDRectangle landscape = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            PDPage page = new PDPage(landscape);
            document.addPage(page);
            float width = landscape.getWidth();
            float height = landscape.getHeight();

            PDDocumentInformation metadata = new PDDocumentInformation();
            metadata.setAuthor("Khotwa");
            metadata.setCreator("Plateforme Khotwa");
            metadata.setTitle("Certificat de réussite - " + participant);
            metadata.setSubject("Validation de la formation " + formation);
            document.setDocumentInformation(metadata);

            PDFont sans = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDFont sansBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDFont serif = new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
            PDFont serifBold = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);

            try (PDPageContentStream canvas = new PDPageContentStream(document, page)) {
                fill(canvas, IVORY, 0, 0, width, height);
                decorativeFrame(canvas, width, height);
                drawBrand(document, canvas, sansBold, width, height);

                centered(canvas, sansBold, 10, PURPLE, width, height - 104,
                        "CERTIFICAT OFFICIEL DE FORMATION", 1.8f);
                centered(canvas, serifBold, 35, NAVY, width, height - 148,
                        "CERTIFICAT DE RÉUSSITE", 0.2f);
                centered(canvas, sans, 11, MUTED, width, height - 172,
                        "Ce document atteste l'accomplissement d'un parcours certifiant Khotwa", 0);

                centered(canvas, sans, 11, MUTED, width, height - 215,
                        "Ce certificat est décerné à", 0);
                float participantSize = fittedSize(serifBold, participant, 31, 19, width - 210);
                centered(canvas, serifBold, participantSize, NAVY, width, height - 253, participant, 0);
                accentRule(canvas, width / 2, height - 268);

                centered(canvas, sans, 10, MUTED, width, height - 294,
                        "pour avoir terminé avec succès la formation", 0);
                float formationSize = wrappedSize(serifBold, formation, 23, 15, width - 210, 2);
                List<String> titleLines = wrap(serifBold, formation, formationSize, width - 210);
                float titleY = height - 330;
                for (int i = 0; i < titleLines.size(); i++) {
                    centered(canvas, serifBold, formationSize, NAVY, width, titleY - i * 27,
                            titleLines.get(i), 0);
                }
                float completionY = titleY - titleLines.size() * 27 - 5;
                centered(canvas, sans, 10, MUTED, width, completionY,
                        "Tous les modules et toutes les évaluations obligatoires ont été validés.", 0);

                drawSeal(canvas, sansBold, 82, 76);
                infoBlock(canvas, sans, sansBold, 174, 91, "DATE DE DÉLIVRANCE",
                        issuedAt.format(DATE_FORMAT));
                signatureBlock(canvas, sans, sansBold, width / 2 - 72, 91);
                verificationBlock(canvas, sans, sansBold, width - 276, 63, verificationCode);
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private void decorativeFrame(PDPageContentStream canvas, float width, float height) throws IOException {
        stroke(canvas, NAVY, 2.2f, 24, 24, width - 48, height - 48);
        stroke(canvas, PURPLE, 0.8f, 31, 31, width - 62, height - 62);
        canvas.setNonStrokingColor(PURPLE);
        canvas.moveTo(24, height - 110);
        canvas.lineTo(24, height - 24);
        canvas.lineTo(110, height - 24);
        canvas.lineTo(78, height - 56);
        canvas.lineTo(56, height - 56);
        canvas.lineTo(56, height - 78);
        canvas.closePath();
        canvas.fill();
        canvas.setNonStrokingColor(GREEN);
        canvas.moveTo(width - 24, 82);
        canvas.lineTo(width - 24, 24);
        canvas.lineTo(width - 82, 24);
        canvas.lineTo(width - 58, 48);
        canvas.lineTo(width - 48, 48);
        canvas.lineTo(width - 48, 58);
        canvas.closePath();
        canvas.fill();
    }

    private void drawBrand(PDDocument document, PDPageContentStream canvas, PDFont font,
                           float width, float height) throws IOException {
        try (InputStream stream = CertificateService.class.getResourceAsStream("/brand/khotwa-mark.png")) {
            if (stream != null) {
                PDImageXObject mark = PDImageXObject.createFromByteArray(document, stream.readAllBytes(), "khotwa-mark");
                canvas.drawImage(mark, 62, height - 84, 35, 35);
            }
        }
        text(canvas, font, 18, NAVY, 105, height - 63, "Khotwa", 0);
        text(canvas, font, 6.7f, MUTED, 106, height - 77, "APPRENDRE. ÉVOLUER.", 1.2f);
        rightText(canvas, font, 7.5f, PURPLE, width - 62, height - 62,
                "ATTESTATION NUMÉRIQUE VÉRIFIABLE", 0.7f);
    }

    private void accentRule(PDPageContentStream canvas, float centerX, float y) throws IOException {
        fill(canvas, PURPLE, centerX - 70, y, 104, 2.5f);
        fill(canvas, GREEN, centerX + 34, y, 36, 2.5f);
    }

    private void drawSeal(PDPageContentStream canvas, PDFont font, float x, float y) throws IOException {
        canvas.setLineWidth(2);
        canvas.setStrokingColor(GREEN);
        canvas.addRect(x, y, 52, 52);
        canvas.stroke();
        canvas.setLineWidth(1);
        canvas.setStrokingColor(PURPLE);
        canvas.addRect(x + 5, y + 5, 42, 42);
        canvas.stroke();
        canvas.setStrokingColor(GREEN);
        canvas.setLineWidth(3);
        canvas.moveTo(x + 15, y + 27);
        canvas.lineTo(x + 23, y + 18);
        canvas.lineTo(x + 38, y + 35);
        canvas.stroke();
        centeredAt(canvas, font, 5.8f, NAVY, x + 26, y + 8, "VALIDÉ", 0.6f);
    }

    private void infoBlock(PDPageContentStream canvas, PDFont regular, PDFont bold,
                           float x, float y, String label, String value) throws IOException {
        text(canvas, bold, 6.7f, PURPLE, x, y + 26, label, 0.8f);
        text(canvas, regular, 10, NAVY, x, y + 9, value, 0);
    }

    private void signatureBlock(PDPageContentStream canvas, PDFont regular, PDFont bold,
                                float x, float y) throws IOException {
        fill(canvas, NAVY, x, y + 4, 144, 1);
        centeredAt(canvas, bold, 8, NAVY, x + 72, y - 10, "DIRECTION PÉDAGOGIQUE", 0.5f);
        centeredAt(canvas, regular, 7, MUTED, x + 72, y - 23, "Certification Khotwa", 0);
    }

    private void verificationBlock(PDPageContentStream canvas, PDFont regular, PDFont bold,
                                   float x, float y, String code) throws IOException {
        fill(canvas, PALE_PURPLE, x, y, 214, 64);
        stroke(canvas, new Color(207, 195, 249), 0.8f, x, y, 214, 64);
        text(canvas, bold, 6.8f, PURPLE, x + 14, y + 43, "IDENTIFIANT DE VÉRIFICATION", 0.8f);
        text(canvas, bold, 12, NAVY, x + 14, y + 24, code, 1.2f);
        text(canvas, regular, 6.7f, MUTED, x + 14, y + 9,
                "Document unique généré par la plateforme Khotwa", 0);
    }

    private void centered(PDPageContentStream canvas, PDFont font, float size, Color color,
                          float pageWidth, float y, String value, float spacing) throws IOException {
        centeredAt(canvas, font, size, color, pageWidth / 2, y, value, spacing);
    }

    private void centeredAt(PDPageContentStream canvas, PDFont font, float size, Color color,
                            float centerX, float y, String value, float spacing) throws IOException {
        float width = textWidth(font, value, size, spacing);
        text(canvas, font, size, color, centerX - width / 2, y, value, spacing);
    }

    private void rightText(PDPageContentStream canvas, PDFont font, float size, Color color,
                           float rightX, float y, String value, float spacing) throws IOException {
        text(canvas, font, size, color, rightX - textWidth(font, value, size, spacing), y, value, spacing);
    }

    private void text(PDPageContentStream canvas, PDFont font, float size, Color color,
                      float x, float y, String value, float spacing) throws IOException {
        canvas.beginText();
        canvas.setFont(font, size);
        canvas.setNonStrokingColor(color);
        canvas.setCharacterSpacing(spacing);
        canvas.newLineAtOffset(x, y);
        canvas.showText(value);
        canvas.endText();
    }

    private float fittedSize(PDFont font, String value, float preferred, float minimum,
                             float maxWidth) throws IOException {
        float size = preferred;
        while (size > minimum && textWidth(font, value, size, 0) > maxWidth) {
            size -= 0.5f;
        }
        return size;
    }

    private float wrappedSize(PDFont font, String value, float preferred, float minimum,
                              float maxWidth, int maxLines) throws IOException {
        float size = preferred;
        while (size > minimum && wrap(font, value, size, maxWidth).size() > maxLines) {
            size -= 0.5f;
        }
        return size;
    }

    private List<String> wrap(PDFont font, String value, float size, float maxWidth) throws IOException {
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String word : value.split("\\s+")) {
            String candidate = current.isEmpty() ? word : current + " " + word;
            if (!current.isEmpty() && textWidth(font, candidate, size, 0) > maxWidth) {
                lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                current = new StringBuilder(candidate);
            }
        }
        if (!current.isEmpty()) {
            lines.add(current.toString());
        }
        return lines;
    }

    private float textWidth(PDFont font, String value, float size, float spacing) throws IOException {
        float base = font.getStringWidth(value) / 1000 * size;
        return base + Math.max(0, value.length() - 1) * spacing;
    }

    private void fill(PDPageContentStream canvas, Color color, float x, float y,
                      float width, float height) throws IOException {
        canvas.setNonStrokingColor(color);
        canvas.addRect(x, y, width, height);
        canvas.fill();
    }

    private void stroke(PDPageContentStream canvas, Color color, float lineWidth, float x,
                        float y, float width, float height) throws IOException {
        canvas.setStrokingColor(color);
        canvas.setLineWidth(lineWidth);
        canvas.addRect(x, y, width, height);
        canvas.stroke();
    }

    private String verificationCode(Long inscriptionId, String email, String formation) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((inscriptionId + ":" + email + ":" + formation)
                    .getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().withUpperCase().formatHex(hash).substring(0, 12);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponible", exception);
        }
    }

    private String safe(String value) {
        String normalized = value == null ? "" : value
                .replace('—', '-')
                .replace('–', '-')
                .replace('’', '\'')
                .replaceAll("\\s+", " ")
                .trim();
        CharsetEncoder encoder = StandardCharsets.ISO_8859_1.newEncoder();
        StringBuilder safe = new StringBuilder();
        normalized.codePoints().forEach(codePoint -> {
            String character = new String(Character.toChars(codePoint));
            safe.append(encoder.canEncode(character) ? character : "?");
        });
        return safe.toString();
    }
}
