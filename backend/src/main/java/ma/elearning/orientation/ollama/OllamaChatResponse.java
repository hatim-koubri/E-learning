package ma.elearning.orientation.ollama;
public record OllamaChatResponse(OllamaMessage message,Boolean done,Long total_duration){}
