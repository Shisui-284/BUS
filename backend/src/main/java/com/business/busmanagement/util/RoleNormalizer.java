package com.business.busmanagement.util;

import java.util.Set;

public final class RoleNormalizer {

    private static final Set<String> INTERNAL_ROLES = Set.of(
            "DISPATCHER",
            "MANAGER",
            "TECHNICIAN",
            "TICKET_AGENT",
            "DRIVER",
            "ASSISTANT",
            "STAFF"
    );

    private RoleNormalizer() {
    }

    public static String normalize(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return "STAFF";
        }

        String candidate = roleName.trim().toUpperCase();
        if ("ADMIN".equals(candidate) || "CUSTOMER".equals(candidate)) {
            return candidate;
        }

        if (INTERNAL_ROLES.contains(candidate)) {
            return "STAFF";
        }

        return candidate;
    }

    public static boolean isInternalRole(String roleName) {
        return INTERNAL_ROLES.contains(normalize(roleName)) || "STAFF".equals(normalize(roleName));
    }
}