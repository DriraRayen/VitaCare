package com.vitacare.vitacare.DTO;

import com.vitacare.vitacare.Model.TestValueType;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChecklistTestDTO {
    private Long id;
    private String code;
    private List<String> synonyms;
    private TestValueType valueType;
    private String canonicalUnit;
    private Map<String, Object> conversions;
    private int validityDays;
    private String flagExpr;
    private String caveat;
    private boolean optional;
    private List<String> components;
    private String specialty;
}
