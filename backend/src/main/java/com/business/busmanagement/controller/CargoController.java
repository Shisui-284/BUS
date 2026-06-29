package com.business.busmanagement.controller;

/* ============================================================
 * CARGO CONTROLLER — Module: Quản lý hàng hóa (đính kèm theo chuyến)
 * ============================================================ */

import com.business.busmanagement.model.Cargo;
import com.business.busmanagement.model.Trip;
import com.business.busmanagement.repository.CargoRepository;
import com.business.busmanagement.repository.TripRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/cargo")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class CargoController {

    private final CargoRepository cargoRepository;
    private final TripRepository tripRepository;

    @GetMapping
    public ResponseEntity<List<Cargo>> getAllCargos(
            @RequestParam(required = false) Long tripId,
            @RequestParam(required = false) Cargo.CargoStatus status) {
        
        List<Cargo> cargos;
        
        if (tripId != null) {
            cargos = cargoRepository.findByTripId(tripId);
        } else if (status != null) {
            cargos = cargoRepository.findByStatus(status);
        } else {
            cargos = cargoRepository.findAll();
        }
        
        return ResponseEntity.ok(cargos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cargo> getCargoById(@PathVariable Long id) {
        return cargoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Cargo> createCargo(@Valid @RequestBody Map<String, Object> request) {
        Long tripId = Long.valueOf(request.get("tripId").toString());
        
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Trip not found"));
        
        Cargo cargo = new Cargo();
        cargo.setTrip(trip);
        cargo.setSenderName(request.get("senderName").toString());
        cargo.setReceiverName(request.get("receiverName").toString());
        cargo.setReceiverPhone(request.get("receiverPhone").toString());
        
        if (request.containsKey("cargoType")) {
            cargo.setCargoType(request.get("cargoType").toString());
        }
        if (request.containsKey("weight")) {
            cargo.setWeight(new java.math.BigDecimal(request.get("weight").toString()));
        }
        if (request.containsKey("fee")) {
            cargo.setFee(new java.math.BigDecimal(request.get("fee").toString()));
        } else {
            cargo.setFee(java.math.BigDecimal.ZERO);
        }
        
        cargo.setStatus(Cargo.CargoStatus.PENDING);
        
        return ResponseEntity.ok(cargoRepository.save(cargo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cargo> updateCargo(
            @PathVariable Long id,
            @Valid @RequestBody Map<String, Object> request) {
        
        Cargo cargo = cargoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cargo not found"));
        
        if (request.containsKey("senderName")) {
            cargo.setSenderName(request.get("senderName").toString());
        }
        if (request.containsKey("receiverName")) {
            cargo.setReceiverName(request.get("receiverName").toString());
        }
        if (request.containsKey("receiverPhone")) {
            cargo.setReceiverPhone(request.get("receiverPhone").toString());
        }
        if (request.containsKey("cargoType")) {
            cargo.setCargoType(request.get("cargoType").toString());
        }
        if (request.containsKey("weight")) {
            cargo.setWeight(new java.math.BigDecimal(request.get("weight").toString()));
        }
        if (request.containsKey("fee")) {
            cargo.setFee(new java.math.BigDecimal(request.get("fee").toString()));
        }
        if (request.containsKey("status")) {
            cargo.setStatus(Cargo.CargoStatus.valueOf(request.get("status").toString()));
        }
        
        return ResponseEntity.ok(cargoRepository.save(cargo));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Cargo> updateCargoStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        Cargo cargo = cargoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cargo not found"));
        
        String statusStr = request.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        
        cargo.setStatus(Cargo.CargoStatus.valueOf(statusStr.toUpperCase()));
        return ResponseEntity.ok(cargoRepository.save(cargo));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCargo(@PathVariable Long id) {
        if (!cargoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        cargoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Cargo deleted successfully"));
    }
}
