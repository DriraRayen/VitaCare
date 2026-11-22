package com.vitacare.vitacare.Controller;

import com.vitacare.vitacare.DTO.CaseResultDTO;
import com.vitacare.vitacare.DTO.DiagnosticCaseDTO;
import com.vitacare.vitacare.DTO.ShareTokenDTO;
import com.vitacare.vitacare.Model.DiagnosticCase;
import com.vitacare.vitacare.Payload.CreateCaseRequest;
import com.vitacare.vitacare.Payload.ExtractionRequest;
import com.vitacare.vitacare.Payload.UpdateResultRequest;
import com.vitacare.vitacare.Repository.DiagnosticCaseRepository;
import com.vitacare.vitacare.Rules.RulesEvaluationOutput;
import com.vitacare.vitacare.Security.Redactor;
import com.vitacare.vitacare.Service.AI.AiGateway;
import com.vitacare.vitacare.Service.ExtractionService;
import com.vitacare.vitacare.Service.MasarCaseService;
import com.vitacare.vitacare.Service.ReferralPacketPdfService;
import com.vitacare.vitacare.Service.ShareService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masar/cases")
@CrossOrigin(origins = "http://localhost:3000", exposedHeaders = {"Authorization", "Content-Disposition"})
public class MasarCaseController {

    private final MasarCaseService masarCaseService;
    private final ExtractionService extractionService;
    private final ReferralPacketPdfService pdfService;
    private final ShareService shareService;
    private final DiagnosticCaseRepository diagnosticCaseRepository;
    private final AiGateway aiGateway;

    public MasarCaseController(
            MasarCaseService masarCaseService,
            ExtractionService extractionService,
            ReferralPacketPdfService pdfService,
            ShareService shareService,
            DiagnosticCaseRepository diagnosticCaseRepository,
            AiGateway aiGateway
    ) {
        this.masarCaseService = masarCaseService;
        this.extractionService = extractionService;
        this.pdfService = pdfService;
        this.shareService = shareService;
        this.diagnosticCaseRepository = diagnosticCaseRepository;
        this.aiGateway = aiGateway;
    }

    @PostMapping
    public ResponseEntity<DiagnosticCaseDTO> createCase(
            Authentication authentication,
            @Valid @RequestBody CreateCaseRequest request) {
        return ResponseEntity.ok(masarCaseService.createCase(authentication.getName(), request));
    }

    @GetMapping
    public ResponseEntity<List<DiagnosticCaseDTO>> getUserCases(Authentication authentication) {
        return ResponseEntity.ok(masarCaseService.getUserCases(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DiagnosticCaseDTO> getCaseById(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(masarCaseService.getCaseById(id, authentication.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCase(
            @PathVariable Long id,
            Authentication authentication) {
        masarCaseService.deleteCase(id, authentication.getName());
        return ResponseEntity.ok(Map.of("message", "Dossier supprimé avec succès"));
    }

    @PutMapping("/{id}/results/{resultId}")
    public ResponseEntity<CaseResultDTO> updateResult(
            @PathVariable Long id,
            @PathVariable Long resultId,
            Authentication authentication,
            @RequestBody UpdateResultRequest request) {
        return ResponseEntity.ok(masarCaseService.updateResult(id, resultId, authentication.getName(), request));
    }

    @PostMapping("/{id}/evaluate")
    public ResponseEntity<RulesEvaluationOutput> evaluateCase(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(masarCaseService.evaluateCase(id, authentication.getName()));
    }

    @PostMapping("/{id}/extract")
    public ResponseEntity<DiagnosticCaseDTO> extractResults(
            @PathVariable Long id,
            Authentication authentication,
            @RequestBody(required = false) ExtractionRequest request) {
        List<Long> docIds = request != null ? request.getDocumentIds() : Collections.emptyList();
        return ResponseEntity.ok(extractionService.runExtraction(id, authentication.getName(), docIds));
    }

    @GetMapping("/{id}/packet/pdf")
    public ResponseEntity<byte[]> downloadReferralPacketPdf(
            @PathVariable Long id,
            @RequestParam(required = false) String question,
            Authentication authentication) throws Exception {
        DiagnosticCase dc = diagnosticCaseRepository.findByIdAndUserEmail(id, authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));

        RulesEvaluationOutput eval = masarCaseService.evaluateCase(id, authentication.getName());
        byte[] pdfBytes = pdfService.generateReferralPacketPdf(dc, eval, question);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "Dossier_Orientation_Masar_" + id + ".pdf");
        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<ShareTokenDTO> createShareLink(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(shareService.createShareToken(id, authentication.getName()));
    }

    @DeleteMapping("/{id}/share")
    public ResponseEntity<?> revokeShareLink(
            @PathVariable Long id,
            Authentication authentication) {
        shareService.revokeShareToken(id, authentication.getName());
        return ResponseEntity.ok(Map.of("message", "Lien de partage révoqué"));
    }

    @PostMapping("/analysis/summarize")
    public ResponseEntity<?> summarizeForAnalysis(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String rawText = body.getOrDefault("text", "");
        String redacted = Redactor.redact(rawText, null);
        String summary = aiGateway.generateSummary(redacted);
        return ResponseEntity.ok(Map.of("summary", summary));
    }
}
