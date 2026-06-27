#!/usr/bin/env python3
"""
Test VNPay IPN hash verification với hash đúng.
Tạo hash theo cách VNPay verify:
- Sort params theo key alphabet
- Bỏ vnp_SecureHash và vnp_SecureHashType
- URL-encode value
- Hash bằng HMAC-SHA512 với secret
"""
import hmac
import hashlib
import urllib.parse

HASH_SECRET = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT"

# Simulate VNPay IPN params (RAW values như servlet decode)
params = {
    "vnp_Amount": "100000000",
    "vnp_BankCode": "NCB",
    "vnp_CardType": "ATM",
    "vnp_OrderInfo": "Thanh toan ve xe #29",
    "vnp_PayDate": "20260627074500",
    "vnp_ResponseCode": "00",
    "vnp_TmnCode": "SY273SZH",
    "vnp_TransactionNo": "12345678",
    "vnp_TransactionStatus": "00",
    "vnp_TxnRef": "TEST123",
}

# Build hash data: sort key, URL-encode value
sorted_keys = sorted(params.keys())
parts = []
for k in sorted_keys:
    v = params[k]
    parts.append(f"{k}={urllib.parse.quote_plus(v, safe='')}")
hash_data = "&".join(parts)
print("Hash data:", hash_data)

# Compute hash
secure_hash = hmac.new(
    HASH_SECRET.encode("utf-8"),
    hash_data.encode("utf-8"),
    hashlib.sha512
).hexdigest()
print("Computed hash:", secure_hash)

# Add to params
params["vnp_SecureHash"] = secure_hash

# Build form body (URL-encode value for HTTP body)
form_parts = []
for k, v in params.items():
    form_parts.append(f"{k}={urllib.parse.quote_plus(v, safe='')}")
body = "&".join(form_parts)
print("\nForm body:")
print(body)