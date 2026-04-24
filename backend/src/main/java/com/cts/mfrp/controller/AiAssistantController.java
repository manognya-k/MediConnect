package com.cts.mfrp.controller;

import com.cts.mfrp.dto.AiChatRequestDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiAssistantController {

    @Value("${anthropic.api.key:}")
    private String anthropicApiKey;

    private static final String ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
    private static final String DEFAULT_SYSTEM = """
            You are MediConnect AI, a clinical assistant. You help with:
            - Clinical queries and medical guidelines
            - Patient summary interpretation
            - Lab result analysis (lipid panels, ECG, troponin, HbA1c etc.)
            - Medication information and drug interactions
            - Appointment scheduling advice
            - ICD-10 coding assistance

            Be concise, professional, and clinically accurate. Always remind the doctor to apply their own clinical judgment.
            """;

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody AiChatRequestDto request) {
        if (anthropicApiKey == null || anthropicApiKey.isBlank()) {
            Map<String, Object> err = new HashMap<>();
            err.put("reply", "AI service is not configured. Please set anthropic.api.key in application.properties.");
            return ResponseEntity.ok(err);
        }

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", anthropicApiKey);
            headers.set("anthropic-version", "2023-06-01");

            String systemPrompt = (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank())
                    ? request.getSystemPrompt()
                    : DEFAULT_SYSTEM;

            Map<String, Object> body = new HashMap<>();
            body.put("model", "claude-sonnet-4-20250514");
            body.put("max_tokens", 1000);
            body.put("system", systemPrompt);
            body.put("messages", request.getMessages());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(ANTHROPIC_URL, entity, Map.class);

            String reply = extractReply(response.getBody());
            Map<String, Object> result = new HashMap<>();
            result.put("reply", reply);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("reply", "AI service error. Please try again.");
            return ResponseEntity.ok(err);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractReply(Map body) {
        if (body == null) return "No response received.";
        Object content = body.get("content");
        if (content instanceof List<?> list && !list.isEmpty()) {
            Object first = list.get(0);
            if (first instanceof Map<?, ?> block) {
                Object text = block.get("text");
                if (text != null) return text.toString();
            }
        }
        return "No response received.";
    }
}
