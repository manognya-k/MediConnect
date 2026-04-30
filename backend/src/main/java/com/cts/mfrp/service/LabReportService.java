package com.cts.mfrp.service;

import com.cts.mfrp.entity.LabReport;
import com.cts.mfrp.repository.LabReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LabReportService {
    private final LabReportRepository labReportRepository;

    public List<LabReport> getAllReports() {
        return labReportRepository.findAll();
    }

    public LabReport getReportById(Integer id) {
        return labReportRepository.findById(id).orElse(null);
    }

    public List<LabReport> getReportsByPatient(Integer patientId) {
        return labReportRepository.findByPatientPatientId(patientId);
    }

    public List<LabReport> getReportsByDoctor(Integer doctorId) {
        return labReportRepository.findByDoctorDoctorId(doctorId);
    }

    public LabReport saveReport(LabReport report) {
        return labReportRepository.save(report);
    }

    public void deleteReport(Integer id) {
        labReportRepository.deleteById(id);
    }
}
