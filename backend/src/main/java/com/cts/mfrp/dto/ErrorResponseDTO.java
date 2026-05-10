package com.cts.mfrp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ErrorResponseDTO {
    private String field;
    private String message;
    private int code;
}
