package com.healthcare.repository;

import com.healthcare.model.Billing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;

public interface BillingRepository extends JpaRepository<Billing, Long> {
    List<Billing> findByDoctorIdOrderByRequestedAtDesc(Long doctorId);
    List<Billing> findByPatientIdOrderByRequestedAtDesc(Long patientId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Billing b WHERE b.doctor.id = :doctorId AND b.status = 'PAID'")
    BigDecimal sumPaidByDoctorId(Long doctorId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Billing b WHERE b.doctor.id = :doctorId AND b.status = 'PENDING'")
    BigDecimal sumPendingByDoctorId(Long doctorId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Billing b WHERE b.patient.id = :patientId AND b.status = 'PAID'")
    BigDecimal sumPaidByPatientId(Long patientId);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Billing b WHERE b.patient.id = :patientId AND b.status = 'PENDING'")
    BigDecimal sumPendingByPatientId(Long patientId);
}
