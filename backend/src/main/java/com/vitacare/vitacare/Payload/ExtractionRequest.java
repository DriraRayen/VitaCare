package com.vitacare.vitacare.Payload;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExtractionRequest {
    private List<Long> documentIds;
}
