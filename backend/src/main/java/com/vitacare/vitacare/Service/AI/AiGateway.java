package com.vitacare.vitacare.Service.AI;

import com.vitacare.vitacare.DTO.ExtractedItemDTO;

import java.util.List;

public interface AiGateway {

    /**
     * Extracts structured test results from redacted medical text.
     * AI is used ONLY to extract structured data; deterministic rules evaluate them.
     */
    List<ExtractedItemDTO> extractTestResults(String redactedText, List<String> allowedCanonicalCodes);

    /**
     * Generates a patient-friendly summary for the Analysis module.
     */
    default String generateSummary(String redactedText) {
        String summary = generateSummary(redactedText, "French");
        if (summary != null) {
            return summary;
        }
        if (redactedText == null || redactedText.isBlank()) {
            return "Aucun document médical analysé.";
        }
        return "Synthèse automatique : " + String.join(" ", redactedText.lines().limit(3).toList()).trim();
    }

    String generateSummary(String redactedText, String language);

    static String excerpt(String text) {
        return String.join("\n", text.lines().map(String::strip).filter(line -> !line.isBlank()).limit(12).toList());
    }
}
