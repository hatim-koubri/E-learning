package ma.elearning.admin;

import ma.elearning.api.AuthDtos.RegisterRequest;
import ma.elearning.auth.AuthService;
import ma.elearning.common.BusinessException;
import ma.elearning.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@DirtiesContext(classMode= DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class FormateurAdminServiceTest {
    @Autowired AuthService auth; @Autowired FormateurAdminService admin; @Autowired FormateurRepository repo;
    @Test void adminCanAcceptAndRefusePendingRequests() {
        var a=auth.registerFormateur(new RegisterRequest("A","a@f.com",null,"Password1!"));
        assertEquals(AccountStatus.ACTIF,admin.accept(a.id()).statut());
        assertThrows(BusinessException.class,()->admin.accept(a.id()));
        var b=auth.registerFormateur(new RegisterRequest("B","b@f.com",null,"Password1!"));
        var refused=admin.refuse(b.id(),"Dossier incomplet");
        assertEquals(AccountStatus.REFUSE,refused.statut());
        assertEquals("Dossier incomplet",refused.motifRefus());
        assertNotNull(refused.dateDecision());
    }
}

