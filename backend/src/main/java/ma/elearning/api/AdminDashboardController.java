package ma.elearning.api;

import ma.elearning.admin.AdminDashboardService;
import ma.elearning.api.AdminDashboardDtos.DashboardResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {
    private final AdminDashboardService service;
    public AdminDashboardController(AdminDashboardService service){this.service=service;}
    @GetMapping public DashboardResponse dashboard(@RequestParam(defaultValue="12") int months){return service.dashboard(months);}
}
