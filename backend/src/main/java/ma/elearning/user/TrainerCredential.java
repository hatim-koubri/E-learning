package ma.elearning.user;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity @Table(name="formateur_justificatifs")
public class TrainerCredential {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="formateur_id",nullable=false) private Formateur formateur;
    @Enumerated(EnumType.STRING) @Column(name="type_document",nullable=false,length=20) private TrainerDocumentType type;
    @Column(name="object_key",nullable=false,unique=true,length=500) private String objectKey;
    @Column(name="original_name",nullable=false,length=255) private String originalName;
    @Column(name="content_type",nullable=false,length=100) private String contentType;
    @Column(name="file_size",nullable=false) private long size;
    @CreationTimestamp @Column(name="uploaded_at",nullable=false,updatable=false) private Instant uploadedAt;
    public Long getId(){return id;} public Formateur getFormateur(){return formateur;} public void setFormateur(Formateur value){formateur=value;}
    public TrainerDocumentType getType(){return type;} public void setType(TrainerDocumentType value){type=value;}
    public String getObjectKey(){return objectKey;} public void setObjectKey(String value){objectKey=value;}
    public String getOriginalName(){return originalName;} public void setOriginalName(String value){originalName=value;}
    public String getContentType(){return contentType;} public void setContentType(String value){contentType=value;}
    public long getSize(){return size;} public void setSize(long value){size=value;} public Instant getUploadedAt(){return uploadedAt;}
}
