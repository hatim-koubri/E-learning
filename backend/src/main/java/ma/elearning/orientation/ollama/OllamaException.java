package ma.elearning.orientation.ollama;
public class OllamaException extends RuntimeException{
    private final String code;
    public OllamaException(String code,String message,Throwable cause){super(message,cause);this.code=code;}
    public OllamaException(String code,String message){this(code,message,null);} public String getCode(){return code;}
}
