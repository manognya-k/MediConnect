package com.cts.mfrp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "chatbot_logs")
@Data
public class ChatbotLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer logId;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    private String query;
    private String response;
    private LocalDateTime createdAt;
}
