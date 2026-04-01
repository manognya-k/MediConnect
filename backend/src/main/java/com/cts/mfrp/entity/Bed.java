package com.cts.mfrp.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "beds")
@Data
public class Bed {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer bedId;
    
    @ManyToOne
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;
    
    private String ward;
    private Integer bedNumber;
    private String status;
    
    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;
}
