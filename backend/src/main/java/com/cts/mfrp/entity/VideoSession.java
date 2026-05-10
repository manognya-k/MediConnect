package com.cts.mfrp.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_sessions")
@Data
public class VideoSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_code", unique = true, length = 20)
    private String sessionCode;

    @ManyToOne
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Integer durationMinutes;

    @Column(length = 20)
    private String status;   // COMPLETED, CANCELLED, NO_SHOW

    @CreationTimestamp
    private LocalDateTime createdAt;
}
