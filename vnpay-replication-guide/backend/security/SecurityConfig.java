// === Modify your existing SecurityConfig.java ===

// In your security configuration, add these two lines
// (adjust package names and paths to match your project):

// 1. VNPay create endpoint requires JWT authentication
.requestMatchers(
    org.springframework.http.HttpMethod.POST,
    "/api/v1/vnpay/create"
).authenticated()

// 2. IPN and Return endpoints are public (VNPay verifies via HMAC signature)
.requestMatchers(
    "/api/v1/vnpay/ipn",
    "/api/v1/vnpay/return"
).permitAll()
