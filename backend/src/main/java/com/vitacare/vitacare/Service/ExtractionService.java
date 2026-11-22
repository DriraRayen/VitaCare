package com.vitacare.vitacare.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vitacare.vitacare.DTO.DiagnosticCaseDTO;
import com.vitacare.vitacare.DTO.ExtractedItemDTO;
import com.vitacare.vitacare.Model.*;
import com.vitacare.vitacare.Repository.*;
import com.vitacare.vitacare.Rules.ChecklistTestItem;
import com.vitacare.vitacare.Rules.SynonymNormalizer;
import com.vitacare.vitacare.Security.Redactor;
import com.vitacare.vitacare.Service.AI.AiGateway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ExtractionService {

    @Value("${ai.confidence-threshold:0.7}")
    private double confidenceThreshold;

    private final DiagnosticCaseRepository diagnosticCaseRepository;
    private final CaseResultRepository caseResultRepository;
    private final ChecklistRepository checklistRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AiConsentRepository aiConsentRepository;
    private final AuditLogRepository auditLogRepository;
    private final DocumentTextExtractor documentTextExtractor;
    private final AiGateway aiGateway;
    private final MasarCaseService masarCaseService;
    private final ObjectMapper jsonMapper = new ObjectMapper();

    public ExtractionService(
            DiagnosticCaseRepository diagnosticCaseRepository,
            CaseResultRepository caseResultRepository,
            ChecklistRepository checklistRepository,
            DocumentRepository documentRepository,
            UserRepository userRepository,
            AiConsentRepository aiConsentRepository,
            AuditLogRepository auditLogRepository,
            DocumentTextExtractor documentTextExtractor,
            AiGateway aiGateway,
            MasarCaseService masarCaseService
    ) {
        this.diagnosticCaseRepository = diagnosticCaseRepository;
        this.caseResultRepository = caseResultRepository;
        this.checklistRepository = checklistRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.aiConsentRepository = aiConsentRepository;
        this.auditLogRepository = auditLogRepository;
        this.documentTextExtractor = documentTextExtractor;
        this.aiGateway = aiGateway;
        this.masarCaseService = masarCaseService;
    }

    public DiagnosticCaseDTO runExtraction(Long caseId, String userEmail, List<Long> documentIds) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        // Step 1: Check AiConsent
        boolean hasConsent = aiConsentRepository.findTopByUserEmailAndRevokedFalseOrderByConsentDateDesc(userEmail).isPresent();
        if (!hasConsent) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "CONSENT_REQUIRED");
        }

        // Step 2: Ownership check
        DiagnosticCase diagnosticCase = diagnosticCaseRepository.findByIdAndUserEmail(caseId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));

        Checklist checklist = checklistRepository.findById(diagnosticCase.getChecklistId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist introuvable"));

        List<ChecklistTestItem> checklistTestItems = checklist.getTests().stream()
                .map(this::toChecklistTestItem)
                .collect(Collectors.toList());

        List<String> allowedCodes = checklistTestItems.stream()
                .map(ChecklistTestItem::getCode)
                .collect(Collectors.toList());

        List<Document> documentsToProcess;
        if (documentIds != null && !documentIds.isEmpty()) {
            documentsToProcess = documentIds.stream()
                    .map(id -> documentRepository.findByIdAndUserId(id, user.getId()).orElse(null))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } else {
            documentsToProcess = documentRepository.findByUserId(user.getId());
        }

        int extractedCount = 0;

        for (Document doc : documentsToProcess) {
            File file = new File(doc.getFilePath());
            if (!file.exists()) continue;

            // Step 3: Local text extraction (PDFBox / Tess4J)
            String rawText = documentTextExtractor.extractText(file);
            if (rawText == null || rawText.isBlank()) continue;

            // Step 4: Redact PII BEFORE sending to AI or logging
            String redactedText = Redactor.redact(rawText, user);

            // Step 5: Call AI Gateway
            List<ExtractedItemDTO> items = aiGateway.extractTestResults(redactedText, allowedCodes);

            // Step 6: Validate & never trust model's code: re-run synonym normalizer
            for (ExtractedItemDTO item : items) {
                String normalizedCode = SynonymNormalizer.findMatchingCode(item.getRawTestName(), checklistTestItems);
                double confidence = item.getConfidence() != null ? item.getConfidence() : 0.8;

                if (SynonymNormalizer.UNMAPPED.equals(normalizedCode)) {
                    confidence = Math.min(confidence, 0.4);
                }

                CaseResult result = CaseResult.builder()
                        .diagnosticCase(diagnosticCase)
                        .canonicalCode(normalizedCode)
                        .rawName(item.getRawTestName())
                        .numericValue(item.getValue())
                        .unit(item.getUnit())
                        .resultDate(item.getResultDate() != null ? item.getResultDate() : LocalDate.now())
                        .sourceDocument(doc)
                        .confidence(confidence)
                        .confirmedByUser(false) // Must be reviewed by user!
                        .reportText(item.getReportText())
                        .build();

                caseResultRepository.save(result);
                diagnosticCase.getResults().add(result);
                extractedCount++;
            }
        }

        // Audit logging
        auditLogRepository.save(AuditLog.builder()
                .userEmail(userEmail)
                .action("EXTRACTION_RUN")
                .resourceType("DiagnosticCase")
                .resourceId(String.valueOf(caseId))
                .details("Extracted " + extractedCount + " test results from " + documentsToProcess.size() + " documents")
                .timestamp(LocalDateTime.now())
                .build());

        return masarCaseService.toDTO(diagnosticCase);
    }

    private ChecklistTestItem toChecklistTestItem(ChecklistTest test) {
        List<String> synonyms = Collections.emptyList();
        if (test.getSynonymsJson() != null) {
            try {
                synonyms = jsonMapper.readValue(test.getSynonymsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        Map<String, Object> conversions = Collections.emptyMap();
        if (test.getConversionsJson() != null) {
            try {
                conversions = jsonMapper.readValue(test.getConversionsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        List<String> components = null;
        if (test.getComponentsJson() != null) {
            try {
                components = jsonMapper.readValue(test.getComponentsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        return new ChecklistTestItem(
                test.getCode(),
                synonyms,
                test.getValueType().name().toLowerCase(),
                test.getCanonicalUnit(),
                conversions,
                test.getValidityDays(),
                test.getFlagExpr(),
                test.getCaveat(),
                test.isOptional(),
                components,
                test.getSpecialty()
        );
    }
}
