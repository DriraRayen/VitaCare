package com.vitacare.vitacare.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "checklist_tests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChecklistTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    @JsonIgnore
    private Checklist checklist;

    @Column(nullable = false)
    private String code; // e.g. "FASTING_GLUCOSE"

    @Column(columnDefinition = "TEXT")
    private String synonymsJson; // JSON array of synonyms

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TestValueType valueType = TestValueType.NUMERIC;

    private String canonicalUnit;

    @Column(columnDefinition = "TEXT")
    private String conversionsJson; // JSON object e.g. {"g/L": 100, "mmol/L": 18}

    private int validityDays;

    private String flagExpr; // e.g. ">=126" or "<60"

    private String caveat;

    @Builder.Default
    private boolean optional = false;

    @Column(columnDefinition = "TEXT")
    private String componentsJson; // JSON array e.g. ["TOTAL_CHOL", "HDL", "TG"]

    private String specialty;
}
