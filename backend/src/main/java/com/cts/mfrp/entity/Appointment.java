package com.cts.mfrp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "appointments")
@Data
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer appointmentId;
    
    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;
    
    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;
    
    @ManyToOne
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;
    
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;
    private String status;
    private String appointmentType;
    private String sessionUrl;
}
