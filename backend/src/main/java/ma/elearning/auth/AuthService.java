package ma.elearning.auth;

import ma.elearning.api.AuthDtos.*;
import ma.elearning.common.BusinessException;
import ma.elearning.security.JwtService;
import ma.elearning.storage.ObjectStorage;
import ma.elearning.storage.UploadValidator;
import ma.elearning.user.*;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import static ma.elearning.api.UserMapper.toResponse;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final JavaMailSender mail;
    private final TrainerCredentialRepository credentials;
    private final ObjectStorage storage;
    private final UploadValidator uploads;
    private final Duration resetDuration;
    private final String mailFrom;
    public AuthService(UserRepository users, PasswordResetTokenRepository tokens, PasswordEncoder encoder,
                       JwtService jwt, JavaMailSender mail, TrainerCredentialRepository credentials,
                       ObjectStorage storage, UploadValidator uploads,
                       @Value("${app.password-reset.expiration-minutes}") long resetMinutes,
                       @Value("${app.mail.from}") String mailFrom) {
        this.users=users; this.tokens=tokens; this.encoder=encoder; this.jwt=jwt; this.mail=mail;
        this.credentials=credentials; this.storage=storage; this.uploads=uploads;
        this.resetDuration=Duration.ofMinutes(resetMinutes); this.mailFrom=mailFrom;
    }
    @Transactional public UserResponse registerParticipant(RegisterRequest r) {
        Participant p = new Participant();
        prepare(p,r,Role.PARTICIPANT,AccountStatus.ACTIF);
        return toResponse(users.save(p));
    }
    @Transactional public UserResponse registerFormateur(TrainerRegisterRequest r,
            MultipartFile cv,List<MultipartFile> additionalDocuments) {
        List<DocumentUpload> documents=new ArrayList<>();
        addDocuments(documents,cv==null?null:List.of(cv),TrainerDocumentType.CV);
        addDocuments(documents,additionalDocuments,TrainerDocumentType.AUTRE);
        if(documents.stream().noneMatch(document->document.type()==TrainerDocumentType.CV)) throw new BusinessException(HttpStatus.BAD_REQUEST,"TRAINER_CV_REQUIRED",
                "Ajoutez votre CV.");
        if(documents.size()>5) throw new BusinessException(HttpStatus.BAD_REQUEST,"TOO_MANY_TRAINER_DOCUMENTS",
                "Vous pouvez envoyer un CV et au maximum 4 documents complémentaires.");
        Formateur f = new Formateur();
        prepare(f,new RegisterRequest(r.nom(),r.email(),r.telephone(),r.password()),Role.FORMATEUR,AccountStatus.EN_ATTENTE);
        f.setSpecialite(r.specialite().strip()); f.setBiographie(r.biographie().strip());
        users.saveAndFlush(f);
        for(DocumentUpload upload:documents) storeCredential(f,upload);
        log.info("Nouvelle demande formateur pour {}", normalize(r.email()));
        return toResponse(f);
    }
    /** Internal compatibility helper for legacy service tests; the HTTP endpoint always requires documents. */
    @Deprecated(forRemoval=false)
    @Transactional public UserResponse registerFormateur(RegisterRequest r) {
        Formateur f=new Formateur();prepare(f,r,Role.FORMATEUR,AccountStatus.EN_ATTENTE);
        return toResponse(users.save(f));
    }
    private void addDocuments(List<DocumentUpload> target,List<MultipartFile> files,TrainerDocumentType type){
        if(files!=null) files.stream().filter(file->file!=null&&!file.isEmpty()).forEach(file->target.add(new DocumentUpload(file,type)));
    }
    private void storeCredential(Formateur trainer,DocumentUpload document){
        var valid=uploads.validateCredential(document.file());
        String key="trainer-applications/"+trainer.getId()+"/"+UUID.randomUUID()+"."+valid.extension();
        try(var input=document.file().getInputStream()){storage.put(key,input,valid.size(),valid.contentType());}
        catch(java.io.IOException exception){throw new BusinessException(HttpStatus.BAD_REQUEST,"INVALID_FILE","Le justificatif ne peut pas être lu.");}
        TrainerCredential credential=new TrainerCredential();credential.setFormateur(trainer);credential.setType(document.type());
        credential.setObjectKey(key);credential.setOriginalName(valid.originalName());credential.setContentType(valid.contentType());credential.setSize(valid.size());
        credentials.save(credential);
    }
    private record DocumentUpload(MultipartFile file,TrainerDocumentType type){}
    private void prepare(User user, RegisterRequest r, Role role, AccountStatus status) {
        String email = normalize(r.email());
        if (users.existsByEmail(email)) throw new BusinessException(HttpStatus.CONFLICT,"EMAIL_ALREADY_USED","Cet email est déjà utilisé.");
        user.setNom(r.nom().trim()); user.setEmail(email);
        user.setTelephone(r.telephone()==null ? null : r.telephone().trim());
        user.setPasswordHash(encoder.encode(r.password())); user.setRole(role); user.setStatut(status);
    }
    public AuthResponse login(LoginRequest r) {
        User user = users.findByEmail(normalize(r.email()))
                .orElseThrow(() -> invalidCredentials());
        if (!encoder.matches(r.password(),user.getPasswordHash())) throw invalidCredentials();
        if (user.getStatut()==AccountStatus.SUPPRIME) throw invalidCredentials();
        if (user.getStatut()==AccountStatus.SUSPENDU)
            throw new BusinessException(HttpStatus.FORBIDDEN,"ACCOUNT_SUSPENDED","Ce compte est suspendu.");
        if (user.getStatut()==AccountStatus.EN_ATTENTE)
            throw new BusinessException(HttpStatus.FORBIDDEN,"ACCOUNT_PENDING","Le compte formateur attend la validation.");
        if (user.getStatut()==AccountStatus.REFUSE)
            throw new BusinessException(HttpStatus.FORBIDDEN,"ACCOUNT_REFUSED","La demande de compte a été refusée.");
        String token=jwt.generate(user);
        return new AuthResponse(token,"Bearer",jwt.expiresInSeconds(),toResponse(user));
    }
    public UserResponse me(String email) {
        return users.findByEmail(email).map(ma.elearning.api.UserMapper::toResponse)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND,"USER_NOT_FOUND","Utilisateur introuvable."));
    }
    @Transactional public void forgotPassword(ForgotPasswordRequest r) {
        users.findByEmail(normalize(r.email())).ifPresent(user -> {
            String raw=UUID.randomUUID()+"."+UUID.randomUUID();
            PasswordResetToken token=new PasswordResetToken();
            token.setTokenHash(hash(raw)); token.setUser(user); token.setExpiresAt(Instant.now().plus(resetDuration));
            tokens.save(token);
            SimpleMailMessage message=new SimpleMailMessage();
            message.setFrom(mailFrom); message.setTo(user.getEmail()); message.setSubject("Réinitialisation du mot de passe");
            message.setText("Ouvrez http://localhost:3000/reset-password?token="+raw+" (valable "+resetDuration.toMinutes()+" minutes).");
            try { mail.send(message); } catch (RuntimeException ex) { log.warn("Email de réinitialisation non envoyé", ex); }
        });
    }
    @Transactional public void resetPassword(ResetPasswordRequest r) {
        PasswordResetToken token=tokens.findByTokenHash(hash(r.token()))
                .orElseThrow(() -> invalidReset());
        if (token.getUsedAt()!=null || !token.getExpiresAt().isAfter(Instant.now())) throw invalidReset();
        token.getUser().setPasswordHash(encoder.encode(r.password()));
        token.setUsedAt(Instant.now());
    }
    private BusinessException invalidCredentials() {
        return new BusinessException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","Email ou mot de passe incorrect.");
    }
    private BusinessException invalidReset() {
        return new BusinessException(HttpStatus.BAD_REQUEST,"INVALID_RESET_TOKEN","Le lien est invalide, expiré ou déjà utilisé.");
    }
    private String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
