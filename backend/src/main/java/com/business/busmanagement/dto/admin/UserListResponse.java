package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserListResponse {

    private Long id;
    private String username;
    private String email;
    private String phone;
    private String role;
    private String status;
    private String fullName;
    private String employeeType;
    private LocalDateTime createdAt;
}
