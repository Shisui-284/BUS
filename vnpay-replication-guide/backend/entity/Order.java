// === Add these fields to your existing Order.java JPA entity ===

import jakarta.persistence.*;
import java.time.LocalDateTime;

// ... existing fields ...

@Column(name = "vnp_txn_ref", length = 100)
private String vnpTxnRef;           // Format: ORD-XXXXXXXX_timestamp

@Column(name = "vnp_transaction_no", length = 50)
private String vnpTransactionNo;     // VNPay's actual transaction number

@Column(name = "payment_method", length = 50)
private String paymentMethod;         // Set to "VNPAY" when initiated

// ... existing getters/setters ...
public String getVnpTxnRef() { return vnpTxnRef; }
public void setVnpTxnRef(String vnpTxnRef) { this.vnpTxnRef = vnpTxnRef; }
public String getVnpTransactionNo() { return vnpTransactionNo; }
public void setVnpTransactionNo(String vnpTransactionNo) { this.vnpTransactionNo = vnpTransactionNo; }
public String getPaymentMethod() { return paymentMethod; }
public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
