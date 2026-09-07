package ma.elearning.orientation.ollama;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component @ConfigurationProperties(prefix="app.ai")
public class OllamaProperties {
    private boolean enabled; private String baseUrl="http://localhost:11434"; private String model="qwen3:4b";
    private int timeoutSeconds=60,maxHistoryMessages=12,hourlyLimit=20,dailyLimit=100,maxResponseCharacters=12000;
    public boolean isEnabled(){return enabled;} public void setEnabled(boolean v){enabled=v;} public String getBaseUrl(){return baseUrl;} public void setBaseUrl(String v){baseUrl=v;}
    public String getModel(){return model;} public void setModel(String v){model=v;} public int getTimeoutSeconds(){return timeoutSeconds;} public void setTimeoutSeconds(int v){timeoutSeconds=v;}
    public int getMaxHistoryMessages(){return maxHistoryMessages;} public void setMaxHistoryMessages(int v){maxHistoryMessages=v;}
    public int getHourlyLimit(){return hourlyLimit;} public void setHourlyLimit(int v){hourlyLimit=v;} public int getDailyLimit(){return dailyLimit;} public void setDailyLimit(int v){dailyLimit=v;}
    public int getMaxResponseCharacters(){return maxResponseCharacters;} public void setMaxResponseCharacters(int v){maxResponseCharacters=v;}
}
