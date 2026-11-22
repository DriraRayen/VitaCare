package com.vitacare.vitacare.Payload;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateCaseRequest {

    @NotBlank(message = "Checklist ID is required")
    private String checklistId;

    @NotBlank(message = "Complaint description is required")
    private String complaint;

    private List<String> answeredUrgentQuestions;
}
