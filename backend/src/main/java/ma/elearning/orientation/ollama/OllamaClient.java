package ma.elearning.orientation.ollama;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class OllamaClient {
    private final OllamaProperties properties;
    public OllamaClient(OllamaProperties properties){this.properties=properties;}
    public String chat(List<OllamaMessage> messages){
        if(!properties.isEnabled()) throw new OllamaException("AI_DISABLED","Le conseiller IA est désactivé.");
        var factory=new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(Math.min(10,properties.getTimeoutSeconds())));
        factory.setReadTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()));
        var client=RestClient.builder().baseUrl(properties.getBaseUrl()).requestFactory(factory).build();
        try{
            var response=client.post().uri("/api/chat").body(new OllamaChatRequest(properties.getModel(),false,false,analysisSchema(),messages,
                    new OllamaChatRequest.Options(0.2,768))).retrieve().body(OllamaChatResponse.class);
            String content=response==null||response.message()==null?null:response.message().content();
            if(content==null||content.isBlank()||content.length()>properties.getMaxResponseCharacters())
                throw new OllamaException("AI_INVALID_RESPONSE","La réponse du modèle est vide ou trop volumineuse.");
            return content.trim();
        }catch(OllamaException e){throw e;}catch(ResourceAccessException e){
            Throwable cause=e.getMostSpecificCause();
            if(cause instanceof SocketTimeoutException) throw new OllamaException("AI_TIMEOUT","Le modèle local a dépassé le délai autorisé.",e);
            if(cause instanceof ConnectException) throw new OllamaException("AI_SERVICE_UNAVAILABLE","Ollama est inaccessible.",e);
            throw new OllamaException("AI_SERVICE_UNAVAILABLE","Le service IA local est inaccessible.",e);
        }catch(RestClientException e){throw new OllamaException("AI_SERVICE_UNAVAILABLE","Ollama a refusé la requête.",e);}
    }
    public OllamaProperties properties(){return properties;}
    private Map<String,Object> analysisSchema(){
        Map<String,Object> nullableString=Map.of("type",List.of("string","null"));
        Map<String,Object> preferences=Map.of(
                "type","object","additionalProperties",false,
                "properties",Map.of("objectif",nullableString,"niveau",nullableString,
                        "competences",Map.of("type","array","items",Map.of("type","string"),"maxItems",10),
                        "langue",nullableString,"budget",Map.of("type",List.of("number","null")),
                        "minutesHebdomadaires",Map.of("type",List.of("integer","null")),
                        "formatPedagogique",nullableString,"besoinClasses",Map.of("type",List.of("boolean","null"))),
                "required",List.of("objectif","niveau","competences","langue","budget","minutesHebdomadaires","formatPedagogique","besoinClasses"));
        return Map.of("type","object","additionalProperties",false,
                "properties",Map.of("answer",Map.of("type","string"),"preferences",preferences,
                        "search",Map.of("type","boolean"),"missingQuestion",nullableString),
                "required",List.of("answer","preferences","search","missingQuestion"));
    }
}
