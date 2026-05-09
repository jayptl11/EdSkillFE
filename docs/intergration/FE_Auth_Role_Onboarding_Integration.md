# FE Integration - Auth & Role Onboarding

Tai lieu nay mo ta contract FE can dung cho Phase 1 Auth, email verification, session token va role onboarding.

Base URL mac dinh:

```text
/api/auth
```

JSON response dung camelCase.

## 1. Role va status

Role hop le cho public register:

```ts
type PublicRegisterRole = "learner" | "companion";
```

User co the co nhieu role cung luc:

```ts
roles: ("learner" | "companion" | "admin")[]
```

Luu y:

- FE chi cho user chon `learner`, `companion`, hoac ca hai khi dang ky.
- Khong gui `admin` tu public register.
- Tai khoan `suspended` se bi chan dang nhap, refresh token va protected APIs voi `ACCOUNT_SUSPENDED`.

## 2. Dang ky bang email

### POST `/api/auth/register`

Gui thong tin dang ky va role ban dau. Backend se gui OTP qua email. User chi duoc tao sau khi verify OTP thanh cong.

Request:

```json
{
  "email": "learner@example.com",
  "username": "learner01",
  "firstName": "An",
  "lastName": "Nguyen",
  "password": "Password123",
  "roles": ["learner", "companion"]
}
```

Validation FE nen check truoc:

- `email`: dung format email.
- `username`: 3-50 ky tu.
- `password`: toi thieu 8 ky tu, co it nhat 1 chu hoa, 1 chu thuong, 1 so.
- `roles`: bat buoc, khong rong, chi gom `learner`/`companion`, khong duplicate.

Success `200`:

```json
{
  "message": "Operation completed successfully"
}
```

Loi thuong gap:

- `409 EMAIL_EXISTS`
- `409 USERNAME_EXISTS`
- `400 INVALID_EMAIL_FORMAT`
- `400 INVALID_USERNAME`
- `400 INVALID_PASSWORD`
- `400 INVALID_ROLE`
- `429 OTP_RATE_LIMITED`

## 3. Xac thuc OTP

### POST `/api/auth/verify-otp`

Dung cho ca verify dang ky va verify OTP reset password.

Request:

```json
{
  "email": "learner@example.com",
  "otp": "123456"
}
```

Success khi verify dang ky `201`:

```json
{
  "purpose": "Register",
  "resetToken": null,
  "message": "Registration successful"
}
```

Success khi verify reset password OTP `201`:

```json
{
  "purpose": "ResetPassword",
  "resetToken": "JWT_RESET_TOKEN",
  "message": "OTP verified successfully"
}
```

Loi thuong gap:

- `400 INVALID_OTP`
- `400 INVALID_PURPOSE`
- `400 USER_EXISTS`
- `400 USER_NOT_FOUND`

### POST `/api/auth/resend-otp`

Request:

```json
{
  "email": "learner@example.com"
}
```

Success `200`:

```json
{
  "message": "Operation completed successfully"
}
```

Loi thuong gap:

- `400 USER_NOT_FOUND`
- `429 RESEND_RATE_LIMITED`
- `429 OTP_RATE_LIMITED`

## 4. Dang nhap va token

### POST `/api/auth/login`

`identifier` chap nhan email hoac username.

Request:

```json
{
  "identifier": "learner@example.com",
  "password": "Password123"
}
```

Success `200`:

```json
{
  "accessToken": "JWT_ACCESS_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "userId": "2f5d07de-62d1-4d57-a431-111111111111",
  "email": "learner@example.com",
  "username": "learner01",
  "lastLogin": "2026-05-09T15:30:00Z",
  "roles": ["learner", "companion"],
  "shouldPromptDailyReminderTime": false
}
```

FE nen luu:

- `accessToken`: gui trong header `Authorization: Bearer <accessToken>`.
- `refreshToken`: dung de lay token moi.
- `roles`: dung de dieu huong UI theo Learner/Companion/Admin.

Loi thuong gap:

- `400 INVALID_CREDENTIALS`
- `403 ACCOUNT_SUSPENDED`

### POST `/api/auth/login-google`

Google login hien tai tao user moi voi role mac dinh `learner`.

Request:

```json
{
  "idToken": "GOOGLE_ID_TOKEN"
}
```

Success `200`: cung shape voi login email.

Loi thuong gap:

- `400 INVALID_GOOGLE_TOKEN`
- `403 ACCOUNT_SUSPENDED`

### POST `/api/auth/refresh-token`

Request:

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

Success `200`: cung shape voi login email, gom access token moi va refresh token moi.

Loi thuong gap:

- `400 INVALID_REFRESH_TOKEN`
- `400 TOKEN_EXPIRED`
- `400 TOKEN_REUSE_DETECTED`
- `403 ACCOUNT_SUSPENDED`

FE behavior khuyen nghi:

- Khi API protected tra `401`, thu refresh token mot lan.
- Neu refresh thanh cong, retry request goc.
- Neu refresh fail, xoa token local va dua user ve login.
- Neu gap `TOKEN_REUSE_DETECTED`, xoa token local va bat user dang nhap lai.

### POST `/api/auth/logout`

Can header:

```http
Authorization: Bearer JWT_ACCESS_TOKEN
```

Request co the rong hoac gui refresh token de revoke dung session:

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

Success `200`:

```json
{
  "message": "Operation completed successfully"
}
```

FE nen xoa `accessToken`, `refreshToken`, user info va roles khoi local state sau khi logout thanh cong.

## 5. Quen mat khau

### POST `/api/auth/forgot-password`

Gui OTP reset password ve email.

Request:

```json
{
  "email": "learner@example.com"
}
```

Success `200`:

```json
{
  "message": "Operation completed successfully"
}
```

Sau do FE goi `/api/auth/verify-otp`; neu `purpose = "ResetPassword"`, lay `resetToken` de goi reset password.

### POST `/api/auth/reset-password`

Request:

```json
{
  "resetToken": "JWT_RESET_TOKEN",
  "newPassword": "NewPassword123"
}
```

Success `200`:

```json
{
  "message": "Operation completed successfully"
}
```

Loi thuong gap:

- `400 INVALID_TOKEN`
- `400 USER_NOT_FOUND`
- `400 INVALID_PASSWORD`

## 6. Error response format

Business error tu controller:

```json
{
  "errorCode": "EMAIL_EXISTS",
  "errorMessage": "Email already registered"
}
```

Validation error tu FluentValidation:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "property": "Roles",
      "message": "Roles must be learner, companion, or both",
      "errorCode": "INVALID_ROLE"
    }
  ]
}
```

Protected API khi account bi suspended:

```json
{
  "errorCode": "ACCOUNT_SUSPENDED",
  "errorMessage": "Account is suspended"
}
```

## 7. Flow FE khuyen nghi

Dang ky:

```text
Register form
  -> POST /api/auth/register
  -> OTP screen
  -> POST /api/auth/verify-otp
  -> Login screen
```

Dang nhap:

```text
Login form
  -> POST /api/auth/login
  -> Save accessToken, refreshToken, userId, email, username, roles
  -> Redirect theo roles
```

Redirect theo roles:

```ts
if (roles.includes("admin")) {
  // admin dashboard
} else if (roles.includes("companion")) {
  // companion dashboard or role switcher
} else {
  // learner home
}
```

Quen mat khau:

```text
Forgot password form
  -> POST /api/auth/forgot-password
  -> OTP screen
  -> POST /api/auth/verify-otp
  -> Reset password form with resetToken
  -> POST /api/auth/reset-password
  -> Login screen
```
