package ma.elearning.storage;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.http.Method;
import ma.elearning.common.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.InputStream;

@Service
public class MinioObjectStorage implements ObjectStorage {
    private final MinioClient client;
    private final String bucket;
    private final int urlExpirySeconds;

    public MinioObjectStorage(MinioClient client, @Value("${app.storage.bucket}") String bucket,
                              @Value("${app.storage.url-expiry-seconds:300}") int urlExpirySeconds) {
        this.client = client;
        this.bucket = bucket;
        this.urlExpirySeconds = urlExpirySeconds;
    }

    @Override
    public void put(String key, InputStream stream, long size, String contentType) {
        try {
            client.putObject(PutObjectArgs.builder().bucket(bucket).object(key)
                    .stream(stream, size, -1).contentType(contentType).build());
        } catch (Exception ex) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE",
                    "Le stockage de fichiers est temporairement indisponible.");
        }
    }

    @Override
    public void delete(String key) {
        try {
            client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());
        } catch (Exception ex) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE",
                    "La suppression du fichier a échoué.");
        }
    }

    @Override
    public String temporaryUrl(String key) {
        try {
            return client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET).bucket(bucket).object(key).expiry(urlExpirySeconds).build());
        } catch (Exception ex) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE",
                    "Le contenu est temporairement indisponible.");
        }
    }
}
