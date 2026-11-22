package com.vitacare.vitacare.DTO;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseResultDTO {
    private Long id;
    private String canonicalCode;
    private String rawName;
    private Double numericValue;
    private String unit;
    private LocalDate resultDate;
    private String sourceDocumentFilename;
    private Double confidence;
    private boolean confirmedByUser;
    private String reportText;
}
