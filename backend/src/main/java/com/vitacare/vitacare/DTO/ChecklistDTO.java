package com.vitacare.vitacare.DTO;

import com.vitacare.vitacare.Model.ChecklistStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChecklistDTO {
    private String id;
    private String title;
    private String guideline;
    private String note;
    private ChecklistStatus status;
    private String reviewedByDoctorName;
    private LocalDateTime publishedAt;
    private List<ChecklistTestDTO> tests;
    private List<UrgentQuestionDTO> urgentQuestions;
}
