package com.healthcare.repository;

import com.healthcare.model.Appointment;
import com.healthcare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientOrderByAppointmentDateDesc(User patient);
    List<Appointment> findByDoctorOrderByAppointmentDateDesc(User doctor);
    List<Appointment> findByPatientIdOrderByAppointmentDateDesc(Long patientId);
    List<Appointment> findByDoctorIdOrderByAppointmentDateDesc(Long doctorId);

    List<Appointment> findByDoctorIdAndAppointmentDateAndStatusIn(
            Long doctorId, LocalDate date, List<Appointment.Status> statuses);

    boolean existsByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
            Long doctorId, LocalDate date, java.time.LocalTime time, List<Appointment.Status> statuses);

    boolean existsByPatientIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
            Long patientId, LocalDate date, java.time.LocalTime time, List<Appointment.Status> statuses);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.status = 'PENDING'")
    long countPending();

    @Query("SELECT COUNT(a) FROM Appointment a")
    long countTotal();
}
