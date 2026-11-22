package com.vitacare.vitacare.Model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userEmail;

    @Column(nullable = false)
    private String action; // e.g. "CASE_CREATE", "SHARE_ACCESS", "EXTRACTION"

    private String resourceType; // e.g. "DiagnosticCase", "ShareToken"

    private String resourceId;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
