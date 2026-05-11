package com.cts.mfrp.service;

import com.cts.mfrp.dto.AiChatRequestDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
public class GeminiService {

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    // ── Role-specific system prompts ──────────────────────────────────────────

    public static final String SYSTEM_ADMIN =
            "You are MediConnect AI, a hospital operations assistant for administrators. " +
            "Help with: hospital analytics and KPIs, bed and resource management, " +
            "staff scheduling, supply chain queries, revenue summaries, and multi-branch administration. " +
            "Be concise, data-driven, and professional.";

    public static final String SYSTEM_DOCTOR =
            "You are MediConnect AI, a clinical workflow assistant for doctors. " +
            "Help with: clinical queries, medical guidelines, lab result analysis (lipid panels, ECG, troponin, HbA1c), " +
            "medication information, drug interactions, ICD-10 coding, and appointment scheduling. " +
            "Be concise and clinically accurate. Always remind the doctor to apply their own clinical judgment.";

    public static final String SYSTEM_PATIENT =
            "You are MediConnect AI, a personal healthcare support assistant for patients. " +
            "Help with: understanding symptoms, explaining medical test results in plain language, " +
            "medication reminders and side effects, appointment tips, and general health guidance. " +
            "Always remind the patient to consult their doctor for personalised medical advice. " +
            "Never replace professional medical consultation. Use simple, clear language.";

    private final RestTemplate restTemplate;

    @Value("${gemini.api.key:}")
    private String apiKey;

    public GeminiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Sends a conversation to Gemini 1.5 Flash and returns the reply text.
     * The system prompt is prepended to the first user message so no
     * system_instruction field is needed — compatible with all Gemini tiers.
     */
    public String generateResponse(List<AiChatRequestDto.MessageDto> messages, String systemPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GeminiService: gemini.api.key is not configured");
            return "AI assistant temporarily unavailable.";
        }
        if (messages == null || messages.isEmpty()) {
            log.warn("GeminiService: empty messages list received");
            return "AI assistant temporarily unavailable.";
        }

        try {
            String system = (systemPrompt != null && !systemPrompt.isBlank()) ? systemPrompt : SYSTEM_DOCTOR;

            // Build Gemini contents — Gemini uses "model" not "assistant"
            List<Map<String, Object>> contents = buildContents(messages, system);
            if (contents.isEmpty()) {
                return "AI assistant temporarily unavailable.";
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", contents);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String url = GEMINI_URL + apiKey;
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            log.debug("GeminiService: calling Gemini with {} message(s)", contents.size());
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return extractReply(response.getBody());

        } catch (HttpClientErrorException e) {
            log.error("GeminiService HTTP {} — body: {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode().value() == 429) {
                return "AI quota exceeded. Please try again later or contact your administrator to update the API key.";
            }
            if (e.getStatusCode().value() == 400) {
                return "AI assistant could not process this request. Please rephrase and try again.";
            }
            return "AI assistant temporarily unavailable.";
        } catch (Exception e) {
            log.error("GeminiService error [{}]: {}", e.getClass().getSimpleName(), e.getMessage());
            return "AI assistant temporarily unavailable.";
        }
    }

    /**
     * Converts the message list into Gemini-format contents.
     * Gemini requires the conversation to START with a 'user' turn — any
     * leading 'model' messages (e.g. system-prompt entries stored in history)
     * are skipped. The system prompt is injected into the first real user turn.
     */
    private List<Map<String, Object>> buildContents(
            List<AiChatRequestDto.MessageDto> messages, String system) {

        List<Map<String, Object>> contents = new ArrayList<>();
        boolean systemInjected = false;
        boolean firstUserSeen  = false;

        for (AiChatRequestDto.MessageDto msg : messages) {
            if (msg == null || msg.getContent() == null || msg.getContent().isBlank()) continue;

            String role = "assistant".equalsIgnoreCase(msg.getRole()) ? "model" : "user";
            String text = msg.getContent();

            // Skip any leading 'model' turns — Gemini rejects conversations that
            // don't start with 'user'. These are typically system-prompt entries
            // stored in the frontend's conversationHistory as 'assistant'.
            if ("model".equals(role) && !firstUserSeen) continue;

            if ("user".equals(role)) {
                firstUserSeen = true;
                // Inject the system context into the very first user message
                if (!systemInjected) {
                    text = "[SYSTEM] " + system + "\n\n[USER] " + text;
                    systemInjected = true;
                }
            }

            Map<String, Object> part = new HashMap<>();
            part.put("text", text);

            List<Object> parts = new ArrayList<>();
            parts.add(part);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("role", role);
            entry.put("parts", parts);
            contents.add(entry);
        }

        // If there are no user messages at all, return empty so caller can short-circuit
        return firstUserSeen ? contents : new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    private String extractReply(Map<?, ?> body) {
        if (body == null) {
            log.warn("GeminiService: null response body");
            return "AI assistant temporarily unavailable.";
        }
        try {
            List<?> candidates = (List<?>) body.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                log.warn("GeminiService: no candidates — keys: {}", body.keySet());
                return "AI assistant temporarily unavailable.";
            }
            Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
            Map<?, ?> content   = (Map<?, ?>) candidate.get("content");
            if (content == null) return "AI assistant temporarily unavailable.";
            List<?> parts = (List<?>) content.get("parts");
            if (parts == null || parts.isEmpty()) return "AI assistant temporarily unavailable.";
            Object text = ((Map<?, ?>) parts.get(0)).get("text");
            return text != null ? text.toString().trim() : "AI assistant temporarily unavailable.";
        } catch (Exception e) {
            log.error("GeminiService: parse error: {} — body keys: {}", e.getMessage(), body.keySet());
            return "AI assistant temporarily unavailable.";
        }
    }
}
