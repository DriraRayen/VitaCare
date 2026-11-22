package com.vitacare.vitacare.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "checklist_urgent_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UrgentQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    @JsonIgnore
    private Checklist checklist;

    private String questionId; // e.g. "uq1"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String questionFr;

    @Column(columnDefinition = "TEXT")
    private String questionEn;
}
