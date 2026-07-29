package ma.elearning.learning;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name="operations_acces")
public class OperationAcces {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="inscription_id") private Inscription inscription;
 @Column(name="cle_idempotence",nullable=false,unique=true,length=100) private String cleIdempotence;
 @Column(name="montant_simule",nullable=false,precision=10,scale=2) private BigDecimal montantSimule;
 @Column(nullable=false,length=3) private String devise="DH";
 @Column(name="date_operation",insertable=false,updatable=false) private Instant dateOperation;
 @Enumerated(EnumType.STRING) @Column(name="type_acces_obtenu",nullable=false) private TypeAcces typeAccesObtenu;
 @Enumerated(EnumType.STRING) @Column(name="mode_paiement",nullable=false) private ModePaiement modePaiement=ModePaiement.SIMULATION;
 @Column(nullable=false,length=20) private String statut="CONFIRME";
 public Long getId(){return id;} public Inscription getInscription(){return inscription;} public void setInscription(Inscription v){inscription=v;}
 public String getCleIdempotence(){return cleIdempotence;} public void setCleIdempotence(String v){cleIdempotence=v;}
 public BigDecimal getMontantSimule(){return montantSimule;} public void setMontantSimule(BigDecimal v){montantSimule=v;}
 public Instant getDateOperation(){return dateOperation;} public TypeAcces getTypeAccesObtenu(){return typeAccesObtenu;}
 public void setTypeAccesObtenu(TypeAcces v){typeAccesObtenu=v;} public String getDevise(){return devise;}
 public ModePaiement getModePaiement(){return modePaiement;} public String getStatut(){return statut;}
}
