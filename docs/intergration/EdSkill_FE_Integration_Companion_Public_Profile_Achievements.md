# EdSkill FE Integration - Companion Public Profile + Achievements

Tai lieu nay danh cho FE tich hop man:

- public profile cua `companion`
- detail theo tung skill companion day
- CTA `Xem chi tiet` va `Dang ky`
- hien thi `thanh tich` o public profile va my profile
- admin quan ly achievement

Tai lieu nay viet de mot AI FE agent co the code truc tiep ma khong can suy doan them contract backend.

---

## 1. Scope backend da co

Backend da implement cac capability sau:

- `GET /api/companions/{companionId}/public-profile`
- `GET /api/companions/{companionId}/skills/{skillId}`
- `POST /api/sessions/{id}/book`
- `GET /api/profile/me` co them `achievements`
- `GET /api/profile/{userId}` co them `achievements`
- `GET /api/admin/achievements`
- `POST /api/admin/achievements`
- `PATCH /api/admin/achievements/{achievementId}`
- `POST /api/admin/achievements/icon-upload-url`

Compatibility:

- `GET /api/companions/{companionId}` van ton tai cho flow detail cu theo `skillId`
- man public profile moi nen dung endpoint `public-profile` moi, khong dung endpoint cu

Tai lieu nay cover:

- contract response/request
- quy uoc FE nen render
- flow click skill -> xem detail -> dang ky
- cach FE admin upload icon achievement va tao/sua achievement

Neu can them pricing chi tiet cua offer Formula V1 thi doc them:

- `docs/intergartion/EdSkill_FE_Integration_Formula_Pricing_V1.md`
- `docs/intergartion/EdSkill_FE_Update_Exact_Duration_Pricing.md`

Neu can icon cua skill catalog thi doc them:

- `docs/intergartion/EdSkill_FE_Integration_Skill_IconKey.md`

---

## 2. Business meaning FE can rely on

### 2.1. Public profile

- Public profile phai hien thi tat ca skill companion day tu `UserSkills`
- Skill van xuat hien du no chua co offer available
- FE khong tu loc lai skill theo `offerCount`

### 2.2. Skill detail

- Moi skill trong public profile co the mo man detail rieng
- Man detail lay offer theo dung `companionId + skillId`
- FE khong duoc truyen `skillName` de tim offer
- FE phai dung `skillId`

### 2.3. Booking

- CTA `Dang ky` cuoi cung van goi `POST /api/sessions/{sessionId}/book`
- FE phai lay `sessionId` tu `offers.data[]`
- Neu offer la Formula pricing, FE phai cho user chon `selectedDurationMinutes` truoc khi book

### 2.4. Achievements

- Achievement da earn moi duoc tra ve cho public profile va my profile
- FE khong tu tinh rule achievement
- Achievement co:
  - `achievementId`
  - `name`
  - `description`
  - `iconUrl`
  - `awardedAt`

---

## 3. Auth rules

### 3.1. Public endpoints

Khong can auth:

- `GET /api/companions/{companionId}/public-profile`
- `GET /api/companions/{companionId}/skills/{skillId}`
- `GET /api/profile/{userId}`

### 3.2. User auth endpoints

Can Bearer token:

- `GET /api/profile/me`
- `POST /api/sessions/{id}/book`

### 3.3. Admin auth endpoints

Can Bearer token role `admin`:

- `GET /api/admin/achievements`
- `POST /api/admin/achievements`
- `PATCH /api/admin/achievements/{achievementId}`
- `POST /api/admin/achievements/icon-upload-url`

---

## 4. TypeScript contracts FE nen dung

