package com.vitacare.vitacare.DTO;

import com.vitacare.vitacare.Rules.RulesEvaluationOutput;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharedPacketDTO {
    private String patientDisplayName;
    private String age;
    private String bloodType;
    private String allergies;
    private String chronicConditions;
    private String medications;
    private String complaint;
    private String checklistTitle;
    private RulesEvaluationOutput evaluation;
    private LocalDateTime expiresAt;
    private String disclaimer;
}
