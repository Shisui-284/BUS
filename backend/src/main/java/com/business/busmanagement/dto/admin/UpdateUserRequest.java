package com.business.busmanagement.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    private String email;
    private String phone;
    private String fullName;
}
