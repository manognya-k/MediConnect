package com.cts.mfrp.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bills")
@Data
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal amount;

    /** CONSULTATION, VIDEO_CONSULTATION */
    @Column(length = 50, nullable = false)
    private String type;

    /** PENDING, PAID, WAIVED */
    @Column(length = 20, nullable = false)
    private String status;

    @Column(nullable = false)
    private LocalDate billDate;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
