package com.vitacare.vitacare.DTO;

import com.vitacare.vitacare.Model.DiagnosticCase.CaseStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosticCaseDTO {
    private Long id;
    private String complaint;
    private String checklistId;
    private String checklistTitle;
    private CaseStatus status;
    private boolean urgentFlag;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<CaseResultDTO> results;
}
