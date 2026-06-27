-- ============================================================
-- Add VNPay columns to orders table
-- ============================================================

ALTER TABLE `orders`
    ADD COLUMN `vnp_txn_ref` VARCHAR(100) NULL,
    ADD COLUMN `vnp_transaction_no` VARCHAR(50) NULL,
    ADD COLUMN `payment_method` VARCHAR(50) NULL;

-- Indexes for faster lookups during payment verification
CREATE INDEX idx_orders_vnp_txn_ref ON `orders`(`vnp_txn_ref`);
CREATE INDEX idx_orders_payment_status ON `orders`(`payment_status`);
