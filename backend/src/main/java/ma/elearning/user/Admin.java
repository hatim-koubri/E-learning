package ma.elearning.user;
import jakarta.persistence.*;
@Entity @DiscriminatorValue("ADMIN")
public class Admin extends User {}