```ts
export interface AchievementSummaryDto {
  achievementId: string;
  name: string;
  description: string;
  iconUrl: string | null;
  awardedAt: string;
}

export interface CompanionActivitySummaryDto {
  totalSessions: number;
  totalTeachingHours: number;
  avgRating: number;
  totalReviews: number;
  lastActiveAt: string | null;
}

export interface CompanionTeachingSkillDto {
  skillId: string;
  name: string;
  iconKey: string | null;
  offerCount: number;
  startingPointCost: number | null;
  nextScheduledAt: string | null;
  hasAvailableOffers: boolean;
}

export interface CompanionPublicProfileDto {
  companionId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  roles: string[];
  activitySummary: CompanionActivitySummaryDto;
  achievements: AchievementSummaryDto[];
  teachingSkills: CompanionTeachingSkillDto[];
}

export interface CompanionSkillInfoDto {
  skillId: string;
  name: string;
  iconKey: string | null;
}

export interface CompanionReviewDto {
  reviewId: string;
  rating: number;
  comment: string | null;
  reviewerDisplayName: string;
  createdAt: string;
}

export interface CompanionReviewListDto {
  data: CompanionReviewDto[];
  total: number;
  page: number;
  limit: number;
}

export interface SessionPricingPreviewDto {
  minCompanionPayoutPoints: number;
  maxCompanionPayoutPoints: number;
  minLearnerChargePoints: number;
  maxLearnerChargePoints: number;
  minPlatformFeePoints: number;
  maxPlatformFeePoints: number;
}

export interface SessionPricingBreakdownDto {
  learnerChargePoints: number;
  companionPayoutPoints: number;
  platformFeePoints: number;
  skillBasePoints: number | null;
  credentialBonusPoints: number | null;
  durationMultiplierPercent: number | null;
}

export interface SessionDurationPricingOptionDto {
  durationMinutes: number;
  learnerChargePoints: number;
  companionPayoutPoints: number;
  platformFeePoints: number;
  durationMultiplierPercent: number;
  isSelected: boolean;
}

export interface SessionDto {
  sessionId: string;
  companionId: string;
  learnerId: string | null;
  skill: string;
  description: string | null;
  deliveryMode: "Online" | "Offline";
  location: string | null;
  durationMinutes: number;
  pointCost: number;
  pricingModel: "LegacyManual" | "FormulaV1";
  durationOptions: number[];
  durationPricingOptions: SessionDurationPricingOptionDto[];
  selectedDurationMinutes: number | null;
  pricingPreview: SessionPricingPreviewDto;
  pricingBreakdown: SessionPricingBreakdownDto | null;
  scheduledAt: string;
  status: string;
  jitsiRoomId: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  actualDuration: number | null;
  learnerConfirmed: boolean;
  companionConfirmed: boolean;
  cancelReason: string | null;
  cancelledAt: string | null;
  disbursedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListDto {
  data: SessionDto[];
  total: number;
  page: number;
  limit: number;
}

export interface CompanionSkillDetailDto {
  companionId: string;
  skill: CompanionSkillInfoDto;
  avgRating: number;
  totalReviews: number;
  offers: SessionListDto;
  reviews: CompanionReviewListDto;
}

export interface ProfileSkillDto {
  skillId: string;
  name: string;
  iconKey: string | null;
}

export interface ProfileDto {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  degreeUrl: string | null;
  credentialUrls: string[];
  credentialCount: number;
  skillsToTeach: string[];
  skillsToLearn: string[];
  teachingSkills: ProfileSkillDto[];
  learningSkills: ProfileSkillDto[];
  achievements: AchievementSummaryDto[];
  isPublic: boolean;
  roles: string[];
  totalSessions: number;
  lastActiveAt: string | null;
  isCompanionOnboardingComplete: boolean;
  missingCompanionProfileFields: string[];
}

export interface BookSessionRequest {
  selectedDurationMinutes: number;
}

export interface AdminAchievementDto {
  achievementId: string;
  name: string;
  description: string;
  iconUrl: string | null;
  track: "learner" | "companion";
  metric: "completed_sessions" | "completed_hours" | "distinct_completed_learners";
  threshold: number;
  sortOrder: number;
  isActive: boolean;
  effectiveFromUtc: string;
}

export interface AchievementIconUploadUrlDto {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresAt: string;
}

export interface GenerateAchievementIconUploadUrlRequest {
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  fileSize: number;
}

export interface CreateAchievementRequest {
  name: string;
  description: string;
  iconUrl: string | null;
  track: "learner" | "companion";
  metric: "completed_sessions" | "completed_hours" | "distinct_completed_learners";
  threshold: number;
  sortOrder: number;
}

export interface UpdateAchievementRequest {
  name?: string | null;
  description?: string | null;
  iconUrl?: string | null;
  track?: "learner" | "companion" | null;
  metric?: "completed_sessions" | "completed_hours" | "distinct_completed_learners" | null;
  threshold?: number | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}
```

