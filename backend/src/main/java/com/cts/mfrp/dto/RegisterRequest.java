package com.cts.mfrp.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class RegisterRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String phone;
    private String role; // PATIENT, DOCTOR, ADMIN
    private LocalDate dateOfBirth;
    private String bloodGroup;
    private String gender;
    private String specialization;
    private Integer hospitalId;
    private Integer departmentId;
    private String availabilityStatus;
}
