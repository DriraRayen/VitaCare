package com.vitacare.vitacare.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vitacare.vitacare.DTO.CaseResultDTO;
import com.vitacare.vitacare.DTO.DiagnosticCaseDTO;
import com.vitacare.vitacare.Model.*;
import com.vitacare.vitacare.Payload.CreateCaseRequest;
import com.vitacare.vitacare.Payload.UpdateResultRequest;
import com.vitacare.vitacare.Repository.AuditLogRepository;
import com.vitacare.vitacare.Repository.CaseResultRepository;
import com.vitacare.vitacare.Repository.ChecklistRepository;
import com.vitacare.vitacare.Repository.DiagnosticCaseRepository;
import com.vitacare.vitacare.Repository.UserRepository;
import com.vitacare.vitacare.Rules.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class MasarCaseService {

    private final DiagnosticCaseRepository diagnosticCaseRepository;
    private final CaseResultRepository caseResultRepository;
    private final ChecklistRepository checklistRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper jsonMapper = new ObjectMapper();

    public MasarCaseService(
            DiagnosticCaseRepository diagnosticCaseRepository,
            CaseResultRepository caseResultRepository,
            ChecklistRepository checklistRepository,
            UserRepository userRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.diagnosticCaseRepository = diagnosticCaseRepository;
        this.caseResultRepository = caseResultRepository;
        this.checklistRepository = checklistRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public DiagnosticCaseDTO createCase(String userEmail, CreateCaseRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        Checklist checklist = checklistRepository.findById(request.getChecklistId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist introuvable"));

        boolean isUrgent = request.getAnsweredUrgentQuestions() != null && !request.getAnsweredUrgentQuestions().isEmpty();

        DiagnosticCase diagnosticCase = DiagnosticCase.builder()
                .user(user)
                .complaint(request.getComplaint())
                .checklistId(checklist.getId())
                .status(DiagnosticCase.CaseStatus.ACTIVE)
                .urgentFlag(isUrgent)
                .build();

        DiagnosticCase saved = diagnosticCaseRepository.save(diagnosticCase);

        auditLogRepository.save(AuditLog.builder()
                .userEmail(userEmail)
                .action("CASE_CREATE")
                .resourceType("DiagnosticCase")
                .resourceId(String.valueOf(saved.getId()))
                .details("Created case for checklist: " + checklist.getId())
                .timestamp(LocalDateTime.now())
                .build());

        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<DiagnosticCaseDTO> getUserCases(String userEmail) {
        return diagnosticCaseRepository.findByUserEmailOrderByCreatedAtDesc(userEmail).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DiagnosticCaseDTO getCaseById(Long caseId, String userEmail) {
        DiagnosticCase dc = diagnosticCaseRepository.findByIdAndUserEmail(caseId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));
        return toDTO(dc);
    }

    public void deleteCase(Long caseId, String userEmail) {
        DiagnosticCase dc = diagnosticCaseRepository.findByIdAndUserEmail(caseId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));

        diagnosticCaseRepository.delete(dc);

        auditLogRepository.save(AuditLog.builder()
                .userEmail(userEmail)
                .action("CASE_DELETE")
                .resourceType("DiagnosticCase")
                .resourceId(String.valueOf(caseId))
                .details("Deleted case and associated results")
                .timestamp(LocalDateTime.now())
                .build());
    }

    public CaseResultDTO updateResult(Long caseId, Long resultId, String userEmail, UpdateResultRequest request) {
        // Enforce ownership
        diagnosticCaseRepository.findByIdAndUserEmail(caseId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));

        CaseResult result = caseResultRepository.findByIdAndDiagnosticCaseId(resultId, caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Résultat introuvable"));

        if (request.getCanonicalCode() != null) result.setCanonicalCode(request.getCanonicalCode());
        if (request.getRawName() != null) result.setRawName(request.getRawName());
        if (request.getNumericValue() != null) result.setNumericValue(request.getNumericValue());
        if (request.getUnit() != null) result.setUnit(request.getUnit());
        if (request.getResultDate() != null) result.setResultDate(request.getResultDate());
        if (request.getReportText() != null) result.setReportText(request.getReportText());
        result.setConfirmedByUser(request.isConfirmedByUser());

        CaseResult saved = caseResultRepository.save(result);
        return toResultDTO(saved);
    }

    @Transactional(readOnly = true)
    public RulesEvaluationOutput evaluateCase(Long caseId, String userEmail) {
        DiagnosticCase dc = diagnosticCaseRepository.findByIdAndUserEmail(caseId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));

        Checklist checklist = checklistRepository.findById(dc.getChecklistId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist introuvable"));

        // Build checklist items
        List<ChecklistTestItem> testItems = checklist.getTests().stream()
                .map(this::toChecklistTestItem)
                .collect(Collectors.toList());

        // Extract confirmed results only
        List<ConfirmedResultData> confirmedResults = dc.getResults().stream()
                .filter(CaseResult::isConfirmedByUser)
                .map(r -> new ConfirmedResultData(
                        r.getCanonicalCode(),
                        r.getRawName(),
                        r.getNumericValue(),
                        r.getUnit(),
                        r.getResultDate(),
                        r.getReportText()
                ))
                .collect(Collectors.toList());

        boolean isClinicallyValidated = checklist.getReviewedBy() != null && checklist.getStatus() == ChecklistStatus.PUBLISHED;
        List<String> urgentAnswers = dc.isUrgentFlag() ? List.of("URGENT_FLAG") : Collections.emptyList();

        return MasarRulesEngine.evaluate(
                checklist.getId(),
                checklist.getTitle(),
                isClinicallyValidated,
                null,
                testItems,
                confirmedResults,
                LocalDate.now(),
                urgentAnswers
        );
    }

    public DiagnosticCaseDTO toDTO(DiagnosticCase dc) {
        Checklist cl = checklistRepository.findById(dc.getChecklistId()).orElse(null);
        String checklistTitle = cl != null ? cl.getTitle() : dc.getChecklistId();

        List<CaseResultDTO> resultDTOs = dc.getResults().stream()
                .map(this::toResultDTO)
                .collect(Collectors.toList());

        return DiagnosticCaseDTO.builder()
                .id(dc.getId())
                .complaint(dc.getComplaint())
                .checklistId(dc.getChecklistId())
                .checklistTitle(checklistTitle)
                .status(dc.getStatus())
                .urgentFlag(dc.isUrgentFlag())
                .createdAt(dc.getCreatedAt())
                .updatedAt(dc.getUpdatedAt())
                .results(resultDTOs)
                .build();
    }

    public CaseResultDTO toResultDTO(CaseResult r) {
        String docName = r.getSourceDocument() != null ? r.getSourceDocument().getFilename() : null;
        return CaseResultDTO.builder()
                .id(r.getId())
                .canonicalCode(r.getCanonicalCode())
                .rawName(r.getRawName())
                .numericValue(r.getNumericValue())
                .unit(r.getUnit())
                .resultDate(r.getResultDate())
                .sourceDocumentFilename(docName)
                .confidence(r.getConfidence())
                .confirmedByUser(r.isConfirmedByUser())
                .reportText(r.getReportText())
                .build();
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
