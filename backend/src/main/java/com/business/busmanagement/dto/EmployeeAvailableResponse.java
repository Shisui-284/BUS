package com.business.busmanagement.dto;

import com.business.busmanagement.model.Employee;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EmployeeAvailableResponse {
    private Long id;
    private String fullName;
    private Employee.EmployeeType employeeType;
}
