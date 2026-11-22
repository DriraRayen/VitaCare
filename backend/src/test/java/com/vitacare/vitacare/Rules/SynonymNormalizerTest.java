package com.vitacare.vitacare.Rules;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class SynonymNormalizerTest {

    @Test
    void testNormalizeStripsAccentsAndPunctuation() {
        assertEquals("glycemie a jeun", SynonymNormalizer.normalize("Glycémie à jeun"));
        assertEquals("hemoglobine glyquee", SynonymNormalizer.normalize("Hémoglobine glyquée"));
        assertEquals("fond d oeil", SynonymNormalizer.normalize("Fond d'œil"));
        assertEquals("hba1c", SynonymNormalizer.normalize("  HbA1c  "));
    }

    @Test
    void testFindMatchingCodeExactAndSynonym() {
        ChecklistTestItem glucose = new ChecklistTestItem();
        glucose.setCode("FASTING_GLUCOSE");
        glucose.setSynonyms(List.of("glycémie à jeun", "glycémie", "FPG"));

        ChecklistTestItem hba1c = new ChecklistTestItem();
        hba1c.setCode("HBA1C");
        hba1c.setSynonyms(List.of("HbA1c", "hémoglobine glyquée", "A1C"));

        List<ChecklistTestItem> items = List.of(glucose, hba1c);

        assertEquals("FASTING_GLUCOSE", SynonymNormalizer.findMatchingCode("glycemie a jeun", items));
        assertEquals("FASTING_GLUCOSE", SynonymNormalizer.findMatchingCode("GLYCÉMIE", items));
        assertEquals("FASTING_GLUCOSE", SynonymNormalizer.findMatchingCode("FPG", items));
        assertEquals("HBA1C", SynonymNormalizer.findMatchingCode("Hémoglobine Glyquée", items));
        assertEquals("HBA1C", SynonymNormalizer.findMatchingCode("hba1c", items));
    }

    @Test
    void testFindMatchingCodeReturnsUnmappedWhenNoMatch() {
        ChecklistTestItem hba1c = new ChecklistTestItem();
        hba1c.setCode("HBA1C");
        hba1c.setSynonyms(List.of("HbA1c", "hémoglobine glyquée"));

        assertEquals(SynonymNormalizer.UNMAPPED, SynonymNormalizer.findMatchingCode("Vitesse de sedimentation", List.of(hba1c)));
        assertEquals(SynonymNormalizer.UNMAPPED, SynonymNormalizer.findMatchingCode("", List.of(hba1c)));
        assertEquals(SynonymNormalizer.UNMAPPED, SynonymNormalizer.findMatchingCode(null, List.of(hba1c)));
    }
}
