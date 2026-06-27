// === Add to your existing OrderService.java interface ===

public interface OrderService {
    // ... existing methods ...

    void updateVNPayTxnRef(String orderCode, String txnRef);
    void updatePaymentSuccess(String orderCode, String transactionNo);
    void updatePaymentFailed(String orderCode);
}
