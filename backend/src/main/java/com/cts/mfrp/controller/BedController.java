package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Bed;
import com.cts.mfrp.service.BedService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/beds")
@RequiredArgsConstructor
public class BedController {
    private final BedService bedService;

    @GetMapping
    public ResponseEntity<List<Bed>> getAllBeds() {
        return ResponseEntity.ok(bedService.getAllBeds());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bed> getBedById(@PathVariable Integer id) {
        return ResponseEntity.ok(bedService.getBedById(id));
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<List<Bed>> getBedsByHospital(@PathVariable Integer hospitalId) {
        return ResponseEntity.ok(bedService.getBedsByHospital(hospitalId));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Bed>> getBedsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(bedService.getBedsByStatus(status));
    }

    @PostMapping
    public ResponseEntity<Bed> createBed(@RequestBody Bed bed) {
        return ResponseEntity.ok(bedService.saveBed(bed));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Bed> updateBed(@PathVariable Integer id, @RequestBody Bed bed) {
        bed.setBedId(id);
        // Preserve the existing patient assignment if the request doesn't include one
        if (bed.getPatient() == null) {
            Bed existing = bedService.getBedById(id);
            if (existing != null) {
                bed.setPatient(existing.getPatient());
            }
        }
        return ResponseEntity.ok(bedService.saveBed(bed));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBed(@PathVariable Integer id) {
        bedService.deleteBed(id);
        return ResponseEntity.noContent().build(); // FIXED: was ok()
    }
}
