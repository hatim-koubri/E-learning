package ma.elearning.orientation.ollama;
import java.util.List;
public record OllamaChatRequest(String model,boolean stream,boolean think,Object format,List<OllamaMessage> messages,Options options){
    public record Options(double temperature,int num_predict){}
}
