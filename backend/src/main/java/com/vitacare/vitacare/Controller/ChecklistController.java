package com.vitacare.vitacare.Controller;

import com.vitacare.vitacare.DTO.ChecklistDTO;
import com.vitacare.vitacare.Service.ChecklistService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/masar")
@CrossOrigin(origins = "http://localhost:3000", exposedHeaders = {"Authorization", "Content-Disposition"})
public class ChecklistController {

    private final ChecklistService checklistService;

    public ChecklistController(ChecklistService checklistService) {
        this.checklistService = checklistService;
    }

    @GetMapping("/checklists")
    public ResponseEntity<List<ChecklistDTO>> getPublishedChecklists() {
        return ResponseEntity.ok(checklistService.getPublishedChecklists());
    }

    @GetMapping("/checklists/{id}")
    public ResponseEntity<ChecklistDTO> getChecklistById(@PathVariable String id) {
        return ResponseEntity.ok(checklistService.getChecklistById(id));
    }

    @GetMapping("/doctor/checklists")
    @PreAuthorize("hasAuthority('ROLE_DOCTOR')")
    public ResponseEntity<List<ChecklistDTO>> getDraftChecklists() {
        return ResponseEntity.ok(checklistService.getDraftChecklists());
    }

    @PostMapping("/doctor/checklists/{id}/publish")
    @PreAuthorize("hasAuthority('ROLE_DOCTOR')")
    public ResponseEntity<ChecklistDTO> publishChecklist(@PathVariable String id, Authentication authentication) {
        return ResponseEntity.ok(checklistService.publishChecklist(id, authentication.getName()));
    }

    @PostMapping("/doctor/checklists/{id}/archive")
    @PreAuthorize("hasAuthority('ROLE_DOCTOR')")
    public ResponseEntity<ChecklistDTO> archiveChecklist(@PathVariable String id, Authentication authentication) {
        return ResponseEntity.ok(checklistService.archiveChecklist(id, authentication.getName()));
    }
}
