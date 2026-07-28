package ma.elearning.storage;

import ma.elearning.common.BusinessException;
import ma.elearning.formation.ResourceType;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class UploadValidatorTest {
    private final UploadValidator validator = new UploadValidator(100, 100, 100);

    @Test
    void acceptsMatchingPdfExtensionMimeAndSignature() {
        var file = new MockMultipartFile("file", "cours.pdf", "application/pdf",
                "%PDF-1.7".getBytes(StandardCharsets.US_ASCII));
        assertEquals("pdf", validator.validate(file, ResourceType.PDF).extension());
    }

    @Test
    void rejectsSpoofedAndOversizedFiles() {
        var spoofed = new MockMultipartFile("file", "cours.pdf", "application/pdf",
                "not-a-pdf".getBytes(StandardCharsets.US_ASCII));
        assertEquals("INVALID_FILE", assertThrows(BusinessException.class,
                () -> validator.validate(spoofed, ResourceType.PDF)).getCode());
        var oversized = new MockMultipartFile("file", "cours.pdf", "application/pdf", new byte[101]);
        BusinessException error = assertThrows(BusinessException.class,
                () -> validator.validate(oversized, ResourceType.PDF));
        assertEquals("FILE_TOO_LARGE", error.getCode());
    }

    @Test
    void stripsPathSegmentsFromOriginalName() {
        var file = new MockMultipartFile("file", "..\\..\\support.pdf", "application/pdf",
                "%PDF".getBytes(StandardCharsets.US_ASCII));
        assertEquals("support.pdf", validator.validate(file, ResourceType.PDF).originalName());
    }
}
