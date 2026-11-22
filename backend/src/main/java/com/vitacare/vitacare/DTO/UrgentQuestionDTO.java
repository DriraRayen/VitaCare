package com.vitacare.vitacare.DTO;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UrgentQuestionDTO {
    private Long id;
    private String questionId;
    private String questionFr;
    private String questionEn;
}
