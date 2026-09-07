package ma.elearning.orientation.ollama;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class OllamaClientTest {
    @Test void disabledAiFailsCleanlyWithoutNetworkCall(){OllamaProperties p=new OllamaProperties();p.setEnabled(false);OllamaException error=assertThrows(OllamaException.class,()->new OllamaClient(p).chat(List.of(new OllamaMessage("user","test"))));assertEquals("AI_DISABLED",error.getCode());}
}
