package com.cts.mfrp.controller;

import com.cts.mfrp.dto.AiChatRequestDto;
import com.cts.mfrp.service.AiContextService;
import com.cts.mfrp.service.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiAssistantController {

    private final GeminiService    geminiService;
    private final AiContextService aiContextService;

    /**
     * Unified AI chat endpoint.
     * Detects the caller's role from JWT, fetches their real DB data,
     * and injects it as context into the Gemini system prompt so the AI
     * can answer questions about actual appointments, patients, and lab results.
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(
            @RequestBody AiChatRequestDto request,
            Authentication auth) {

        String systemPrompt = resolveSystemPrompt(request.getSystemPrompt(), auth);
        String reply = geminiService.generateResponse(request.getMessages(), systemPrompt);
        return ResponseEntity.ok(Map.of("reply", reply));
    }

    private String resolveSystemPrompt(String clientPrompt, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return clientPrompt != null ? clientPrompt : GeminiService.SYSTEM_DOCTOR;
        }

        String email = auth.getName();
        String role  = auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("DOCTOR");

        String basePrompt;
        String dbContext;

        switch (role.toUpperCase()) {
            case "ADMIN" -> {
                basePrompt = GeminiService.SYSTEM_ADMIN;
                dbContext  = "";  // Admin context can be added later
            }
            case "PATIENT" -> {
                basePrompt = GeminiService.SYSTEM_PATIENT;
                dbContext  = aiContextService.buildPatientContext(email);
            }
            default -> {
                basePrompt = GeminiService.SYSTEM_DOCTOR;
                dbContext  = aiContextService.buildDoctorContext(email);
            }
        }

        // Override base with client-supplied prompt if provided, then append DB context
        String effective = (clientPrompt != null && !clientPrompt.isBlank()) ? clientPrompt : basePrompt;
        return dbContext.isBlank() ? effective : effective + "\n\n" + dbContext;
    }
}
