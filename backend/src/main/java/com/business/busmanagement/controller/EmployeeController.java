package com.business.busmanagement.controller;

import com.business.busmanagement.model.Employee; // Đã đổi thành model
import com.business.busmanagement.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;

    // 1. Lấy toàn bộ danh sách nhân sự cho trang quản lý
    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees() {
        return ResponseEntity.ok(employeeRepository.findAll());
    }

    // 2. Thêm mới một nhân sự (Tài xế hoặc Phụ xe)
    @PostMapping
    public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
        if (employee.getStatus() == null) {
            employee.setStatus(Employee.Status.ACTIVE); 
        }
        Employee savedEmployee = employeeRepository.save(employee);
        return ResponseEntity.ok(savedEmployee);
    }

    // 3. Lấy danh sách lọc theo loại nhân sự
    @GetMapping("/type/{type}")
    public ResponseEntity<List<Employee>> getEmployeesByType(@PathVariable String type) {
        return ResponseEntity.ok(employeeRepository.findByEmployeeType(Employee.EmployeeType.valueOf(type)));
    }
}