# EdSkill FE Integration - Formula Pricing V1

Tai lieu nay dung cho FE integration cua phan backend vua them trong release `Formula Pricing V1`.

Luu y ve scope:

- User prompt khong dua danh sach endpoint cu the.
- Vi vay tai lieu nay cover TOAN BO endpoint bi anh huong truc tiep boi Formula Pricing V1:
  - profile me + credential upload
  - admin skill base point cost
  - companion discovery/detail co pricing preview
  - create session offer
  - get session list/detail
  - book session voi `selectedDurationMinutes`

JSON conventions:

- Request/response dung `camelCase`
- Enum tra ve dang string
- Date time tra ve UTC ISO-8601
- Business error response:

```json
{
  "errorCode": "SOME_ERROR_CODE",
  "errorMessage": "Readable message"
}
```

- Validation error response tu middleware:

```json
{
  "statusCode": 422,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "property": "DurationOptions",
      "message": "Duration options are invalid.",
      "errorCode": "INVALID_DURATION_OPTIONS"
    }
  ]
}
```

Base URL trong tai lieu duoi day dung placeholder:

- `{{API_BASE_URL}}`

---

## 0. Common contracts FE can reuse

### 0.1. `SessionDto` field usage

Day la response chung duoc dung boi:

- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/{id}`
- `POST /api/sessions/{id}/book`

Field FE can use:

| Field | FE dung nhu the nao |
| --- | --- |
| `sessionId` | Dung de routing, action button, call cac endpoint tiep theo. Khong hien thi len UI. |
| `companionId` | Dung de so sanh current user / dieu huong den profile companion neu can. Khong hien thi truc tiep. |
| `learnerId` | Dung de xac dinh session da duoc book chua. Neu `null` tren available session thi FE hien thi nut book. |
| `skill` | Hien thi ten ky nang trong card/detail session. Label goi y: `Ky nang`. |
| `description` | Hien thi mo ta session. Neu `null` thi an block mo ta. |
| `deliveryMode` | Hien thi chip `Online` / `Offline`. Dung de quyet dinh co hien thi location va nut vao phong hoc hay khong. |
| `location` | Chi hien thi khi `deliveryMode = "Offline"`. Neu `null` thi an field dia diem. |
| `durationMinutes` | Khong dung lam source chinh de render option cho session formula chua duoc book. Voi session formula `Available`, field nay chi la thoi luong lon nhat duoc reserve cho conflict check. FE chi nen dung field nay de hien thi `thoi luong da chon` sau khi book thanh cong hoac voi legacy session. |
| `pointCost` | Dung de hien thi gia tong quat khi FE can 1 con so duy nhat. Rule quan trong: voi formula session chua book, day la `minLearnerChargePoints`, KHONG phai gia co dinh. Neu co `pricingPreview`, FE uu tien render range tu `pricingPreview` thay vi tin `pointCost` la final price. |
| `pricingModel` | Dung de phan biet `FormulaV1` va `LegacyManual`. Neu `FormulaV1`, FE phai render theo `durationOptions`, `pricingPreview`, `pricingBreakdown`. Neu `LegacyManual`, FE co the tiep tuc render nhu flow cu. |
| `durationOptions` | Source chinh de render dropdown/radio chon thoi luong tren formula session. Neu list rong va `pricingModel = "LegacyManual"` thi FE bo qua. |
| `selectedDurationMinutes` | Dung de hien thi `thoi luong da chon` sau khi learner book. Neu `null`, session chua co duration cu the duoc chon. |
| `pricingPreview` | Dung tren list/detail/chon session de render khoang gia va companion payout preview. Khong dung de tinh client-side, chi dung de hien thi. |
| `pricingBreakdown` | Dung de render final price breakdown sau khi booking thanh cong hoac khi session da co snapshot pricing. Neu `null` thi FE khong render breakdown chi tiet. |
| `scheduledAt` | Hien thi ngay gio session. Format goi y: `dd/MM/yyyy HH:mm`. |
| `status` | Dung de quyet dinh action button va badge trang thai. |
| `jitsiRoomId` | FE chi dung khi `deliveryMode = "Online"` va session da du dieu kien join. Neu `null` thi khong render link/phong hoc. |
| `actualStartAt`, `actualEndAt`, `actualDuration` | FE dung o man hinh session detail/history neu can hien thi lich su/summary. Neu `null` thi an. |
| `learnerConfirmed`, `companionConfirmed` | Dung de render progress/CTA trong flow confirm completion. |
| `cancelReason`, `cancelledAt` | Chi hien thi neu `status = "Cancelled"`. Neu `null` thi an. |
| `disbursedAt` | FE bo qua tren phan booking UI thong thuong. Chi dung neu co admin/history screen. |
| `createdAt`, `updatedAt` | FE bo qua field nay trong UI thong thuong. |

### 0.2. `SessionPricingPreviewDto` field usage

| Field | FE dung nhu the nao |
| --- | --- |
| `minCompanionPayoutPoints` | Khong can show cho learner booking UI co ban. Neu co companion pricing explainer, label goi y: `Companion nhan tu`. |
| `maxCompanionPayoutPoints` | Dung voi field tren de render range payout cho companion. |
| `minLearnerChargePoints` | Hien thi gia tu/toi thieu. Day la field FE nen uu tien de render card/list formula session. |
| `maxLearnerChargePoints` | Hien thi gia den/toi da. Neu `min = max` thi hien thi 1 gia duy nhat. |
| `minPlatformFeePoints` | FE thong thuong bo qua. Chi hien thi neu co man hinh giai thich pricing. |
| `maxPlatformFeePoints` | FE thong thuong bo qua. |

### 0.3. `SessionPricingBreakdownDto` field usage

| Field | FE dung nhu the nao |
| --- | --- |
| `learnerChargePoints` | Hien thi `Tong diem Learner tra`. Format so nguyen co phan cach hang nghin neu can. |
| `companionPayoutPoints` | Hien thi `Companion nhan`. |
| `platformFeePoints` | Hien thi `Phi nen tang`. |
| `skillBasePoints` | Hien thi trong tooltip/modal giai thich cong thuc. Neu `null` thi an dong nay. |
| `credentialBonusPoints` | Hien thi trong tooltip/modal giai thich cong thuc. Neu `null` thi an. |
| `durationMultiplierPercent` | Hien thi trong tooltip/modal giai thich cong thuc. Neu `75` thi FE co the render `x0.75`. |

### 0.4. `ProfileDto` field usage

| Field | FE dung nhu the nao |
| --- | --- |
| `userId` | Dung cho state va routing. Khong hien thi. |
| `displayName` | Hien thi ten profile. |
| `avatarUrl` | Hien thi avatar. Neu `null` thi dung avatar placeholder. |
| `bio` | Hien thi gioi thieu. Neu `null` thi hien thi empty state hoac an block. |
| `dateOfBirth` | Chi co tren `GET /api/profile/me`. Neu `null` thi form date de trong. |
| `phone` | Chi co tren `GET /api/profile/me`. Neu `null` thi form phone de trong. |
| `degreeUrl` | Chi co tren `GET /api/profile/me`. Day la credential dau tien de tuong thich flow cu. FE moi nen uu tien `credentialUrls`. |
| `credentialUrls` | Source chinh de render gallery/list chung chi tren profile cua chinh user. Voi public profile endpoint, field nay luon rong. |
| `credentialCount` | Hien thi so luong chung chi. Co the dung cho badge `x chung chi`. |
| `skillsToTeach` | Render list skill co the day. |
| `skillsToLearn` | Render list skill muon hoc. |
| `isPublic` | Dung cho switch Public profile. |
| `roles` | Dung de xac dinh hien thi CTA learner/companion/admin. |
| `totalSessions` | Hien thi thong ke profile/companion. |
| `lastActiveAt` | Neu `null` thi an. Neu co, render relative time neu muon. |
| `isCompanionOnboardingComplete` | Dung de enable/disable nut tao session, hien thi banner onboarding. |
| `missingCompanionProfileFields` | Hien thi checklist onboarding. Neu list rong thi an block checklist. |

---

## 1. `GET {{API_BASE_URL}}/api/profile/me`

### 1. Muc dich

- Lay profile day du cua user dang dang nhap.
- Dung o man hinh `My Profile`, `Edit Profile`, `Companion onboarding`, `Create session gate`.
- Goi `on mount` khi vao trang profile hoac khi mo modal edit profile.

### 2. Request

- Method: `GET`
- URL: `{{API_BASE_URL}}/api/profile/me`
- Headers:
  - `Authorization: Bearer <access_token>` bat buoc

Khong co query param, khong co body.

### 3. Response - FE can dung gi

- Response `200` dung `ProfileDto`.
- FE chi can dung cac field trong section `0.4`.
- Rule quan trong:
  - `credentialUrls` la source chinh de render danh sach chung chi.
  - `credentialCount` co the > 0 ngay ca khi FE chua render gallery.
  - `degreeUrl` la field tuong thich flow cu, khong nen dung lam source chinh neu co `credentialUrls`.

### 4. Trang thai UI can xu ly

- `200`:
  - Fill form profile.
  - Neu `isCompanionOnboardingComplete = false`, hien thi checklist tu `missingCompanionProfileFields`.
- `401 Unauthorized`:
  - Redirect ve login.
- `404 PROFILE_NOT_FOUND`:
  - Hien thi full-page error hoac redirect ve flow tao profile neu app co man hinh do.

### 5. Dieu kien BE xu ly FE can biet

- Endpoint nay tra private fields day du cho chinh chu tai khoan.
- `credentialUrls` co the rong.
- `missingCompanionProfileFields` duoc BE tu tinh, FE khong tu suy doan onboarding state.

### 6. Vi du

Happy path:

```http
GET /api/profile/me
Authorization: Bearer eyJ...
```

```json
{
  "userId": "2a9e7a90-c837-476e-b0fd-b04c87a1e1df",
  "displayName": "Nguyen Minh Anh",
  "avatarUrl": "https://cdn.edskill.test/avatar/2a9e7a90/avatar.jpg",
  "bio": "Companion day giao tiep tieng Anh",
  "dateOfBirth": "2001-08-20T00:00:00Z",
  "phone": "+84912345678",
  "degreeUrl": "https://cdn.edskill.test/degree/2a9e7a90/cert-1.pdf",
  "credentialUrls": [
    "https://cdn.edskill.test/degree/2a9e7a90/cert-1.pdf",
    "https://cdn.edskill.test/degree/2a9e7a90/cert-2.pdf"
  ],
  "credentialCount": 2,
  "skillsToTeach": ["Speaking", "Presentation"],
  "skillsToLearn": ["React"],
  "isPublic": true,
  "roles": ["learner", "companion"],
  "totalSessions": 4,
  "lastActiveAt": "2026-05-13T08:40:00Z",
  "isCompanionOnboardingComplete": true,
  "missingCompanionProfileFields": []
}
```

Common error:

```json
{
  "errorCode": "PROFILE_NOT_FOUND",
  "errorMessage": "Profile was not found."
}
```

---

## 2. `PUT {{API_BASE_URL}}/api/profile/me`

### 1. Muc dich

- Cap nhat profile user hien tai, bao gom danh sach `credentialUrls`.
- Dung o man hinh `Edit Profile`, `Companion onboarding`, `Companion setting`.
- Goi `on submit`.

### 2. Request

- Method: `PUT`
- URL: `{{API_BASE_URL}}/api/profile/me`
- Headers:
  - `Authorization: Bearer <access_token>` bat buoc
  - `Content-Type: application/json`

Body la partial update. FE CHI gui field user vua sua. Omitted field = BE giu nguyen.

| Field | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `displayName` | `string \| null` | Optional | Neu gui len: 2-50 ky tu sau trim, chi cho phep chu, so, dau cach | `"Nguyen Minh Anh"` |
| `bio` | `string \| null` | Optional | Neu gui len va khong null: max 500 | `"Companion day tieng Anh giao tiep"` |
| `dateOfBirth` | `string (ISO date) \| null` | Optional | Neu gui len: tu `1900-01-01` den hom nay | `"2001-08-20T00:00:00Z"` |
| `phone` | `string \| null` | Optional | Neu gui len va khong null: 8-20 ky tu, chi cho phep `0-9 + - ( )` va dau cach | `"+84912345678"` |
| `degreeUrl` | `string \| null` | Optional | Neu gui len: phai la public URL do BE phat hanh | `"https://cdn.edskill.test/degree/.../cert-1.pdf"` |
| `credentialUrls` | `string[] \| null` | Optional | Neu gui len: max 10 item, khong duoc trung, moi item phai la public URL do BE phat hanh | `["https://cdn.../cert-1.pdf","https://cdn.../cert-2.pdf"]` |
| `skillsToTeach` | `string[] \| null` | Optional | Neu gui len: max 20 item, khong rong, khong trung, moi item max 50 ky tu; ten phai map duoc voi skill catalog | `["Speaking", "Presentation"]` |
| `skillsToLearn` | `string[] \| null` | Optional | Rule giong `skillsToTeach` | `["React"]` |
| `avatarUrl` | `string \| null` | Optional | Neu gui len: phai la public URL do BE phat hanh | `"https://cdn.edskill.test/avatar/.../avatar.jpg"` |
| `isPublic` | `boolean` | Optional | Neu gui field nay thi bat buoc phai la boolean, khong duoc `null` | `true` |

### 3. Response - FE can dung gi

- Response `200` tra `ProfileDto`.
- Sau khi save thanh cong:
  - update local profile state bang response moi
  - dong modal/edit mode
  - refresh checklist onboarding bang `isCompanionOnboardingComplete` va `missingCompanionProfileFields`

Field FE can dung:

- `credentialUrls`:
  - Render lai gallery/file list.
- `credentialCount`:
  - Update badge so chung chi.
- `skillsToTeach`, `skillsToLearn`:
  - Render lai tag list.
- `isCompanionOnboardingComplete`:
  - Neu `true`, mo khoa CTA tao session.

### 4. Trang thai UI can xu ly

- `200`:
  - Toast success: `Cap nhat profile thanh cong`.
- `400 SKILL_NOT_FOUND`:
  - Hien thi inline error tai field skills: `Ky nang khong ton tai hoac da bi xoa`.
- `400 SKILL_INACTIVE`:
  - Inline error field skills: `Ky nang da ngung hoat dong`.
- `400 DUPLICATE_SKILL_SELECTION`:
  - Inline error field skills: `Khong duoc chon trung ky nang`.
- `400 INVALID_CREDENTIAL_URLS`:
  - Inline error field chung chi: `Danh sach chung chi khong hop le`.
- `404 PROFILE_NOT_FOUND`:
  - Full-page error hoac redirect.
- `422 VALIDATION_ERROR`:
  - Map `errors[].property` vao field tuong ung.
  - Goi y mapping:
    - `DisplayName` -> field ten hien thi
    - `Phone` -> field so dien thoai
    - `CredentialUrls` -> field upload chung chi
    - `SkillsToTeach` -> field ky nang day
    - `SkillsToLearn` -> field ky nang hoc
    - `AvatarUrl` -> field avatar
    - `DegreeUrl` -> field chung chi legacy

### 5. Dieu kien BE xu ly FE can biet

- Partial update theo field presence:
  - Khong gui field -> BE bo qua, khong doi gia tri.
- Clearing values:
  - Gui `bio: null` -> BE xoa bio.
  - Gui `phone: null` -> BE xoa phone.
  - Gui `avatarUrl: null` -> BE xoa avatar.
  - Gui `credentialUrls: null` hoac `[]` -> BE xoa toan bo credential, dong thoi `degreeUrl` cung bi dong bo theo list moi.
  - Gui `skillsToTeach: null` hoac `[]` -> BE xoa danh sach skill day.
  - Gui `skillsToLearn: null` hoac `[]` -> BE xoa danh sach skill hoc.
- `degreeUrl` chi con la compatibility field:
  - Neu FE moi da co `credentialUrls`, khuyen nghi FE bo qua `degreeUrl` trong request.
- BE tu normalize:
  - trim string
  - remove duplicate `credentialUrls`
  - map skill alias sang ten skill canon

### 6. Vi du

Happy path:

```http
PUT /api/profile/me
Authorization: Bearer eyJ...
Content-Type: application/json
```

```json
{
  "bio": "Companion day tieng Anh giao tiep",
  "credentialUrls": [
    "https://cdn.edskill.test/degree/u/cert-1.pdf",
    "https://cdn.edskill.test/degree/u/cert-2.pdf"
  ],
  "skillsToTeach": ["Speaking", "Presentation"],
  "isPublic": true
}
```

```json
{
  "userId": "2a9e7a90-c837-476e-b0fd-b04c87a1e1df",
  "displayName": "Nguyen Minh Anh",
  "avatarUrl": "https://cdn.edskill.test/avatar/2a9e7a90/avatar.jpg",
  "bio": "Companion day tieng Anh giao tiep",
  "dateOfBirth": "2001-08-20T00:00:00Z",
  "phone": "+84912345678",
  "degreeUrl": "https://cdn.edskill.test/degree/u/cert-1.pdf",
  "credentialUrls": [
    "https://cdn.edskill.test/degree/u/cert-1.pdf",
    "https://cdn.edskill.test/degree/u/cert-2.pdf"
  ],
  "credentialCount": 2,
  "skillsToTeach": ["Presentation", "Speaking"],
  "skillsToLearn": ["React"],
  "isPublic": true,
  "roles": ["learner", "companion"],
  "totalSessions": 4,
  "lastActiveAt": "2026-05-13T08:40:00Z",
  "isCompanionOnboardingComplete": true,
  "missingCompanionProfileFields": []
}
```

Common error:

```json
{
  "statusCode": 422,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "property": "CredentialUrls",
      "message": "Credential URLs are invalid",
      "errorCode": "INVALID_CREDENTIAL_URLS"
    }
  ]
}
```

---

## 3. `POST {{API_BASE_URL}}/api/profile/me/credential-upload-url`

### 1. Muc dich

- Xin pre-signed upload URL de FE upload file chung chi len object storage truoc khi goi `PUT /api/profile/me`.
- Dung o component upload chung chi trong `Edit Profile` / `Companion onboarding`.
- Goi ngay khi user chon file va FE can upload.

### 2. Request

- Method: `POST`
- URL: `{{API_BASE_URL}}/api/profile/me/credential-upload-url`
- Headers:
  - `Authorization: Bearer <access_token>` bat buoc
  - `Content-Type: application/json`

| Field | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | Required | khong rong | `"toeic-certificate.pdf"` |
| `contentType` | `string` | Required | mot trong: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | `"application/pdf"` |
| `fileSize` | `number` | Required | `> 0`, `<= 10485760` bytes | `5242880` |

### 3. Response - FE can dung gi

| Field | FE dung nhu the nao |
| --- | --- |
| `uploadUrl` | Dung de upload file binary truc tiep len storage. Khong hien thi len UI. |
| `publicUrl` | Sau khi upload thanh cong, dua URL nay vao `credentialUrls` trong `PUT /api/profile/me`. Khong can goi API khac de confirm file. |
| `objectKey` | FE bo qua field nay, chi giu de debug neu can. |
| `expiresAt` | FE dung de biet upload URL co han. Neu upload qua cham va het han thi xin URL moi. Khong can hien thi thong thuong. |

### 4. Trang thai UI can xu ly

- `200`:
  - FE thuc hien upload binary len `uploadUrl`.
- `401 Unauthorized`:
  - Redirect login.
- `422 VALIDATION_ERROR`:
  - Neu sai `contentType`: hien thi inline `Chi ho tro JPG, PNG, WEBP, PDF`.
  - Neu file qua lon: inline `File toi da 10MB`.

### 5. Dieu kien BE xu ly FE can biet

- Endpoint nay CHI cap upload URL, khong luu file vao profile.
- FE phai:
  1. goi endpoint nay
  2. upload file len `uploadUrl`
  3. neu upload thanh cong, lay `publicUrl`
  4. dua `publicUrl` vao `credentialUrls` khi save profile
- FE moi nen dung endpoint nay thay cho `degree-upload-url`.
- `degree-upload-url` van ton tai de tuong thich flow cu, nhung scope moi nen dung `credential-upload-url`.

### 6. Vi du

Happy path:

```json
{
  "fileName": "toeic-certificate.pdf",
  "contentType": "application/pdf",
  "fileSize": 5242880
}
```

```json
{
  "uploadUrl": "https://storage.example.com/presigned-upload",
  "publicUrl": "https://cdn.edskill.test/degree/2a9e7a90/toeic-certificate.pdf",
  "objectKey": "degree/2a9e7a90/abc123-toeic-certificate.pdf",
  "expiresAt": "2026-05-13T10:15:00Z"
}
```

Common error:

```json
{
  "statusCode": 422,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "property": "FileSize",
      "message": "Degree file size exceeds the maximum allowed size",
      "errorCode": "INVALID_DEGREE_FILE_SIZE"
    }
  ]
}
```

---

## 4. `GET {{API_BASE_URL}}/api/admin/skills`

### 1. Muc dich

- Lay danh sach skill cho trang admin quan ly skill va base point cost.
- Dung o man hinh `Admin Skill Management`.
- Goi `on mount`, `on search`, `on filter change`.

### 2. Request

- Method: `GET`
- URL: `{{API_BASE_URL}}/api/admin/skills?q=<query>&includeInactive=<bool>`
- Headers:
  - `Authorization: Bearer <admin_access_token>` bat buoc

| Query | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `q` | `string` | Optional | khong co rule length dac biet | `"speaking"` |
| `includeInactive` | `boolean` | Optional | default `false` | `true` |

### 3. Response - FE can dung gi

Response `200` la array `AdminSkillDto`.

| Field | FE dung nhu the nao |
| --- | --- |
| `id` | Dung cho update row, action menu. |
| `name` | Hien thi cot `Skill name`. |
| `slug` | Hien thi cot `Slug` hoac bo qua neu UI khong can. |
| `category` | Hien thi cot `Category`. Neu `null` thi render `-`. |
| `basePointCost` | Hien thi cot `Base points`. Day la field admin can chinh sua de Formula Pricing tinh gia. |
| `aliases` | Hien thi list alias hoac count alias. Neu rong thi render `-`. |
| `isActive` | Hien thi badge `Active` / `Inactive`, dung cho toggle/edit form. |

Neu list rong:

- Hien thi empty state `Khong co skill nao phu hop`.

### 4. Trang thai UI can xu ly

- `200`: render table.
- `401 Unauthorized`: redirect login.
- `403 Forbidden`: redirect hoac full-page `Ban khong co quyen truy cap`.

### 5. Dieu kien BE xu ly FE can biet

- Endpoint chi cho role `admin`.
- Da loc bo skill `isDeleted`.
- `includeInactive=false` se an skill inactive khoi list.

### 6. Vi du

Happy path:

```http
GET /api/admin/skills?q=speaking&includeInactive=true
Authorization: Bearer eyJ...
```

```json
[
  {
    "id": "c3b9a31c-123d-4c0f-a821-2b84613b7fe9",
    "name": "Speaking",
    "slug": "speaking",
    "category": "Communication",
    "basePointCost": 100,
    "aliases": ["Tieng Anh giao tiep"],
    "isActive": true
  }
]
```

Common error:

```json
{
  "errorCode": "FORBIDDEN",
  "errorMessage": "Forbidden"
}
```

---

## 5. `POST {{API_BASE_URL}}/api/admin/skills`

### 1. Muc dich

- Tao skill moi va dinh nghia `basePointCost` cho Formula Pricing.
- Dung o modal/form `Create skill` trong trang admin.
- Goi `on submit`.

### 2. Request

- Method: `POST`
- URL: `{{API_BASE_URL}}/api/admin/skills`
- Headers:
  - `Authorization: Bearer <admin_access_token>` bat buoc
  - `Content-Type: application/json`

| Field | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `name` | `string` | Required | khong rong, max 50 ky tu sau normalize | `"Speaking"` |
| `slug` | `string \| null` | Optional | neu gui len: max 100 ky tu; BE se auto normalize thanh slug | `"speaking"` |
| `category` | `string \| null` | Optional | max 100 ky tu | `"Communication"` |
| `basePointCost` | `number` | Required | `> 0` | `100` |
| `aliases` | `string[] \| null` | Optional | max 20 item, khong trung, khong duoc trung voi name | `["Tieng Anh giao tiep"]` |

### 3. Response - FE can dung gi

- Response `201` tra `AdminSkillDto`.
- FE dung de:
  - dong modal
  - append vao list hoac refetch table
  - hien thi `basePointCost` moi ngay lap tuc

### 4. Trang thai UI can xu ly

- `201`:
  - Toast success `Tao skill thanh cong`.
- `401 Unauthorized`: redirect login.
- `403 Forbidden`: an/man hinh khong co quyen.
- `409 SKILL_NAME_EXISTS`:
  - Inline error field name: `Ten skill da ton tai`.
- `409 SKILL_SLUG_EXISTS`:
  - Inline error field slug: `Slug da ton tai`.
- `409 SKILL_ALIAS_CONFLICT`:
  - Inline error field aliases: `Alias bi trung voi skill khac`.
- `422 VALIDATION_ERROR`:
  - `INVALID_SKILL_NAME` -> inline field name
  - `INVALID_SKILL_SLUG` -> inline field slug
  - `INVALID_SKILL_CATEGORY` -> inline field category
  - `INVALID_SKILL_BASE_POINTS` -> inline field base point cost
  - `INVALID_SKILL_ALIASES` -> inline field aliases

### 5. Dieu kien BE xu ly FE can biet

- Neu `slug` bo trong, BE tu sinh tu `name`. FE khong can tu build slug truoc.
- BE tu trim/normalize `name`, `slug`, `category`, `aliases`.
- `basePointCost` la field bat buoc moi. Khong co skill moi nao duoc tao ma thieu field nay.

### 6. Vi du

Happy path:

```json
{
  "name": "Speaking",
  "slug": null,
  "category": "Communication",
  "basePointCost": 100,
  "aliases": ["Tieng Anh giao tiep"]
}
```

```json
{
  "id": "c3b9a31c-123d-4c0f-a821-2b84613b7fe9",
  "name": "Speaking",
  "slug": "speaking",
  "category": "Communication",
  "basePointCost": 100,
  "aliases": ["Tieng Anh giao tiep"],
  "isActive": true
}
```

Common error:

```json
{
  "errorCode": "SKILL_ALIAS_CONFLICT",
  "errorMessage": "Skill conflicts with an existing skill."
}
```

---

## 6. `PATCH {{API_BASE_URL}}/api/admin/skills/{skillId}`

### 1. Muc dich

- Cap nhat skill admin, dac biet la `basePointCost`.
- Dung o modal `Edit skill`.
- Goi `on submit`.

### 2. Request

- Method: `PATCH`
- URL: `{{API_BASE_URL}}/api/admin/skills/{skillId}`
- Headers:
  - `Authorization: Bearer <admin_access_token>` bat buoc
  - `Content-Type: application/json`

Path param:

| Field | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `skillId` | `guid` | Required | phai la GUID hop le | `"c3b9a31c-123d-4c0f-a821-2b84613b7fe9"` |

Body la partial update. FE CHI gui field thay doi.

| Field | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `name` | `string` | Optional | neu gui len: khong rong, max 50 | `"Speaking Advanced"` |
| `slug` | `string` | Optional | neu gui len: khong rong, max 100; BE tu normalize thanh slug | `"speaking-advanced"` |
| `category` | `string \| null` | Optional | neu gui len va khong null: max 100 | `"Communication"` |
| `basePointCost` | `number` | Optional | neu gui len: bat buoc `> 0` | `120` |
| `aliases` | `string[] \| null` | Optional | neu gui len: max 20 item, khong trung | `["Public speaking"]` |
| `isActive` | `boolean` | Optional | neu gui len: true/false | `false` |

### 3. Response - FE can dung gi

- Response `200` tra `AdminSkillDto`.
- FE dung de thay row hien tai trong table va dong modal edit.

### 4. Trang thai UI can xu ly

- `200`: toast success `Cap nhat skill thanh cong`.
- `401 Unauthorized`: redirect login.
- `403 Forbidden`: an man hinh.
- `404 SKILL_NOT_FOUND`: toast hoac modal error `Skill khong ton tai`.
- `409 SKILL_NAME_EXISTS` / `SKILL_SLUG_EXISTS` / `SKILL_ALIAS_CONFLICT`:
  - inline error dung field lien quan.
- `422 VALIDATION_ERROR`:
  - xu ly giong endpoint create.

### 5. Dieu kien BE xu ly FE can biet

- Omitted field = khong doi.
- `category: null` neu gui len -> BE clear category.
- `aliases: null` neu gui len -> BE clear toan bo aliases.
- `basePointCost` neu gui len khong duoc `null`.
- BE tu normalize `slug` lai, FE khong can tin slug user typed ra la final slug.

### 6. Vi du

Happy path:

```json
{
  "basePointCost": 120,
  "isActive": true
}
```

```json
{
  "id": "c3b9a31c-123d-4c0f-a821-2b84613b7fe9",
  "name": "Speaking",
  "slug": "speaking",
  "category": "Communication",
  "basePointCost": 120,
  "aliases": ["Tieng Anh giao tiep"],
  "isActive": true
}
```

Common error:

```json
{
  "statusCode": 422,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "property": "BasePointCost",
      "message": "Skill base point cost must be greater than zero",
      "errorCode": "INVALID_SKILL_BASE_POINTS"
    }
  ]
}
```

---

## 7. `GET {{API_BASE_URL}}/api/companions/search`

### 1. Muc dich

- Tim danh sach companion public co session `Available` phu hop bo loc.
- Dung o man hinh `Companion discovery`, `Find companion by skill`.
- Goi `on mount`, `on filter submit`, `on pagination change`.

### 2. Request

- Method: `GET`
- URL:
  - `{{API_BASE_URL}}/api/companions/search?skillId=<guid>&deliveryMode=<Online|Offline>&location=<text>&page=<n>&limit=<n>`
- Headers:
  - Khong bat buoc auth.
  - Neu da login, token van co the gui len; BE se tu loai companion chinh minh khoi ket qua.

| Query | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `skillId` | `guid` | Required | GUID hop le | `"c3b9a31c-123d-4c0f-a821-2b84613b7fe9"` |
| `deliveryMode` | `"Online" \| "Offline"` | Optional | neu `Offline` thi `location` bat buoc | `"Offline"` |
| `location` | `string` | Optional | max 500; chi duoc gui khi `deliveryMode = "Offline"` | `"Ho Chi Minh"` |
| `page` | `number` | Optional | `> 0`, default `1` | `1` |
| `limit` | `number` | Optional | `1..100`, default `20` | `12` |

### 3. Response - FE can dung gi

Response `200` la `CompanionSearchResultDto`.

Field FE can dung:

| Field | FE dung nhu the nao |
| --- | --- |
| `data` | Render list companion card. Neu rong, hien thi empty state `Chua co companion phu hop`. |
| `total` | Dung cho pagination. |
| `page` | Dung sync UI pagination. |
| `limit` | Dung sync UI pagination/page size. |

Trong moi item:

| Field | FE dung nhu the nao |
| --- | --- |
| `companionId` | Dung de link sang detail companion. |
| `displayName` | Hien thi ten companion. |
| `avatarUrl` | Hien thi avatar; neu `null` dung placeholder. |
| `bio` | Hien thi short bio; neu `null` an hoac render `Chua cap nhat`. |
| `skillsToTeach` | Render tag list. |
| `avgRating` | Hien thi sao/rating summary. Neu `0` va `totalReviews = 0` thi render `Chua co danh gia`. |
| `totalReviews` | Hien thi so danh gia. |
| `matchingSessionCount` | Hien thi `x lich hoc phu hop`. |
| `lowestPointCost` | Hien thi gia tu/toi thieu tren card. Day la learner charge toi thieu. |
| `pricingPreview` | Dung de hien thi range gia neu session formula co nhieu duration. Neu `minLearnerChargePoints != maxLearnerChargePoints`, render dang `169 - 319 points`. |
| `nextScheduledAt` | Hien thi session gan nhat. Format `dd/MM/yyyy HH:mm`. |

### 4. Trang thai UI can xu ly

- `200`:
  - Neu `data = []`, hien thi empty state.
- `404 SKILL_NOT_FOUND`:
  - Toast hoac empty error state `Ky nang khong ton tai`.
- `422 VALIDATION_ERROR`:
  - Neu gui `location` sai voi `deliveryMode`, hien thi inline tren filter form.

### 5. Dieu kien BE xu ly FE can biet

- Chi tra companion:
  - co role `companion`
  - profile `isPublic = true`
  - co it nhat 1 session `Available` phu hop bo loc
- Neu current user da login va chinh user do la companion, BE se loai user do khoi list.
- `pricingPreview` la tong hop tren tat ca session matching cua companion, khong nhat thiet chi 1 session.

### 6. Vi du

Happy path:

```http
GET /api/companions/search?skillId=c3b9a31c-123d-4c0f-a821-2b84613b7fe9&deliveryMode=Offline&location=ho%20chi%20minh&page=1&limit=10
```

```json
{
  "data": [
    {
      "companionId": "5e16b88b-6a36-453d-b74d-0e28044a0f52",
      "displayName": "Nguyen Minh Anh",
      "avatarUrl": "https://cdn.edskill.test/avatar/u/1.jpg",
      "bio": "Companion day giao tiep tieng Anh",
      "skillsToTeach": ["Presentation", "Speaking"],
      "avgRating": 4.8,
      "totalReviews": 12,
      "matchingSessionCount": 3,
      "lowestPointCost": 169,
      "pricingPreview": {
        "minCompanionPayoutPoints": 135,
        "maxCompanionPayoutPoints": 255,
        "minLearnerChargePoints": 169,
        "maxLearnerChargePoints": 319,
        "minPlatformFeePoints": 34,
        "maxPlatformFeePoints": 64
      },
      "nextScheduledAt": "2026-05-15T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

Common error:

```json
{
  "errorCode": "SKILL_NOT_FOUND",
  "errorMessage": "Skill was not found."
}
```

---

## 8. `GET {{API_BASE_URL}}/api/companions/{companionId}`

### 1. Muc dich

- Lay chi tiet 1 companion public va danh sach session `Available` matching skill/filter.
- Dung o man hinh `Companion detail`.
- Goi `on mount` va `on review pagination change`.

### 2. Request

- Method: `GET`
- URL:
  - `{{API_BASE_URL}}/api/companions/{companionId}?skillId=<guid>&deliveryMode=<Online|Offline>&location=<text>&reviewPage=<n>&reviewLimit=<n>`
- Headers:
  - Khong bat buoc auth

| Query/Path | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `companionId` | `guid` | Required | GUID hop le | `"5e16b88b-6a36-453d-b74d-0e28044a0f52"` |
| `skillId` | `guid` | Required | GUID hop le | `"c3b9a31c-123d-4c0f-a821-2b84613b7fe9"` |
| `deliveryMode` | `"Online" \| "Offline"` | Optional | neu `Offline` thi `location` bat buoc | `"Online"` |
| `location` | `string` | Optional | max 500; chi duoc gui khi `deliveryMode = "Offline"` | `"District 1"` |
| `reviewPage` | `number` | Optional | `> 0`, default `1` | `1` |
| `reviewLimit` | `number` | Optional | `1..100`, default `10` | `5` |

### 3. Response - FE can dung gi

Response `200` la `CompanionDetailDto`.

| Field | FE dung nhu the nao |
| --- | --- |
| `companionId` | Dung cho state va action. |
| `displayName` | Hien thi header profile. |
| `avatarUrl` | Hien thi avatar; `null` -> placeholder. |
| `bio` | Hien thi gioi thieu. `null` -> an block. |
| `skillsToTeach` | Hien thi tag list. |
| `roles` | FE thong thuong bo qua tren public page. |
| `totalSessions` | Hien thi thong ke. |
| `lastActiveAt` | Co the render relative time; `null` -> an. |
| `avgRating` | Hien thi rating summary. |
| `totalReviews` | Hien thi tong so review. |
| `reviews` | Render list review + pagination. Neu `reviews.data = []`, hien thi empty state `Chua co danh gia`. |
| `sessions` | Render danh sach session available cua companion theo skill/filter dang xem. Moi item dung theo contract `SessionDto` o muc `0.1`. |

Trong `reviews.data`:

| Field | FE dung nhu the nao |
| --- | --- |
| `reviewId` | Key render list. |
| `rating` | Hien thi so sao. |
| `comment` | Hien thi noi dung review; neu `null` thi an comment text. |
| `reviewerDisplayName` | Hien thi ten reviewer. |
| `createdAt` | Hien thi ngay review. |

### 4. Trang thai UI can xu ly

- `200`:
  - Neu `sessions = []`, hien thi empty state `Companion hien chua co lich hoc phu hop`.
- `404 SKILL_NOT_FOUND`:
  - Toast hoac redirect ve man search.
- `404 PROFILE_NOT_FOUND`:
  - Hien thi 404 page.
- `403 PROFILE_PRIVATE`:
  - Hien thi message `Companion nay dang de profile private`.
- `422 VALIDATION_ERROR`:
  - inline filter error neu location/deliveryMode khong hop le.

### 5. Dieu kien BE xu ly FE can biet

- Endpoint chi mo cho public companion.
- `sessions` chi gom session `Available` matching `skillId` va filter.
- `pricingPreview` trong tung session co the la range. FE khong duoc gia dinh 1 session = 1 muc gia duy nhat neu `pricingModel = "FormulaV1"`.

### 6. Vi du

Happy path:

```json
{
  "companionId": "5e16b88b-6a36-453d-b74d-0e28044a0f52",
  "displayName": "Nguyen Minh Anh",
  "avatarUrl": "https://cdn.edskill.test/avatar/u/1.jpg",
  "bio": "Companion day giao tiep tieng Anh",
  "skillsToTeach": ["Presentation", "Speaking"],
  "roles": ["learner", "companion"],
  "totalSessions": 12,
  "lastActiveAt": "2026-05-13T08:40:00Z",
  "avgRating": 4.8,
  "totalReviews": 12,
  "reviews": {
    "data": [
      {
        "reviewId": "5f8494df-9733-4c2c-b638-0fdad66fd3ef",
        "rating": 5,
        "comment": "Rat de hieu",
        "reviewerDisplayName": "Tran Hoang Long",
        "createdAt": "2026-05-10T08:00:00Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 10
  },
  "sessions": [
    {
      "sessionId": "cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13",
      "companionId": "5e16b88b-6a36-453d-b74d-0e28044a0f52",
      "learnerId": null,
      "skill": "Speaking",
      "description": "Luyen phan xa giao tiep",
      "deliveryMode": "Online",
      "location": null,
      "durationMinutes": 60,
      "pointCost": 169,
      "pricingModel": "FormulaV1",
      "durationOptions": [45, 60],
      "selectedDurationMinutes": null,
      "pricingPreview": {
        "minCompanionPayoutPoints": 135,
        "maxCompanionPayoutPoints": 175,
        "minLearnerChargePoints": 169,
        "maxLearnerChargePoints": 219,
        "minPlatformFeePoints": 34,
        "maxPlatformFeePoints": 44
      },
      "pricingBreakdown": null,
      "scheduledAt": "2026-05-15T12:00:00Z",
      "status": "Available",
      "jitsiRoomId": null,
      "actualStartAt": null,
      "actualEndAt": null,
      "actualDuration": null,
      "learnerConfirmed": false,
      "companionConfirmed": false,
      "cancelReason": null,
      "cancelledAt": null,
      "disbursedAt": null,
      "createdAt": "2026-05-13T08:00:00Z",
      "updatedAt": "2026-05-13T08:00:00Z"
    }
  ]
}
```

Common error:

```json
{
  "errorCode": "PROFILE_PRIVATE",
  "errorMessage": "This profile is private."
}
```

---

## 9. `POST {{API_BASE_URL}}/api/sessions`

### 1. Muc dich

- Companion tao session offer moi theo Formula Pricing V1.
- Dung o man hinh `Create Session` cua companion.
- Goi `on submit`.

### 2. Request

- Method: `POST`
- URL: `{{API_BASE_URL}}/api/sessions`
- Headers:
  - `Authorization: Bearer <access_token>` bat buoc
  - `Content-Type: application/json`

| Field | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `skillId` | `guid` | Required | GUID hop le | `"c3b9a31c-123d-4c0f-a821-2b84613b7fe9"` |
| `description` | `string \| null` | Optional | max 2000 | `"Luyen giao tiep co ban"` |
| `deliveryMode` | `"Online" \| "Offline"` | Required | enum hop le | `"Online"` |
| `location` | `string \| null` | Optional | neu `Offline`: bat buoc, max 500; neu `Online`: khong duoc gui text | `"District 1, HCMC"` |
| `durationOptions` | `number[]` | Required | khong rong, khong trung, chi duoc chon trong `[30,45,60,90,120]` | `[45,60]` |
| `scheduledAt` | `string (ISO-8601)` | Required | phai la thoi gian tuong lai | `"2026-05-15T12:00:00Z"` |

### 3. Response - FE can dung gi

- Response `201` tra `SessionDto`.
- FE can dung:
  - `durationOptions` de render lai list duration trong preview/create success.
  - `pricingPreview` de hien thi khoang gia learner se thay.
  - `pointCost` chi de display gia toi thieu nhanh, KHONG phai gia final.
  - `pricingBreakdown` se `null` vi chua co learner chon duration.

### 4. Trang thai UI can xu ly

- `201`:
  - Toast success `Tao lich hoc thanh cong`.
  - Dieu huong sang session detail hoac back ve list.
- `400 INVALID_DURATION_OPTIONS`:
  - Inline error field duration: `Chi duoc chon 30, 45, 60, 90 hoac 120 phut va khong duoc trung`.
- `400 SKILL_BASE_POINTS_INVALID`:
  - Toast `Skill chua duoc cau hinh base point, lien he admin`.
- `404 SKILL_NOT_FOUND`:
  - Inline error field skill: `Ky nang khong ton tai`.
- `409 SESSION_TIME_CONFLICT`:
  - Inline error field scheduled time: `Khung gio nay trung voi lich khac`.
- `400 SESSION_LIMIT_REACHED`:
  - Toast `Ban da dat toi da so session trong ngay`.
- `422 COMPANION_PROFILE_INCOMPLETE`:
  - Hien thi banner/blocking modal onboarding va render checklist tu `GET /api/profile/me`.
- `403 FORBIDDEN`:
  - Neu user khong co role companion, an page/create CTA.

### 5. Dieu kien BE xu ly FE can biet

- Session moi sau release nay luon co `pricingModel = "FormulaV1"`.
- FE KHONG gui:
  - `pointCost`
  - `pricingModel`
  - `selectedDurationMinutes`
  - pricing breakdown fields
- BE tu tinh pricing preview dua tren:
  - `skill.basePointCost`
  - credential count trong profile companion
  - duration options
  - system markup 25%
- BE reserve conflict bang duration lon nhat trong `durationOptions`.

### 6. Vi du

Happy path:

```json
{
  "skillId": "c3b9a31c-123d-4c0f-a821-2b84613b7fe9",
  "description": "Luyen giao tiep co ban",
  "deliveryMode": "Online",
  "location": null,
  "durationOptions": [45, 60],
  "scheduledAt": "2026-05-15T12:00:00Z"
}
```

```json
{
  "sessionId": "cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13",
  "companionId": "5e16b88b-6a36-453d-b74d-0e28044a0f52",
  "learnerId": null,
  "skill": "Speaking",
  "description": "Luyen giao tiep co ban",
  "deliveryMode": "Online",
  "location": null,
  "durationMinutes": 60,
  "pointCost": 169,
  "pricingModel": "FormulaV1",
  "durationOptions": [45, 60],
  "selectedDurationMinutes": null,
  "pricingPreview": {
    "minCompanionPayoutPoints": 135,
    "maxCompanionPayoutPoints": 175,
    "minLearnerChargePoints": 169,
    "maxLearnerChargePoints": 219,
    "minPlatformFeePoints": 34,
    "maxPlatformFeePoints": 44
  },
  "pricingBreakdown": null,
  "scheduledAt": "2026-05-15T12:00:00Z",
  "status": "Available",
  "jitsiRoomId": null,
  "actualStartAt": null,
  "actualEndAt": null,
  "actualDuration": null,
  "learnerConfirmed": false,
  "companionConfirmed": false,
  "cancelReason": null,
  "cancelledAt": null,
  "disbursedAt": null,
  "createdAt": "2026-05-13T08:00:00Z",
  "updatedAt": "2026-05-13T08:00:00Z"
}
```

Common error:

```json
{
  "errorCode": "SESSION_TIME_CONFLICT",
  "errorMessage": "Session time conflicts with an existing session."
}
```

---

## 10. `GET {{API_BASE_URL}}/api/sessions`

### 1. Muc dich

- Lay danh sach session de render:
  - `My sessions` cua learner
  - `My session offers` cua companion
  - list available sessions ma current user co the xem
- Goi `on mount`, `on tab change`, `on pagination change`, `on filter change`.

### 2. Request

- Method: `GET`
- URL:
  - `{{API_BASE_URL}}/api/sessions?status=<SessionStatus>&role=<learner|companion>&page=<n>&limit=<n>`
- Headers:
  - `Authorization: Bearer <access_token>` bat buoc

| Query | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `status` | string | Optional | phai la mot trong `Available`, `Pending`, `Confirmed`, `InProgress`, `PendingReview`, `Completed`, `Cancelled`, `Disputed` | `"Available"` |
| `role` | string | Optional | nen chi gui `learner` hoac `companion` | `"companion"` |
| `page` | number | Optional | `> 0`, default `1` | `1` |
| `limit` | number | Optional | `1..100`, default `20` | `20` |

### 3. Response - FE can dung gi

- Response `200` la `SessionListDto`.
- `data` render list session card/table.
- `total`, `page`, `limit` dung cho pagination.
- Moi item dung theo `SessionDto` common contract.

Empty state:

- neu `data = []`:
  - tab learner: `Ban chua dat buoi hoc nao`
  - tab companion: `Ban chua tao lich hoc nao`
  - available list: `Chua co lich hoc phu hop`

### 4. Trang thai UI can xu ly

- `200`: render list.
- `400 SESSION_STATUS_INVALID`:
  - reset filter ve default, toast `Trang thai session khong hop le`.
- `401 Unauthorized`:
  - redirect login.
- `403 Forbidden`:
  - hiem gap voi endpoint nay neu token hop le; neu co thi hien thi access denied.
- `422 VALIDATION_ERROR`:
  - inline error pagination neu FE gui `page <= 0` hoac `limit` ngoai range.

### 5. Dieu kien BE xu ly FE can biet

- Neu `role` bo trong:
  - BE tra union cua:
    - session `Available`
    - session user la companion
    - session user la learner
- Neu `role = companion`:
  - chi tra session current user tao.
- Neu `role = learner`:
  - chi tra session current user da book.
- Voi formula session chua book:
  - `durationOptions` moi la source render option
  - `durationMinutes` la duration lon nhat reserve, khong phai final selected duration
  - `pricingBreakdown = null`

### 6. Vi du

Happy path:

```http
GET /api/sessions?role=companion&status=Available&page=1&limit=20
Authorization: Bearer eyJ...
```

```json
{
  "data": [
    {
      "sessionId": "cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13",
      "companionId": "5e16b88b-6a36-453d-b74d-0e28044a0f52",
      "learnerId": null,
      "skill": "Speaking",
      "description": "Luyen giao tiep co ban",
      "deliveryMode": "Online",
      "location": null,
      "durationMinutes": 60,
      "pointCost": 169,
      "pricingModel": "FormulaV1",
      "durationOptions": [45, 60],
      "selectedDurationMinutes": null,
      "pricingPreview": {
        "minCompanionPayoutPoints": 135,
        "maxCompanionPayoutPoints": 175,
        "minLearnerChargePoints": 169,
        "maxLearnerChargePoints": 219,
        "minPlatformFeePoints": 34,
        "maxPlatformFeePoints": 44
      },
      "pricingBreakdown": null,
      "scheduledAt": "2026-05-15T12:00:00Z",
      "status": "Available",
      "jitsiRoomId": null,
      "actualStartAt": null,
      "actualEndAt": null,
      "actualDuration": null,
      "learnerConfirmed": false,
      "companionConfirmed": false,
      "cancelReason": null,
      "cancelledAt": null,
      "disbursedAt": null,
      "createdAt": "2026-05-13T08:00:00Z",
      "updatedAt": "2026-05-13T08:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

Common error:

```json
{
  "errorCode": "SESSION_STATUS_INVALID",
  "errorMessage": "Session status is invalid."
}
```

---

## 11. `GET {{API_BASE_URL}}/api/sessions/{id}`

### 1. Muc dich

- Lay chi tiet 1 session.
- Dung o man hinh `Session detail`, `Booking confirmation`, `Companion manage session`.
- Goi `on mount`.

### 2. Request

- Method: `GET`
- URL: `{{API_BASE_URL}}/api/sessions/{id}`
- Headers:
  - `Authorization: Bearer <access_token>` bat buoc

| Param | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `id` | `guid` | Required | GUID hop le | `"cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13"` |

### 3. Response - FE can dung gi

- Response `200` tra `SessionDto`.
- FE dung theo common contract `0.1`, `0.2`, `0.3`.
- Rule render quan trong:
  - neu `pricingModel = "FormulaV1"` va `selectedDurationMinutes = null`:
    - render chooser tu `durationOptions`
    - render price range tu `pricingPreview`
    - KHONG render `pricingBreakdown`
  - neu `pricingBreakdown != null`:
    - render final breakdown
    - `pointCost` khi nay da la exact learner charge

### 4. Trang thai UI can xu ly

- `200`: render detail.
- `404 SESSION_NOT_FOUND`: show 404 state.
- `403 FORBIDDEN`: show access denied.
- `401 Unauthorized`: redirect login.

### 5. Dieu kien BE xu ly FE can biet

- Session `Available` co the duoc bat ky user dang login xem.
- Session khong phai `Available` chi learner hoac companion lien quan moi xem duoc.
- Voi formula session chua book, pricing preview duoc BE tinh dong o luc query. FE khong duoc tu tinh lai.

### 6. Vi du

Happy path:

```json
{
  "sessionId": "cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13",
  "companionId": "5e16b88b-6a36-453d-b74d-0e28044a0f52",
  "learnerId": null,
  "skill": "Speaking",
  "description": "Luyen giao tiep co ban",
  "deliveryMode": "Online",
  "location": null,
  "durationMinutes": 60,
  "pointCost": 169,
  "pricingModel": "FormulaV1",
  "durationOptions": [45, 60],
  "selectedDurationMinutes": null,
  "pricingPreview": {
    "minCompanionPayoutPoints": 135,
    "maxCompanionPayoutPoints": 175,
    "minLearnerChargePoints": 169,
    "maxLearnerChargePoints": 219,
    "minPlatformFeePoints": 34,
    "maxPlatformFeePoints": 44
  },
  "pricingBreakdown": null,
  "scheduledAt": "2026-05-15T12:00:00Z",
  "status": "Available",
  "jitsiRoomId": null,
  "actualStartAt": null,
  "actualEndAt": null,
  "actualDuration": null,
  "learnerConfirmed": false,
  "companionConfirmed": false,
  "cancelReason": null,
  "cancelledAt": null,
  "disbursedAt": null,
  "createdAt": "2026-05-13T08:00:00Z",
  "updatedAt": "2026-05-13T08:00:00Z"
}
```

Common error:

```json
{
  "errorCode": "FORBIDDEN",
  "errorMessage": "You do not have access to this session."
}
```

---

## 12. `POST {{API_BASE_URL}}/api/sessions/{id}/book`

### 1. Muc dich

- Learner book 1 session va chon duration cu the trong `durationOptions`.
- Dung o man hinh `Session detail` / `Booking modal`.
- Goi `on submit` sau khi user chon duration.

### 2. Request

- Method: `POST`
- URL: `{{API_BASE_URL}}/api/sessions/{id}/book`
- Headers:
  - `Authorization: Bearer <access_token>` bat buoc
  - `Content-Type: application/json`

Path param:

| Field | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `id` | `guid` | Required | GUID hop le | `"cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13"` |

Body:

| Field | Type | Required | Validate | Vi du |
| --- | --- | --- | --- | --- |
| `selectedDurationMinutes` | `number` | Required | phai nam trong `[30,45,60,90,120]`, va quan trong hon: phai thuoc `durationOptions` cua session do | `45` |

### 3. Response - FE can dung gi

- Response `200` tra `SessionDto`.
- FE dung:
  - `selectedDurationMinutes` -> hien thi duration da chon
  - `pricingBreakdown` -> hien thi final learner charge / companion payout / platform fee
  - `pointCost` -> exact learner charge sau booking
  - `status` -> session chuyen sang `Pending`
  - `learnerId` -> khong con `null`, dung de khoa nut book

### 4. Trang thai UI can xu ly

- `200`:
  - toast success `Dat buoi hoc thanh cong`
  - redirect sang session detail/history
- `400 INVALID_SELECTED_DURATION`:
  - inline error field duration: `Thoi luong ban chon khong hop le`.
- `400 INSUFFICIENT_POINTS`:
  - hien thi modal/toast `Ban khong du diem de dat buoi hoc`.
- `400 SELF_BOOKING`:
  - an nut book neu current user chinh la companion; neu van goi API thi toast `Khong the tu dat buoi hoc cua chinh minh`.
- `400 SESSION_NOT_AVAILABLE`:
  - toast `Session khong con san sang de dat`.
- `404 SESSION_NOT_FOUND`:
  - show 404 state.
- `404 SKILL_NOT_FOUND`:
  - toast `Session khong hop le vi skill da bi xoa/disable`.
- `404 PROFILE_NOT_FOUND`:
  - toast `Companion profile khong ton tai`.
- `403 FORBIDDEN`:
  - neu user khong co role learner.
- `422 VALIDATION_ERROR`:
  - neu FE gui body sai format/khong co `selectedDurationMinutes`.

### 5. Dieu kien BE xu ly FE can biet

- FE chi gui `selectedDurationMinutes`.
- FE KHONG gui price.
- BE tu tinh snapshot pricing cuoi cung tai thoi diem booking va hold points.
- Sau booking thanh cong:
  - `pricingBreakdown` moi xuat hien
  - `selectedDurationMinutes` moi co gia tri
  - `pointCost` tro thanh exact learner charge
- Voi legacy session ton tai tu du lieu cu:
  - endpoint van hoat dong
  - nhung `selectedDurationMinutes` van phai gui hop le theo validator; FE moi scope formula nen chi show duration picker khi `pricingModel = "FormulaV1"`

### 6. Vi du

Happy path:

```http
POST /api/sessions/cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13/book
Authorization: Bearer eyJ...
Content-Type: application/json
```

```json
{
  "selectedDurationMinutes": 45
}
```

```json
{
  "sessionId": "cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13",
  "companionId": "5e16b88b-6a36-453d-b74d-0e28044a0f52",
  "learnerId": "4d8a86c9-b146-4f7f-95dd-1d3660d6d5d0",
  "skill": "Speaking",
  "description": "Luyen giao tiep co ban",
  "deliveryMode": "Online",
  "location": null,
  "durationMinutes": 45,
  "pointCost": 188,
  "pricingModel": "FormulaV1",
  "durationOptions": [45, 60],
  "selectedDurationMinutes": 45,
  "pricingPreview": {
    "minCompanionPayoutPoints": 150,
    "maxCompanionPayoutPoints": 150,
    "minLearnerChargePoints": 188,
    "maxLearnerChargePoints": 188,
    "minPlatformFeePoints": 38,
    "maxPlatformFeePoints": 38
  },
  "pricingBreakdown": {
    "learnerChargePoints": 188,
    "companionPayoutPoints": 150,
    "platformFeePoints": 38,
    "skillBasePoints": 100,
    "credentialBonusPoints": 75,
    "durationMultiplierPercent": 75
  },
  "scheduledAt": "2026-05-15T12:00:00Z",
  "status": "Pending",
  "jitsiRoomId": null,
  "actualStartAt": null,
  "actualEndAt": null,
  "actualDuration": null,
  "learnerConfirmed": false,
  "companionConfirmed": false,
  "cancelReason": null,
  "cancelledAt": null,
  "disbursedAt": null,
  "createdAt": "2026-05-13T08:00:00Z",
  "updatedAt": "2026-05-13T08:10:00Z"
}
```

Common error:

```json
{
  "errorCode": "INSUFFICIENT_POINTS",
  "errorMessage": "Insufficient."
}
```

---

## 13. FE implementation checklist cho release nay

1. Form create session:
   - Bo field nhap `pointCost` thu cong.
   - Them multi-select/radio cho `durationOptions`.
   - Chi cho chon `30,45,60,90,120`.

2. Session card/detail:
   - Neu `pricingModel = "FormulaV1"`:
     - render range gia tu `pricingPreview`
     - render duration option tu `durationOptions`
     - khong xem `pointCost` la gia co dinh neu `selectedDurationMinutes = null`

3. Booking flow:
   - Bat buoc co UI chon `selectedDurationMinutes` truoc khi goi `/book`.
   - Sau booking thanh cong, render `pricingBreakdown`.

4. Companion discovery/detail:
   - Hien thi `lowestPointCost` hoac `pricingPreview.minLearnerChargePoints`.
   - Neu `min != max`, render range gia.

5. Profile:
   - Dung `credential-upload-url` cho upload moi.
   - Dung `credentialUrls` lam source chinh thay cho `degreeUrl`.
   - Hien thi `credentialCount`.

6. Admin skills:
   - Them cot/form `basePointCost`.
   - Validate > 0 truoc khi submit de giam round-trip.
