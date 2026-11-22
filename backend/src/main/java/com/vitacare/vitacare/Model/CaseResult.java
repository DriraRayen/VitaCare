package com.vitacare.vitacare.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "case_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    @JsonIgnore
    private DiagnosticCase diagnosticCase;

    @Column(nullable = false)
    private String canonicalCode; // e.g. "FASTING_GLUCOSE" or "UNMAPPED"

    @Column(nullable = false)
    private String rawName;

    private Double numericValue;

    private String unit;

    private LocalDate resultDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_document_id")
    private Document sourceDocument;

    @Builder.Default
    private Double confidence = 1.0;

    @Builder.Default
    private boolean confirmedByUser = false;

    @Column(columnDefinition = "TEXT")
    private String reportText;
}
