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

    /** PENDING, PAID, WAIVED, OVERDUE */
    @Column(length = 20, nullable = false)
    private String status;

    @Column(nullable = false)
    private LocalDate billDate;

    /** Payment due date — auto-set to billDate + 30 days if not provided. */
    @Column
    private LocalDate dueDate;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @PrePersist
    private void setDefaults() {
        if (dueDate == null && billDate != null) {
            dueDate = billDate.plusDays(7);
        }
    }
}
