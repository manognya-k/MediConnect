package com.cts.mfrp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer notificationId;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    private String notificationType;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
