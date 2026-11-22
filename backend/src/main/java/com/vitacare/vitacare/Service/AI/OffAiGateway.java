package com.vitacare.vitacare.Service.AI;

import com.vitacare.vitacare.DTO.ExtractedItemDTO;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component("offAiGateway")
public class OffAiGateway implements AiGateway {

    // Regex pattern for standard lab result lines: Name ... Value ... Unit
    // e.g. "Glycémie à jeun : 1.26 g/L", "HbA1c : 6.8 %", "Créatinine : 10.5 mg/L"
    private static final Pattern NUMERIC_LINE_PATTERN = Pattern.compile(
            "(?i)([A-Za-zÀ-ÿ0-9'\\s\\-_/]+?)\\s*[:=]\\s*([0-9]+(?:[.,][0-9]+)?)\\s*([A-Za-z/%µ]+(?:/[A-Za-z0-9.]+)?)"
    );

    private static final Pattern DATE_PATTERN = Pattern.compile(
            "(?:(?:19|20)\\d{2}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]20\\d{2})"
    );

    @Override
    public List<ExtractedItemDTO> extractTestResults(String redactedText, List<String> allowedCanonicalCodes) {
        List<ExtractedItemDTO> results = new ArrayList<>();
        if (redactedText == null || redactedText.isBlank()) {
            return results;
        }

        LocalDate documentDate = extractDate(redactedText);

        String[] lines = redactedText.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            Matcher matcher = NUMERIC_LINE_PATTERN.matcher(trimmed);
            if (matcher.find()) {
                String rawName = matcher.group(1).trim();
                String valStr = matcher.group(2).replace(',', '.');
                String unit = matcher.group(3).trim();

                try {
                    double val = Double.parseDouble(valStr);
                    // Filter out header lines that look like numbers (e.g. Page 1/1)
                    if (!rawName.equalsIgnoreCase("page") && !rawName.equalsIgnoreCase("tel")) {
                        results.add(ExtractedItemDTO.builder()
                                .rawTestName(rawName)
                                .value(val)
                                .unit(unit)
                                .resultDate(documentDate != null ? documentDate : LocalDate.now())
                                .confidence(0.95)
                                .build());
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        return results;
    }

    @Override
    public String generateSummary(String redactedText, String language) {
        return null;
    }

    private LocalDate extractDate(String text) {
        Matcher matcher = DATE_PATTERN.matcher(text);
        if (matcher.find()) {
            String match = matcher.group().replace('/', '-').replace('.', '-');
            String[] parts = match.split("-");
            try {
                if (parts[0].length() == 4) { // yyyy-MM-dd
                    return LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
                } else if (parts[2].length() == 4) { // dd-MM-yyyy
                    return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                }
            } catch (Exception ignored) {}
        }
        return LocalDate.now();
    }
}
