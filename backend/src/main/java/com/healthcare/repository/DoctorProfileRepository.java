package com.healthcare.repository;

import com.healthcare.model.DoctorProfile;
import com.healthcare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {

    Optional<DoctorProfile> findByUser(User user);

    Optional<DoctorProfile> findByUser_Id(Long userId);

    List<DoctorProfile> findByUserIn(List<User> users);

    @Query("SELECT dp FROM DoctorProfile dp JOIN dp.user u WHERE u.isActive = true " +
           "AND (:doctorType IS NULL OR dp.doctorType = :doctorType) " +
           "AND (:specialization IS NULL OR LOWER(dp.specialization) LIKE LOWER(CONCAT('%', :specialization, '%'))) " +
           "AND (:minRating IS NULL OR dp.averageRating >= :minRating) " +
           "AND (:maxFee IS NULL OR dp.consultationFee <= :maxFee) " +
           "AND (:city IS NULL OR LOWER(dp.city) LIKE LOWER(CONCAT('%', :city, '%'))) " +
           "AND (:name IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :name, '%')))")
    List<DoctorProfile> searchDoctors(
            @Param("doctorType") DoctorProfile.DoctorType doctorType,
            @Param("specialization") String specialization,
            @Param("minRating") Double minRating,
            @Param("maxFee") BigDecimal maxFee,
            @Param("city") String city,
            @Param("name") String name
    );

    @Query("SELECT dp FROM DoctorProfile dp JOIN dp.user u WHERE u.isActive = true")
    List<DoctorProfile> findAllActive();
}
