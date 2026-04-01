package com.cts.mfrp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "lab_reports")
@Data
public class LabReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer reportId;
    
    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;
    
    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;
    
    @ManyToOne
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;
    
    private String testName;
    private String result;
    private String reportUrl;
    private LocalDate reportDate;
}
