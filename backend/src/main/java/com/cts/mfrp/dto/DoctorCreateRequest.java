package com.cts.mfrp.dto;

import lombok.Data;

@Data
public class DoctorCreateRequest {
    private String name;
    private String email;
    private String phone;
    private String password;
    private String specialization;
    private String availabilityStatus;
    private Integer hospitalId;
    private Integer departmentId;
}
