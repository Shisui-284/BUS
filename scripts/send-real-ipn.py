#!/usr/bin/env python3
"""
Test VNPay IPN end-to-end với payment thật.
Tạo hash theo cách VNPay verify:
- Sort params theo key alphabet
- URL-encode value (form-urlencode: + cho space)
- Hash bằng HMAC-SHA512 với secret
"""
import hmac
import hashlib
import urllib.parse

HASH_SECRET = "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT"
TXN_REF = "TICKET30_1782522717324"

# IPN params - simulate VNPay server-to-server callback
# Values are RAW (post servlet decode)
params = {
    "vnp_Amount": "100000000",
    "vnp_BankCode": "NCB",
    "vnp_CardType": "ATM",
    "vnp_OrderInfo": "Thanh toan ve xe #30",
    "vnp_PayDate": "20260627081500",
    "vnp_ResponseCode": "00",
    "vnp_TmnCode": "SY273SZH",
    "vnp_TransactionNo": "87654321",
    "vnp_TransactionStatus": "00",
    "vnp_TxnRef": TXN_REF,
}

# Build hash data: sort key, URL-encode value (form-urlencode: + for space)
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

# Build form body
form_parts = []
for k, v in params.items():
    form_parts.append(f"{k}={urllib.parse.quote_plus(v, safe='')}")
body = "&".join(form_parts)

# Send via curl
import subprocess
result = subprocess.run([
    "curl.exe", "-s", "-m", "15",
    "-X", "POST",
    "-H", "Content-Type: application/x-www-form-urlencoded",
    "-d", body,
    "https://machine-devoted-specially-zus.trycloudflare.com/api/public/payment/vnpay/ipn"
], capture_output=True, text=True)
print("\nResponse:", result.stdout)
print("Err:", result.stderr)