---

## 5. Public companion profile API

### 5.1. Endpoint

```http
GET /api/companions/{companionId}/public-profile
```

### 5.2. Response 200

```json
{
  "companionId": "11111111-1111-1111-1111-111111111111",
  "displayName": "Tran Hoang",
  "avatarUrl": "https://cdn.edskill.test/avatar/u1.png",
  "bio": "Toi day speaking va presentation",
  "roles": ["learner", "companion"],
  "activitySummary": {
    "totalSessions": 12,
    "totalTeachingHours": 18,
    "avgRating": 4.8,
    "totalReviews": 33,
    "lastActiveAt": "2026-05-16T09:15:00Z"
  },
  "achievements": [
    {
      "achievementId": "22222222-2222-2222-2222-222222222222",
      "name": "Buoi day dau tien",
      "description": "Hoan thanh buoi day dau tien",
      "iconUrl": "https://cdn.edskill.test/achievement/icon-1.png",
      "awardedAt": "2026-05-10T12:00:00Z"
    }
  ],
  "teachingSkills": [
    {
      "skillId": "33333333-3333-3333-3333-333333333333",
      "name": "Speaking",
      "iconKey": "languages",
      "offerCount": 2,
      "startingPointCost": 75,
      "nextScheduledAt": "2026-05-18T08:00:00Z",
      "hasAvailableOffers": true
    },
    {
      "skillId": "44444444-4444-4444-4444-444444444444",
      "name": "React",
      "iconKey": "code",
      "offerCount": 0,
      "startingPointCost": null,
      "nextScheduledAt": null,
      "hasAvailableOffers": false
    }
  ]
}
```

### 5.3. FE rendering rules

- Luon render toan bo `teachingSkills`
- Khong an skill chi vi `offerCount = 0`
- Neu `hasAvailableOffers = false`:
  - van cho click vao skill detail neu muon show profile-level info
  - nhung FE nen disable/soft-disable CTA `Dang ky`
- `startingPointCost` la muc diem thap nhat learner can tra de book duoc mot option hop le
- `startingPointCost` co the khac `base points` cua skill

### 5.4. FE layout goi y

Public profile nen co 3 khoi:

1. thong tin companion
2. thanh tich
3. danh sach skill day

Moi skill card nen hien:

- icon skill tu `iconKey`
- ten skill
- `Tu {startingPointCost} diem` neu co offer
- `Chua co lich mo` neu `hasAvailableOffers = false`
- nut `Xem chi tiet`
- nut `Dang ky` neu co offer

### 5.5. Possible errors

- `404 PROFILE_NOT_FOUND`
- `403 PROFILE_PRIVATE`

---

## 6. Companion skill detail API

### 6.1. Endpoint

```http
GET /api/companions/{companionId}/skills/{skillId}?reviewPage=1&reviewLimit=10&offerPage=1&offerLimit=20
```

### 6.2. Query params

- `reviewPage`: default `1`
- `reviewLimit`: default `10`
- `offerPage`: default `1`
- `offerLimit`: default `20`

### 6.3. Response 200

