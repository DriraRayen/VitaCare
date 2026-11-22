package com.vitacare.vitacare.Security;

import com.vitacare.vitacare.DTO.SharedPacketDTO;
import com.vitacare.vitacare.Model.*;
import com.vitacare.vitacare.Repository.*;
import com.vitacare.vitacare.Rules.RulesEvaluationOutput;
import com.vitacare.vitacare.Service.MasarCaseService;
import com.vitacare.vitacare.Service.ShareService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MasarSecurityTest {

    @Mock
    private DiagnosticCaseRepository diagnosticCaseRepository;
    @Mock
    private CaseResultRepository caseResultRepository;
    @Mock
    private ChecklistRepository checklistRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private ShareTokenRepository shareTokenRepository;

    private MasarCaseService masarCaseService;
    private ShareService shareService;

    @BeforeEach
    void setUp() {
        masarCaseService = new MasarCaseService(
                diagnosticCaseRepository,
                caseResultRepository,
                checklistRepository,
                userRepository,
                auditLogRepository
        );

        shareService = new ShareService(
                shareTokenRepository,
                diagnosticCaseRepository,
                auditLogRepository,
                masarCaseService
        );
    }

    @Test
    void userACannotReadUserBDataReturns404() {
        // Given Case #1 belongs to userA@test.com
        when(diagnosticCaseRepository.findByIdAndUserEmail(1L, "userB@test.com"))
                .thenReturn(Optional.empty());

        // When user B tries to access Case #1
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            masarCaseService.getCaseById(1L, "userB@test.com");
        });

        // Then 404 NOT FOUND is returned (no information leak)
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void doctorCannotReadPatientDataReturns404() {
        // Even with doctor role, patient private case lookup by doctor email must return 404
        when(diagnosticCaseRepository.findByIdAndUserEmail(1L, "doctor@vitacare.com"))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            masarCaseService.getCaseById(1L, "doctor@vitacare.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void expiredShareLinkFailsWithGone() {
        String rawToken = "mySecretToken123";
        String hash = TokenHasher.hashToken(rawToken);

        ShareToken expiredToken = ShareToken.builder()
                .id(1L)
                .tokenHash(hash)
                .expiresAt(LocalDateTime.now().minusHours(1)) // Expired
                .revoked(false)
                .build();

        when(shareTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(expiredToken));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shareService.getSharedPacket(rawToken);
        });

        assertEquals(HttpStatus.GONE, ex.getStatusCode());
    }

    @Test
    void revokedShareLinkFailsWithGone() {
        String rawToken = "myRevokedToken456";
        String hash = TokenHasher.hashToken(rawToken);

        ShareToken revokedToken = ShareToken.builder()
                .id(2L)
                .tokenHash(hash)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .revoked(true) // Revoked by patient
                .build();

        when(shareTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(revokedToken));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shareService.getSharedPacket(rawToken);
        });

        assertEquals(HttpStatus.GONE, ex.getStatusCode());
    }

    @Test
    void nonExistentShareTokenFailsWithNotFound() {
        String rawToken = "nonExistentToken";
        String hash = TokenHasher.hashToken(rawToken);

        when(shareTokenRepository.findByTokenHash(hash)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shareService.getSharedPacket(rawToken);
        });

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }
}
