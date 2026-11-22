package com.vitacare.vitacare.Payload;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateResultRequest {
    private String canonicalCode;
    private String rawName;
    private Double numericValue;
    private String unit;
    private LocalDate resultDate;
    private boolean confirmedByUser;
    private String reportText;
}
