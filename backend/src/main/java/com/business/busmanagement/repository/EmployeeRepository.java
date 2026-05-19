package com.business.busmanagement.repository;

import com.business.busmanagement.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    // Hàm này giúp lọc danh sách riêng Tài xế hoặc Phụ xe
    List<Employee> findByEmployeeType(Employee.EmployeeType employeeType);

    // Lấy tài xế kinh nghiệm nhất
    @Query("SELECT e FROM Employee e WHERE e.employeeType = 'DRIVER' AND e.experienceYears IS NOT NULL ORDER BY e.experienceYears DESC")
    List<Employee> findTopDriversByExperience();
}