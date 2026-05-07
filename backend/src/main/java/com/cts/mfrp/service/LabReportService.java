package com.cts.mfrp.service;

import com.cts.mfrp.entity.LabReport;
import com.cts.mfrp.repository.LabReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LabReportService {
    private final LabReportRepository labReportRepository;

    public List<LabReport> getAllReports() {
        return labReportRepository.findAll();
    }

    public LabReport getReportById(Integer id) {
        return labReportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lab report not found"));
    }

    public List<LabReport> getReportsByPatient(Integer patientId) {
        return labReportRepository.findByPatientPatientId(patientId);
    }

    public LabReport saveReport(LabReport report) {
        return labReportRepository.save(report);
    }

    public void deleteReport(Integer id) {
        if (!labReportRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lab report not found");
        }
        labReportRepository.deleteById(id);
    }
}
