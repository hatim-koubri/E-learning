package ma.elearning.storage;

import java.io.InputStream;

public interface ObjectStorage {
    void put(String key, InputStream stream, long size, String contentType);
    void delete(String key);
    String temporaryUrl(String key);
}
