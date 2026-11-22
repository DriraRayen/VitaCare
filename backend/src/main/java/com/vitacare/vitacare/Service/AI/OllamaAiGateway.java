package com.vitacare.vitacare.Service.AI;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vitacare.vitacare.DTO.ExtractedItemDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

@Component
@Primary
public class OllamaAiGateway implements AiGateway {

    @Value("${ai.mode:local}")
    private String aiMode;

    @Value("${ai.model:qwen2.5:7b}")
    private String model;

    @Value("${ai.base-url:http://localhost:11434}")
    private String baseUrl;

    @Value("${ai.num-ctx:4096}")
    private int numCtx;

    @Value("${ai.temperature:0}")
    private double temperature;

    private final OffAiGateway offAiGateway;
    private final ObjectMapper jsonMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public OllamaAiGateway(OffAiGateway offAiGateway) {
        this.offAiGateway = offAiGateway;
    }

    @Override
    public List<ExtractedItemDTO> extractTestResults(String redactedText, List<String> allowedCanonicalCodes) {
        if ("off".equalsIgnoreCase(aiMode)) {
            return offAiGateway.extractTestResults(redactedText, allowedCanonicalCodes);
        }

        // Try Ollama local model, with 1 retry on malformed JSON
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String responseJson = callOllamaChat(redactedText, allowedCanonicalCodes);
                if (responseJson != null && !responseJson.isBlank()) {
                    List<ExtractedItemDTO> items = parseOllamaResponse(responseJson);
                    if (!items.isEmpty()) {
                        return items;
                    }
                }
            } catch (Exception e) {
                System.err.println("Ollama extraction attempt " + attempt + " failed: " + e.getMessage());
            }
        }

        // Graceful fallback to deterministic extractor if Ollama is offline or unparseable
        return offAiGateway.extractTestResults(redactedText, allowedCanonicalCodes);
    }

    @Override
    public String generateSummary(String redactedText, String language) {
        if ("off".equalsIgnoreCase(aiMode)) {
            return null;
        }

        try {
            Map<String, Object> req = Map.of(
                    "model", model,
                    "stream", false,
                    "messages", List.of(
                            Map.of("role", "system", "content", "Summarize this document in plain " + language
                                    + " in 2–3 sentences. Only use facts from the source. Do not give diagnosis or treatment advice."),
                            Map.of("role", "user", "content", redactedText)
                    ),
                    "options", Map.of("temperature", 0.0, "num_ctx", numCtx)
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/chat"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonMapper.writeValueAsString(req)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = jsonMapper.readTree(response.body());
                return root.path("message").path("content").asText();
            }
        } catch (Exception e) {
            System.err.println("Ollama summary generation failed: " + e.getMessage());
        }

        return null;
    }

    private String callOllamaChat(String text, List<String> allowedCodes) throws Exception {
        String allowedStr = allowedCodes != null && !allowedCodes.isEmpty()
                ? String.join(", ", allowedCodes) : "NONE";

        String systemPrompt = """
                You are a medical laboratory result extraction system.
                Extract all test results from the provided medical report text into JSON.
                Instructions:
                - Extract only, do not interpret, do not invent values; return null if absent.
                - allowed canonical codes: [%s]. If a test matches an allowed code, include it, else set canonicalCode to null.
                - Return strict JSON format:
                {
                  "results": [
                    {
                      "rawTestName": "exact test name from text",
                      "canonicalCode": "code or null",
                      "value": 1.25,
                      "unit": "g/L",
                      "resultDate": "2026-10-15",
                      "confidence": 0.95,
                      "reportText": null
                    }
                  ]
                }
                """.formatted(allowedStr);

        Map<String, Object> req = new HashMap<>();
        req.put("model", model);
        req.put("stream", false);
        req.put("format", "json");
        req.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", text)
        ));
        req.put("options", Map.of(
                "temperature", temperature,
                "num_ctx", numCtx
        ));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/chat"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(jsonMapper.writeValueAsString(req)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            JsonNode root = jsonMapper.readTree(response.body());
            return root.path("message").path("content").asText();
        }
        return null;
    }

    private List<ExtractedItemDTO> parseOllamaResponse(String jsonContent) {
        List<ExtractedItemDTO> list = new ArrayList<>();
        try {
            JsonNode root = jsonMapper.readTree(jsonContent);
            JsonNode resultsArray = root.has("results") ? root.get("results") : (root.isArray() ? root : null);

            if (resultsArray != null && resultsArray.isArray()) {
                for (JsonNode node : resultsArray) {
                    String rawName = node.path("rawTestName").asText(null);
                    if (rawName == null || rawName.isBlank()) continue;

                    Double val = node.hasNonNull("value") ? node.get("value").asDouble() : null;
                    String unit = node.path("unit").asText(null);
                    String dateStr = node.path("resultDate").asText(null);
                    LocalDate date = null;
                    if (dateStr != null && !dateStr.isBlank()) {
                        try {
                            date = LocalDate.parse(dateStr.substring(0, Math.min(10, dateStr.length())));
                        } catch (Exception ignored) {}
                    }
                    double confidence = node.has("confidence") ? node.get("confidence").asDouble() : 0.8;
                    String reportText = node.path("reportText").asText(null);

                    list.add(ExtractedItemDTO.builder()
                            .rawTestName(rawName)
                            .canonicalCode(node.path("canonicalCode").asText(null))
                            .value(val)
                            .unit(unit)
                            .resultDate(date)
                            .confidence(confidence)
                            .reportText(reportText)
                            .build());
                }
            }
        } catch (Exception e) {
            System.err.println("JSON parse error from Ollama: " + e.getMessage());
        }
        return list;
    }
}
