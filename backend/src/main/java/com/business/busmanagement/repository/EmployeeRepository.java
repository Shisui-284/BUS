package com.business.busmanagement.repository;

import com.business.busmanagement.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByUserId(Long userId);

    List<Employee> findByEmployeeType(Employee.EmployeeType employeeType);

    List<Employee> findByEmployeeTypeAndStatus(Employee.EmployeeType employeeType, Employee.EmployeeStatus status);

    List<Employee> findByStatus(Employee.EmployeeStatus status);
}