```json
{
  "companionId": "11111111-1111-1111-1111-111111111111",
  "skill": {
    "skillId": "33333333-3333-3333-3333-333333333333",
    "name": "Speaking",
    "iconKey": "languages"
  },
  "avgRating": 4.8,
  "totalReviews": 33,
  "offers": {
    "data": [
      {
        "sessionId": "55555555-5555-5555-5555-555555555555",
        "companionId": "11111111-1111-1111-1111-111111111111",
        "learnerId": null,
        "skill": "Speaking",
        "description": "Interview speaking practice",
        "deliveryMode": "Online",
        "location": null,
        "durationMinutes": 120,
        "pointCost": 75,
        "pricingModel": "FormulaV1",
        "durationOptions": [60, 90, 120],
        "durationPricingOptions": [
          {
            "durationMinutes": 60,
            "learnerChargePoints": 75,
            "companionPayoutPoints": 60,
            "platformFeePoints": 15,
            "durationMultiplierPercent": 100,
            "isSelected": false
          },
          {
            "durationMinutes": 90,
            "learnerChargePoints": 105,
            "companionPayoutPoints": 84,
            "platformFeePoints": 21,
            "durationMultiplierPercent": 140,
            "isSelected": false
          },
          {
            "durationMinutes": 120,
            "learnerChargePoints": 135,
            "companionPayoutPoints": 108,
            "platformFeePoints": 27,
            "durationMultiplierPercent": 180,
            "isSelected": false
          }
        ],
        "selectedDurationMinutes": null,
        "pricingPreview": {
          "minCompanionPayoutPoints": 60,
          "maxCompanionPayoutPoints": 108,
          "minLearnerChargePoints": 75,
          "maxLearnerChargePoints": 135,
          "minPlatformFeePoints": 15,
          "maxPlatformFeePoints": 27
        },
        "pricingBreakdown": null,
        "scheduledAt": "2026-05-18T08:00:00Z",
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
        "createdAt": "2026-05-14T00:00:00Z",
        "updatedAt": "2026-05-14T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  },
  "reviews": {
    "data": [
      {
        "reviewId": "66666666-6666-6666-6666-666666666666",
        "rating": 5,
        "comment": "Day de hieu",
        "reviewerDisplayName": "Thao Nhi",
        "createdAt": "2026-05-11T06:00:00Z"
      }
    ],
    "total": 33,
    "page": 1,
    "limit": 10
  }
}
```

### 6.4. FE rendering rules

- `avgRating` va `totalReviews` la rating cap companion, khong phai rating rieng theo skill
- `reviews.data` la review cap companion
- `offers.data` moi la nguon de render card lich hoc/offer
- FE khong tu build pricing range lai neu backend da tra `pricingPreview` va `durationPricingOptions`

### 6.5. CTA rules

#### Nut `Xem chi tiet`

- Tu public profile skill item:
  - route UI goi y: `/companions/:companionId/skills/:skillId`
  - hoac open modal detail

#### Nut `Dang ky`

- Neu `offers.data.length === 0`:
  - disable nut
  - hien label `Chua co lich mo`

- Neu offer la `LegacyManual`:
  - FE co the goi book ngay voi `selectedDurationMinutes = offer.durationMinutes`

- Neu offer la `FormulaV1`:
  - FE bat buoc cho user chon 1 `durationMinutes` tu `durationPricingOptions`
  - sau do goi book voi duration da chon

---

## 7. Booking from skill detail

### 7.1. Endpoint

```http
POST /api/sessions/{sessionId}/book
Authorization: Bearer <token>
Content-Type: application/json
```

### 7.2. Request

```json
{
  "selectedDurationMinutes": 60
}
```

### 7.3. FE booking rules

- FE luon gui `selectedDurationMinutes`
- Khong gui `null`
- Khong gui `skillId` trong request book
- Khong gui `pointCost` do FE tu tinh
- Khong gui `pricingModel`

Nguon chon `selectedDurationMinutes`:

- `LegacyManual`:
  - dung `offer.durationMinutes`
- `FormulaV1`:
  - dung option user da chon trong `durationPricingOptions`

### 7.4. Possible errors FE can hit

- `401` neu chua login
- `404 SESSION_NOT_FOUND`
- `400 SELF_BOOKING`
- `400 INSUFFICIENT_POINTS`
- `400 INVALID_SELECTED_DURATION`
- `409 SESSION_INVALID_STATUS`
- `409 SESSION_TIME_CONFLICT`

FE nen map cac loi tren thanh toast/message ro nghia.

---

## 8. My profile va public user profile co them achievements

