// === Add to your existing OrderServiceImpl.java ===

import java.time.LocalDateTime;

@Override
public void updateVNPayTxnRef(String orderCode, String txnRef) {
    Order order = orderRepository.findByOrderCode(orderCode)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderCode));
    order.setVnpTxnRef(txnRef);
    order.setPaymentMethod("VNPAY");
    orderRepository.save(order);
}

@Override
public void updatePaymentSuccess(String orderCode, String transactionNo) {
    Order order = orderRepository.findByOrderCode(orderCode)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderCode));
    order.setPaymentStatus("PAID");
    order.setStatus("CONFIRMED");
    order.setVnpTransactionNo(transactionNo);
    order.setPaidAt(LocalDateTime.now());
    orderRepository.save(order);
}

@Override
public void updatePaymentFailed(String orderCode) {
    Order order = orderRepository.findByOrderCode(orderCode)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderCode));
    order.setPaymentStatus("FAILED");
    orderRepository.save(order);
}
