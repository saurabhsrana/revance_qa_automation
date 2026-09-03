# API enrollment — endpoint inventory

Factual notes from observed Loyalty QA traffic. Not a verified contract; use as a starting point for a future rewrite against backend/OpenAPI docs.

## Flow sequence

1. Check phone is not VoIP  
2. Send OTP to phone  
3. Submit phone on welcome (Svelte form action)  
4. Verify OTP  
5. Confirm phone on OTP confirmation (Svelte form action)  
6. Sign up customer  
7. Navigate profile-building → land on dashboard  

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/phone/check-voip` | Validate phone is eligible (non-VoIP) before OTP |
| POST | `/api/auth/phone-number/send-otp` | Send one-time code to the phone number |
| POST | `/welcome?/submitPhone` | SvelteKit form action that submits phone from the welcome page |
| POST | `/api/auth/phone-number/verify` | Verify the OTP code for the phone number |
| POST | `/otp-confirmation?/verifyPhone` | SvelteKit form action confirming phone after OTP |
| POST | `/api/customers/signup` | Create the loyalty customer / complete signup |
| GET | `/profile-building?destination=dashboard` → `/dashboard` | Post-signup profile-building route that redirects to the rewards dashboard |
