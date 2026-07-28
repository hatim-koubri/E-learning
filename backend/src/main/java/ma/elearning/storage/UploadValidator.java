package ma.elearning.storage;

import ma.elearning.common.BusinessException;
import ma.elearning.formation.ResourceType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class UploadValidator {
    public record ValidatedFile(String originalName, String extension, String contentType, long size) {}

    private static final Map<ResourceType, Map<String, Set<String>>> ALLOWED = Map.of(
            ResourceType.IMAGE, Map.of(
                    "jpg", Set.of("image/jpeg"), "jpeg", Set.of("image/jpeg"),
                    "png", Set.of("image/png"), "webp", Set.of("image/webp")),
            ResourceType.PDF, Map.of("pdf", Set.of("application/pdf")),
            ResourceType.VIDEO, Map.of(
                    "mp4", Set.of("video/mp4"), "webm", Set.of("video/webm"))
    );

    private final long imageMax;
    private final long pdfMax;
    private final long videoMax;

    public UploadValidator(@Value("${app.upload.image-max-bytes}") long imageMax,
                           @Value("${app.upload.pdf-max-bytes}") long pdfMax,
                           @Value("${app.upload.video-max-bytes}") long videoMax) {
        this.imageMax = imageMax;
        this.pdfMax = pdfMax;
        this.videoMax = videoMax;
    }

    public ValidatedFile validate(MultipartFile file, ResourceType type) {
        if (type == ResourceType.YOUTUBE || file == null || file.isEmpty()) {
            throw invalid("Un fichier non vide est requis.");
        }
        String original = safeName(file.getOriginalFilename());
        String extension = extension(original);
        String contentType = file.getContentType() == null ? "" :
                file.getContentType().toLowerCase(Locale.ROOT).split(";")[0].trim();
        Map<String, Set<String>> allowedForType = ALLOWED.get(type);
        if (allowedForType == null || !allowedForType.getOrDefault(extension, Set.of()).contains(contentType)) {
            throw invalid("L'extension ou le type MIME du fichier n'est pas autorisé.");
        }
        if (file.getSize() > maximum(type)) {
            throw new BusinessException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                    "Le fichier dépasse la taille maximale autorisée.");
        }
        if (!signatureMatches(file, extension)) {
            throw invalid("Le contenu du fichier ne correspond pas à son format déclaré.");
        }
        return new ValidatedFile(original, extension, contentType, file.getSize());
    }

    private String safeName(String supplied) {
        if (supplied == null || supplied.isBlank()) throw invalid("Le nom du fichier est invalide.");
        String normalized = supplied.replace('\\', '/');
        String base = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
        if (base.isBlank() || base.equals(".") || base.equals("..") || base.length() > 255 ||
                base.chars().anyMatch(c -> Character.isISOControl(c))) {
            throw invalid("Le nom du fichier est invalide.");
        }
        return base;
    }

    private String extension(String name) {
        int index = name.lastIndexOf('.');
        if (index <= 0 || index == name.length() - 1) throw invalid("Le fichier doit avoir une extension autorisée.");
        return name.substring(index + 1).toLowerCase(Locale.ROOT);
    }

    private boolean signatureMatches(MultipartFile file, String extension) {
        byte[] header = new byte[16];
        int read;
        try (InputStream input = file.getInputStream()) {
            read = input.read(header);
        } catch (IOException ex) {
            throw invalid("Le fichier ne peut pas être lu.");
        }
        if (read < 4) return false;
        return switch (extension) {
            case "pdf" -> starts(header, "%PDF".getBytes(StandardCharsets.US_ASCII));
            case "jpg", "jpeg" -> unsigned(header[0]) == 0xff && unsigned(header[1]) == 0xd8 && unsigned(header[2]) == 0xff;
            case "png" -> starts(header, new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
            case "webp" -> ascii(header, 0, "RIFF") && ascii(header, 8, "WEBP");
            case "mp4" -> ascii(header, 4, "ftyp");
            case "webm" -> unsigned(header[0]) == 0x1a && unsigned(header[1]) == 0x45 &&
                    unsigned(header[2]) == 0xdf && unsigned(header[3]) == 0xa3;
            default -> false;
        };
    }

    private long maximum(ResourceType type) {
        return switch (type) {
            case IMAGE -> imageMax;
            case PDF -> pdfMax;
            case VIDEO -> videoMax;
            case YOUTUBE -> 0;
        };
    }

    private boolean starts(byte[] value, byte[] expected) {
        if (value.length < expected.length) return false;
        for (int i = 0; i < expected.length; i++) if (value[i] != expected[i]) return false;
        return true;
    }

    private boolean ascii(byte[] value, int offset, String expected) {
        byte[] bytes = expected.getBytes(StandardCharsets.US_ASCII);
        if (value.length < offset + bytes.length) return false;
        for (int i = 0; i < bytes.length; i++) if (value[offset + i] != bytes[i]) return false;
        return true;
    }

    private int unsigned(byte value) { return value & 0xff; }
    private BusinessException invalid(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_FILE", message);
    }
}
