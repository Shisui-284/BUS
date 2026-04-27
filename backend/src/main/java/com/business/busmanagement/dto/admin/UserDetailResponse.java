package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailResponse {

    private Long id;
    private String username;
    private String email;
    private String phone;
    private String role;
    private String status;
    private String fullName;
    private String employeeType;
    private LocalDateTime createdAt;
    private List<String> permissions;
}
