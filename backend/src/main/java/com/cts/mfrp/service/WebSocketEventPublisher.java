package com.cts.mfrp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    /** Push an event to a specific user's personal queue. */
    public void publishToUser(Integer userId, String event, Object payload) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/" + event,
                payload
        );
    }

    /** Broadcast an event to all subscribers of a topic. */
    public void publishToAll(String event, Object payload) {
        messagingTemplate.convertAndSend("/topic/" + event, payload);
    }
}
