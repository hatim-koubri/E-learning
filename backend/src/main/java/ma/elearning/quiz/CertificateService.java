package ma.elearning.quiz;

import ma.elearning.common.BusinessException;
import ma.elearning.learning.Inscription;
import ma.elearning.learning.InscriptionRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
public class CertificateService {
 private final QuizService quizzes;private final InscriptionRepository inscriptions;
 public CertificateService(QuizService quizzes,InscriptionRepository inscriptions){this.quizzes=quizzes;this.inscriptions=inscriptions;}
 @Transactional(readOnly=true)
 public byte[] generate(String email,Long formationId){
  var plan=quizzes.evaluationPlan(email,formationId);
  if(!plan.certificatDisponible())throw new BusinessException(HttpStatus.CONFLICT,"CERTIFICATE_REQUIREMENTS_NOT_MET","Terminez les modules et réussissez les quiz obligatoires avant de télécharger le certificat.");
  Inscription inscription=inscriptions.findByParticipantEmailAndFormationId(email,formationId)
   .orElseThrow(()->new BusinessException(HttpStatus.NOT_FOUND,"ENROLLMENT_NOT_FOUND","Inscription introuvable."));
  LocalDate issued=LocalDate.now(ZoneOffset.UTC);String code=verificationCode(inscription.getId(),formationId,email);
  try(PDDocument document=new PDDocument();ByteArrayOutputStream output=new ByteArrayOutputStream()){
   PDPage page=new PDPage(new PDRectangle(PDRectangle.A4.getHeight(),PDRectangle.A4.getWidth()));document.addPage(page);
   PDType1Font title=new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
   PDType1Font regular=new PDType1Font(Standard14Fonts.FontName.HELVETICA);
   try(PDPageContentStream canvas=new PDPageContentStream(document,page)){
    canvas.setNonStrokingColor(19/255f,31/255f,53/255f);canvas.addRect(0,0,page.getMediaBox().getWidth(),page.getMediaBox().getHeight());canvas.fill();
    canvas.setStrokingColor(80/255f,210/255f,170/255f);canvas.setLineWidth(4);canvas.addRect(28,28,page.getMediaBox().getWidth()-56,page.getMediaBox().getHeight()-56);canvas.stroke();
    center(canvas,title,20,"NEXALEARN",page,500);center(canvas,title,34,"CERTIFICAT DE RÉUSSITE",page,430);
    center(canvas,regular,17,"Ce certificat atteste que",page,370);center(canvas,title,27,safe(inscription.getParticipant().getNom()),page,325);
    center(canvas,regular,17,"a terminé avec succès la formation",page,280);center(canvas,title,23,safe(inscription.getFormation().getTitre()),page,235);
    center(canvas,regular,14,"Modules terminés et évaluations obligatoires validées",page,185);
    center(canvas,regular,12,"Délivré le "+issued.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))+" - Vérification : "+code,page,95);
   }
   document.save(output);return output.toByteArray();
  }catch(IOException exception){throw new IllegalStateException("Impossible de générer le certificat.",exception);}
 }
 private void center(PDPageContentStream stream,PDType1Font font,float size,String value,PDPage page,float y)throws IOException{
  float width=font.getStringWidth(value)/1000*size;stream.beginText();stream.setFont(font,size);stream.setNonStrokingColor(1f,1f,1f);
  stream.newLineAtOffset((page.getMediaBox().getWidth()-width)/2,y);stream.showText(value);stream.endText();
 }
 private String safe(String value){return value.replace('’','\'').replace('—','-').replaceAll("[\\p{Cntrl}]"," ").replaceAll("\\s+"," ").trim();}
 private String verificationCode(Long inscriptionId,Long formationId,String email){
  try{byte[] digest=MessageDigest.getInstance("SHA-256").digest((inscriptionId+":"+formationId+":"+email.toLowerCase()).getBytes(StandardCharsets.UTF_8));
   return java.util.HexFormat.of().formatHex(digest,0,6).toUpperCase();}catch(Exception exception){throw new IllegalStateException(exception);}
 }
}
