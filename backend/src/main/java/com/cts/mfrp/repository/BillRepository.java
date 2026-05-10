package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByPatientPatientId(Integer patientId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Bill b WHERE b.status IN ('PAID','PENDING') AND b.billDate BETWEEN :from AND :to")
    BigDecimal sumRevenueBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Bill b WHERE b.status IN ('PAID','PENDING')")
    BigDecimal sumTotalRevenue();
}