### 8.1. `GET /api/profile/me`

Response `ProfileDto` da co them:

```json
{
  "userId": "77777777-7777-7777-7777-777777777777",
  "displayName": "Pham Long",
  "avatarUrl": "https://cdn.edskill.test/avatar/u7.png",
  "bio": "Toi day C#",
  "dateOfBirth": "2000-01-02T00:00:00Z",
  "phone": "+84912345678",
  "degreeUrl": "https://cdn.edskill.test/degree/u7.pdf",
  "credentialUrls": [],
  "credentialCount": 1,
  "skillsToTeach": ["C#", "SQL"],
  "skillsToLearn": ["React"],
  "teachingSkills": [
    { "skillId": "a1", "name": "C#", "iconKey": "code" }
  ],
  "learningSkills": [
    { "skillId": "b1", "name": "React", "iconKey": "code" }
  ],
  "achievements": [
    {
      "achievementId": "22222222-2222-2222-2222-222222222222",
      "name": "Buoi day dau tien",
      "description": "Hoan thanh buoi day dau tien",
      "iconUrl": "https://cdn.edskill.test/achievement/icon-1.png",
      "awardedAt": "2026-05-10T12:00:00Z"
    }
  ],
  "isPublic": true,
  "roles": ["learner", "companion"],
  "totalSessions": 8,
  "lastActiveAt": "2026-05-16T09:15:00Z",
  "isCompanionOnboardingComplete": true,
  "missingCompanionProfileFields": []
}
```

### 8.2. `GET /api/profile/{userId}`

- Van tra `ProfileDto`
- Da co them `achievements`
- Voi profile public, backend da an cac field private nhu truoc

### 8.3. FE rendering rules

- O man my profile:
  - them section `Thanh tich`
  - dung `profile.achievements`
- O man public user profile chung:
  - neu FE van co screen nay, co the hien achievements luon
- Khong can goi endpoint rieng de lay achievements cho profile

---

## 9. Admin achievements APIs

## 9.1. `GET /api/admin/achievements`

### Query

- `includeInactive`: default `true`

### Response 200

```json
[
  {
    "achievementId": "22222222-2222-2222-2222-222222222222",
    "name": "Buoi day dau tien",
    "description": "Hoan thanh buoi day dau tien",
    "iconUrl": "https://cdn.edskill.test/achievement/icon-1.png",
    "track": "companion",
    "metric": "completed_sessions",
    "threshold": 1,
    "sortOrder": 10,
    "isActive": true,
    "effectiveFromUtc": "2026-05-16T17:00:00Z"
  }
]
```

### FE use case

- admin table
- filter active/inactive
- fill default value cho edit form

## 9.2. `POST /api/admin/achievements/icon-upload-url`

### Request

```json
{
  "fileName": "first-session.png",
  "contentType": "image/png",
  "fileSize": 512000
}
```

### Response 200

```json
{
  "uploadUrl": "https://...",
  "publicUrl": "https://cdn.edskill.test/achievement/admin/...",
  "objectKey": "achievement/....png",
  "expiresAt": "2026-05-16T17:15:00Z"
}
```

### FE upload flow

1. FE goi endpoint tao upload URL.
2. FE `PUT` file binary len `uploadUrl`.
3. Neu upload thanh cong, FE lay `publicUrl`.
4. FE dua `publicUrl` vao `iconUrl` khi tao/sua achievement.

Luu y:

- Backend khong nhan file binary trong `POST /api/admin/achievements`
- FE phai upload truoc

## 9.3. `POST /api/admin/achievements`

### Request

```json
{
  "name": "Buoi day dau tien",
  "description": "Hoan thanh buoi day dau tien",
  "iconUrl": "https://cdn.edskill.test/achievement/icon-1.png",
  "track": "companion",
  "metric": "completed_sessions",
  "threshold": 1,
  "sortOrder": 10
}
```

### Response 201

Tra ve `AdminAchievementDto`.

### Validation FE can rely on

- `track` chi nhan:
  - `learner`
  - `companion`
