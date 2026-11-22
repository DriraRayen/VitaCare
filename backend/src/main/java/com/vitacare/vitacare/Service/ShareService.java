package com.vitacare.vitacare.Service;

import com.vitacare.vitacare.DTO.ShareTokenDTO;
import com.vitacare.vitacare.DTO.SharedPacketDTO;
import com.vitacare.vitacare.Model.AuditLog;
import com.vitacare.vitacare.Model.DiagnosticCase;
import com.vitacare.vitacare.Model.ShareToken;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Repository.AuditLogRepository;
import com.vitacare.vitacare.Repository.DiagnosticCaseRepository;
import com.vitacare.vitacare.Repository.ShareTokenRepository;
import com.vitacare.vitacare.Rules.RulesEvaluationOutput;
import com.vitacare.vitacare.Security.TokenHasher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

@Service
@Transactional
public class ShareService {

    private final ShareTokenRepository shareTokenRepository;
    private final DiagnosticCaseRepository diagnosticCaseRepository;
    private final AuditLogRepository auditLogRepository;
    private final MasarCaseService masarCaseService;

    public ShareService(
            ShareTokenRepository shareTokenRepository,
            DiagnosticCaseRepository diagnosticCaseRepository,
            AuditLogRepository auditLogRepository,
            MasarCaseService masarCaseService
    ) {
        this.shareTokenRepository = shareTokenRepository;
        this.diagnosticCaseRepository = diagnosticCaseRepository;
        this.auditLogRepository = auditLogRepository;
        this.masarCaseService = masarCaseService;
    }

    public ShareTokenDTO createShareToken(Long caseId, String userEmail) {
        DiagnosticCase dc = diagnosticCaseRepository.findByIdAndUserEmail(caseId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));

        // Revoke any previous active tokens for this case
        for (ShareToken st : dc.getShareTokens()) {
            if (!st.isRevoked() && st.getExpiresAt().isAfter(LocalDateTime.now())) {
                st.setRevoked(true);
                shareTokenRepository.save(st);
            }
        }

        String rawToken = TokenHasher.generateRandomToken();
        String tokenHash = TokenHasher.hashToken(rawToken);
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(72);

        ShareToken shareToken = ShareToken.builder()
                .diagnosticCase(dc)
                .tokenHash(tokenHash)
                .expiresAt(expiresAt)
                .revoked(false)
                .createdAt(LocalDateTime.now())
                .build();

        shareTokenRepository.save(shareToken);

        auditLogRepository.save(AuditLog.builder()
                .userEmail(userEmail)
                .action("SHARE_LINK_CREATED")
                .resourceType("ShareToken")
                .resourceId(String.valueOf(shareToken.getId()))
                .details("Created 72h share link for case " + caseId)
                .timestamp(LocalDateTime.now())
                .build());

        return ShareTokenDTO.builder()
                .token(rawToken)
                .shareUrl("/share/" + rawToken)
                .expiresAt(expiresAt)
                .revoked(false)
                .build();
    }

    public void revokeShareToken(Long caseId, String userEmail) {
        DiagnosticCase dc = diagnosticCaseRepository.findByIdAndUserEmail(caseId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));

        for (ShareToken st : dc.getShareTokens()) {
            st.setRevoked(true);
            shareTokenRepository.save(st);
        }

        auditLogRepository.save(AuditLog.builder()
                .userEmail(userEmail)
                .action("SHARE_LINK_REVOKED")
                .resourceType("DiagnosticCase")
                .resourceId(String.valueOf(caseId))
                .details("Revoked share link")
                .timestamp(LocalDateTime.now())
                .build());
    }

    @Transactional(readOnly = true)
    public SharedPacketDTO getSharedPacket(String rawToken) {
        String tokenHash = TokenHasher.hashToken(rawToken);
        ShareToken token = shareTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lien de partage introuvable ou invalide"));

        if (token.isRevoked() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Ce lien de partage a expiré ou a été révoqué");
        }

        DiagnosticCase dc = token.getDiagnosticCase();
        User user = dc.getUser();

        // Log public access in audit log
        auditLogRepository.save(AuditLog.builder()
                .userEmail("ANONYMOUS_PUBLIC_VIEWER")
                .action("SHARE_LINK_ACCESSED")
                .resourceType("ShareToken")
                .resourceId(String.valueOf(token.getId()))
                .details("Public consultation of case " + dc.getId())
                .timestamp(LocalDateTime.now())
                .build());

        RulesEvaluationOutput eval = masarCaseService.evaluateCase(dc.getId(), user.getEmail());

        String displayName = (user.getFirstName() != null ? user.getFirstName() + " " : "")
                + (user.getLastName() != null && !user.getLastName().isBlank() ? user.getLastName().charAt(0) + "." : "");
        if (displayName.isBlank()) displayName = "Patient";

        String ageStr = "Non renseigné";
        if (user.getDateOfBirth() != null) {
            ageStr = Period.between(user.getDateOfBirth(), LocalDate.now()).getYears() + " ans";
        }

        return SharedPacketDTO.builder()
                .patientDisplayName(displayName)
                .age(ageStr)
                .bloodType(user.getBloodType())
                .allergies(user.getAllergies())
                .chronicConditions(user.getChronicConditions())
                .medications(user.getMedications())
                .complaint(dc.getComplaint())
                .checklistTitle(eval.getChecklistTitle())
                .evaluation(eval)
                .expiresAt(token.getExpiresAt())
                .disclaimer("Généré à partir de documents fournis par le patient. Liste suggérée, à confirmer par le médecin traitant.")
                .build();
    }
}
