package com.vitacare.vitacare.Rules;

import java.text.Normalizer;
import java.util.List;

public class SynonymNormalizer {

    public static final String UNMAPPED = "UNMAPPED";

    public static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String replaced = text.trim()
                .replace("œ", "oe")
                .replace("Œ", "oe")
                .replace("æ", "ae")
                .replace("Æ", "ae");
        String normalized = Normalizer.normalize(replaced, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9%]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public static boolean matches(String rawText, String target) {
        if (rawText == null || target == null) return false;
        String normRaw = normalize(rawText);
        String normTarget = normalize(target);
        if (normRaw.equals(normTarget)) return true;
        // Also allow substring word boundaries e.g. "bilan lipidique complet" matches "bilan lipidique"
        return normRaw.contains(normTarget) || normTarget.contains(normRaw);
    }

    public static String findMatchingCode(String rawTestName, List<ChecklistTestItem> tests) {
        if (rawTestName == null || rawTestName.isBlank() || tests == null) {
            return UNMAPPED;
        }

        String normRaw = normalize(rawTestName);

        // 1. Direct canonical code match
        for (ChecklistTestItem test : tests) {
            if (normalize(test.getCode()).equals(normRaw)) {
                return test.getCode();
            }
        }

        // 2. Synonyms exact normalized match
        for (ChecklistTestItem test : tests) {
            if (test.getSynonyms() != null) {
                for (String syn : test.getSynonyms()) {
                    if (normalize(syn).equals(normRaw)) {
                        return test.getCode();
                    }
                }
            }
        }

        // 3. Synonyms containment match
        for (ChecklistTestItem test : tests) {
            if (test.getSynonyms() != null) {
                for (String syn : test.getSynonyms()) {
                    String normSyn = normalize(syn);
                    if (normRaw.contains(normSyn) || normSyn.contains(normRaw)) {
                        return test.getCode();
                    }
                }
            }
        }

        return UNMAPPED;
    }
}
