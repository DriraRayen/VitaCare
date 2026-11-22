package com.vitacare.vitacare.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExtractedItemDTO {
    private String rawTestName;
    private String canonicalCode;
    private Double value;
    private String unit;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate resultDate;

    @Builder.Default
    private Double confidence = 1.0;

    private String reportText;
}