- `metric` chi nhan:
  - `completed_sessions`
  - `completed_hours`
  - `distinct_completed_learners`
- `threshold > 0`
- `distinct_completed_learners` chi hop le voi `track = companion`

## 9.4. `PATCH /api/admin/achievements/{achievementId}`

### PATCH semantics

- omit field: giu nguyen
- `iconUrl: null` hoac `""`: clear icon
- `isActive: false`: achievement khong hien nua trong grant moi

### Request examples

Update text:

```json
{
  "name": "Buoi day dau tien",
  "description": "Hoan thanh buoi day teaching dau tien"
}
```

Change icon:

```json
{
  "iconUrl": "https://cdn.edskill.test/achievement/icon-new.png"
}
```

Deactivate:

```json
{
  "isActive": false
}
```

### FE note

Neu admin sua `track`, `metric`, hoac `threshold`:

- backend se reset `effectiveFromUtc`
- FE chi can refresh lai du lieu sau khi save

---

## 10. Error handling FE nen support

### 10.1. Public profile / skill detail

- `404 PROFILE_NOT_FOUND`
- `404 SKILL_NOT_FOUND`
- `403 PROFILE_PRIVATE`

### 10.2. Admin achievements

- `404 ACHIEVEMENT_NOT_FOUND`
- `409 ACHIEVEMENT_NAME_EXISTS`
- `400 INVALID_ACHIEVEMENT_ICON_URL`
- `400 INVALID_ACHIEVEMENT_TRACK`
- `400 INVALID_ACHIEVEMENT_METRIC`
- `400 INVALID_ACHIEVEMENT_THRESHOLD`

### 10.3. Upload icon

- `400 INVALID_ACHIEVEMENT_ICON_FILE_NAME`
- `400 INVALID_ACHIEVEMENT_ICON_CONTENT_TYPE`
- `400 INVALID_ACHIEVEMENT_ICON_FILE_SIZE`

---

## 11. FE implementation plan khuyen nghi

### 11.1. Public profile page

1. route vao profile companion bang `companionId`
2. goi `GET /api/companions/{companionId}/public-profile`
3. render:
   - header profile
   - achievements
   - danh sach teaching skills
4. moi skill item:
   - nut `Xem chi tiet` -> mo route skill detail
   - nut `Dang ky`:
     - neu `hasAvailableOffers = true` thi dieu huong sang skill detail va focus khu booking
     - neu `false` thi disable

### 11.2. Skill detail page

1. lay `companionId`, `skillId`
2. goi `GET /api/companions/{companionId}/skills/{skillId}`
3. render:
   - thong tin skill
   - danh sach offers
   - reviews
4. user chon duration neu can
5. goi `POST /api/sessions/{sessionId}/book`

### 11.3. My profile page

1. goi `GET /api/profile/me`
2. render section `Thanh tich`
3. dung chung `AchievementSummaryDto[]`

### 11.4. Admin achievements page

1. goi `GET /api/admin/achievements`
2. admin chon file icon
3. goi `POST /api/admin/achievements/icon-upload-url`
4. upload file len `uploadUrl`
5. goi `POST` hoac `PATCH` achievement voi `iconUrl = publicUrl`

---

## 12. FE should not do

- Khong tu tinh achievement rule
- Khong tu loc lai `teachingSkills` theo `offerCount`
- Khong tu build lai pricing cho offer Formula V1
- Khong book bang `skillId`
- Khong gui file binary truc tiep vao achievement create/update API
- Khong dung endpoint cu `GET /api/companions/{companionId}` cho man public profile moi

---

## 13. Recommended UI copy

Public profile:

- `Thanh tich`
- `Danh gia`
- `Ky nang giang day`
- `Tu {n} diem`
- `Chua co lich mo`
- `Xem chi tiet`
- `Dang ky`

Skill detail:

- `Chon thoi luong`
- `So diem can tra`
- `Dang ky buoi hoc`

Admin:

- `Quan ly thanh tich`
- `Tai icon`
- `Loai thanh tich`
- `Dieu kien dat`
- `Nguong`
- `Thu tu hien thi`

