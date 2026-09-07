package ma.elearning.auth;

public final class AccountCredentialPolicy {
    public static final int PASSWORD_MIN_LENGTH = 8;
    public static final int PASSWORD_MAX_LENGTH = 72;
    public static final String REQUIRED_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$";
    public static final String REQUIREMENTS_MESSAGE =
            "doit contenir une minuscule, une majuscule, un chiffre et un caractère spécial";

    private AccountCredentialPolicy() {}
}
