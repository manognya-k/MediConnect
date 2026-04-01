package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Hospital;
import com.cts.mfrp.service.HospitalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/hospitals")
@RequiredArgsConstructor
public class HospitalController {
    private final HospitalService hospitalService;

    @GetMapping
    public ResponseEntity<List<Hospital>> getAllHospitals() {
        return ResponseEntity.ok(hospitalService.getAllHospitals());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Hospital> getHospitalById(@PathVariable Integer id) {
        return ResponseEntity.ok(hospitalService.getHospitalById(id));
    }

    @PostMapping
    public ResponseEntity<Hospital> createHospital(@RequestBody Hospital hospital) {
        return ResponseEntity.ok(hospitalService.saveHospital(hospital));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Hospital> updateHospital(@PathVariable Integer id, @RequestBody Hospital hospital) {
        hospital.setHospitalId(id);
        return ResponseEntity.ok(hospitalService.saveHospital(hospital));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHospital(@PathVariable Integer id) {
        hospitalService.deleteHospital(id);
        return ResponseEntity.noContent().build();
    }
}
