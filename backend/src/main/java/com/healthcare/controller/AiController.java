package com.healthcare.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {
    
    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    @Value("${groq.api.model}")
    private String groqModel;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> body) {
        Object messageObj = body.get("messages");
        if (messageObj instanceof List) {
            return callGroq((List<Map<String, String>>) messageObj);
        } else {
            String singleMsg = (String) body.get("message");
            return callGroq(List.of(Map.of("role", "user", "content", singleMsg)));
        }
    }

    @PostMapping("/symptom-check")
    public ResponseEntity<?> symptomCheck(@RequestBody Map<String, String> body) {
        String symptoms = body.get("symptoms");
        String prompt = "As a medical AI assistant, analyze these symptoms: " + symptoms +
                ". Provide: 1) Possible conditions (general, not diagnosis) 2) Recommended actions 3) Urgency level (Low/Medium/High/Emergency). Always advise consulting a doctor.";
        return callGroq(List.of(Map.of("role", "user", "content", prompt)));
    }

    @PostMapping("/analyze-report")
    public ResponseEntity<?> analyzeReport(@RequestBody Map<String, String> body) {
        String reportData = body.get("reportData");
        String prompt = "As a medical AI, analyze this health report data: " + reportData +
                ". Provide a simple summary of: 1) Key findings 2) Values outside normal range 3) General recommendations. Note: This is not a medical diagnosis.";
        return callGroq(List.of(Map.of("role", "user", "content", prompt)));
    }

    @SuppressWarnings("unchecked")
    private ResponseEntity<?> callGroq(List<Map<String, String>> messages) {
        try {
            WebClient client = WebClient.create();

            Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", messages
            );

            Map<String, Object> response = client.post()
                .uri(groqApiUrl)
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            // Extract text from Groq/OpenAI response
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> choice = choices.get(0);
                Map<String, Object> message = (Map<String, Object>) choice.get("message");
                String text = (String) message.get("content");
                return ResponseEntity.ok(Map.of("response", text));
            }

            return ResponseEntity.ok(Map.of("response", "Unable to process request. Please try again."));

        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            return ResponseEntity.status(500).body(Map.of("error", "AI service error: " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "AI service unavailable: " + e.getMessage()));
        }
    }
}
