package ma.elearning.user;
import jakarta.persistence.*;
@Entity @DiscriminatorValue("PARTICIPANT")
public class Participant extends User {}

