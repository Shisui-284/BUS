package com.business.busmanagement.util;

/* ============================================================
 * Chuẩn hóa role string (uppercase, trim, fallback CUSTOMER).
 * Tránh bug do frontend gửi role lệch ("admin", "Admin ", "ADMIN ")
 * ============================================================ */

public final class RoleNormalizer {

    private RoleNormalizer() {
    }

    public static String normalize(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return "CUSTOMER";
        }

        String candidate = roleName.trim().toUpperCase();
        if ("ADMIN".equals(candidate) || "CUSTOMER".equals(candidate)) {
            return candidate;
        }

        return candidate;
    }

    public static boolean isInternalRole(String roleName) {
        return false;
    }
}
