package com.business.busmanagement.controller;

/* ============================================================
 * MAINTENANCE CONTROLLER — Module: Bảo trì xe
 * ============================================================ */

import com.business.busmanagement.model.Bus;
import com.business.busmanagement.model.Maintenance;
import com.business.busmanagement.repository.BusRepository;
import com.business.busmanagement.repository.MaintenanceRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/maintenance")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class MaintenanceController {

    private final MaintenanceRepository maintenanceRepository;
    private final BusRepository busRepository;

    @GetMapping
    public ResponseEntity<List<Maintenance>> getAllMaintenances(
            @RequestParam(required = false) Long busId,
            @RequestParam(required = false) Maintenance.MaintenanceStatus status) {
        
        List<Maintenance> maintenances;
        
        if (busId != null) {
            maintenances = maintenanceRepository.findByBusIdOrderByMaintenanceDateDesc(busId);
        } else if (status != null) {
            maintenances = maintenanceRepository.findByStatus(status);
        } else {
            maintenances = maintenanceRepository.findAll();
        }
        
        return ResponseEntity.ok(maintenances);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Maintenance> getMaintenanceById(@PathVariable Long id) {
        return maintenanceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Maintenance> createMaintenance(@Valid @RequestBody Map<String, Object> request) {
        Long busId = Long.valueOf(request.get("busId").toString());
        
        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new IllegalArgumentException("Bus not found"));
        
        Maintenance maintenance = new Maintenance();
        maintenance.setBus(bus);
        
        if (request.containsKey("description")) {
            maintenance.setDescription(request.get("description").toString());
        }
        if (request.containsKey("cost")) {
            maintenance.setCost(new java.math.BigDecimal(request.get("cost").toString()));
        }
        if (request.containsKey("maintenanceDate")) {
            maintenance.setMaintenanceDate(LocalDate.parse(request.get("maintenanceDate").toString()));
        }
        if (request.containsKey("status")) {
            maintenance.setStatus(Maintenance.MaintenanceStatus.valueOf(request.get("status").toString()));
        } else {
            maintenance.setStatus(Maintenance.MaintenanceStatus.SCHEDULED);
        }
        
        Maintenance saved = maintenanceRepository.save(maintenance);
        
        // Cập nhật ngày bảo trì cuối cùng của xe
        bus.setLastMaintenanceDate(LocalDate.now());
        busRepository.save(bus);
        
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Maintenance> updateMaintenance(
            @PathVariable Long id,
            @Valid @RequestBody Map<String, Object> request) {
        
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance not found"));
        
        if (request.containsKey("description")) {
            maintenance.setDescription(request.get("description").toString());
        }
        if (request.containsKey("cost")) {
            maintenance.setCost(new java.math.BigDecimal(request.get("cost").toString()));
        }
        if (request.containsKey("maintenanceDate")) {
            maintenance.setMaintenanceDate(LocalDate.parse(request.get("maintenanceDate").toString()));
        }
        if (request.containsKey("status")) {
            maintenance.setStatus(Maintenance.MaintenanceStatus.valueOf(request.get("status").toString()));
        }
        
        return ResponseEntity.ok(maintenanceRepository.save(maintenance));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMaintenance(@PathVariable Long id) {
        if (!maintenanceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        maintenanceRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Maintenance record deleted successfully"));
    }
}
