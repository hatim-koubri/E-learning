package ma.elearning.orientation;

import jakarta.persistence.*;
import ma.elearning.formation.Formation;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity @Table(name="orientation_recommendations")
public class OrientationRecommendation {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="conversation_id") private OrientationConversation conversation;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="formation_id") private Formation formation;
    @Column(nullable=false) private int score; @Column(nullable=false) private int rang;
    @Lob @Column(name="raisons_json",nullable=false,columnDefinition="text") private String raisonsJson;
    @CreationTimestamp @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    public Long getId(){return id;} public OrientationConversation getConversation(){return conversation;} public void setConversation(OrientationConversation v){conversation=v;}
    public Formation getFormation(){return formation;} public void setFormation(Formation v){formation=v;} public int getScore(){return score;} public void setScore(int v){score=v;}
    public int getRang(){return rang;} public void setRang(int v){rang=v;} public String getRaisonsJson(){return raisonsJson;} public void setRaisonsJson(String v){raisonsJson=v;}
    public Instant getCreatedAt(){return createdAt;}
}
