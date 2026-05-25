package com.healthcare.repository;

import com.healthcare.model.DoctorReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DoctorReviewRepository extends JpaRepository<DoctorReview, Long> {

    List<DoctorReview> findByDoctor_IdOrderByCreatedAtDesc(Long doctorId);

    Optional<DoctorReview> findByPatient_IdAndAppointment_Id(Long patientId, Long appointmentId);

    @Query("SELECT AVG(r.rating) FROM DoctorReview r WHERE r.doctor.id = :doctorId")
    Double averageRatingByDoctorId(@Param("doctorId") Long doctorId);

    long countByDoctor_Id(Long doctorId);

    @Query("SELECT r.rating, COUNT(r) FROM DoctorReview r WHERE r.doctor.id = :doctorId GROUP BY r.rating ORDER BY r.rating DESC")
    List<Object[]> ratingDistribution(@Param("doctorId") Long doctorId);
}
