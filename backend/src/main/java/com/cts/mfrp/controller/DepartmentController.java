package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Department;
import com.cts.mfrp.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    @GetMapping
    public ResponseEntity<List<Department>> getAll() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<List<Department>> getByHospital(@PathVariable Integer hospitalId) {
        return ResponseEntity.ok(departmentRepository.findByHospitalHospitalId(hospitalId));
    }

    @PostMapping
    public ResponseEntity<Department> create(@RequestBody Department dept) {
        return ResponseEntity.ok(departmentRepository.save(dept));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Department> update(@PathVariable Integer id, @RequestBody Department dept) {
        dept.setDepartmentId(id);
        return ResponseEntity.ok(departmentRepository.save(dept));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Integer id) {
        try {
            departmentRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Cannot delete a department that has doctors assigned to it.");
        }
    }
}
