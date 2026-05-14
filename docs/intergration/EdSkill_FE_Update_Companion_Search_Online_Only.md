# EdSkill FE Update - Companion Search Online-Only Filters

Tai lieu nay la delta integration cho FE sau khi backend cap nhat companion discovery/detail theo nghiep vu moi.

Muc tieu:

- Companion discovery/detail chi con ho tro hoc `online`.
- FE khong hien filter offline nua.
- FE co them bo loc theo thoi luong, diem toi da learner muon chi, va nhom so chung chi.
- Response tu backend da tra san danh sach offer match, FE khong tu suy luan hay tu loc lai logic pricing/duration.

Tai lieu nay chi cover delta cho:

- `GET /api/companions/search`
- `GET /api/companions/{companionId}`

Neu can contract session Formula Pricing co ban thi van doc:

- `docs/intergartion/EdSkill_FE_Integration_Formula_Pricing_V1.md`
- `docs/intergartion/EdSkill_FE_Update_Exact_Duration_Pricing.md`

---

## 1. Thay doi nghiep vu chinh

1. Companion discovery/detail mac dinh va chi ho tro `online`.
2. Backend khong con nhan filter `deliveryMode` va `location` cho hai endpoint nay.
3. FE phai dung 3 filter moi:
   - `minimumDurationMinutes`
   - `maxLearnerChargePoints`
   - `credentialCountGroup`
4. Filter duration + price duoc ap dung tren chinh offer dang match voi skill tim kiem.
5. Response chi tra:
   - cac companion con hop le sau filter
   - cac offer con hop le sau filter
   - voi formula offer: chi cac duration option con hop le

---

## 2. Query params moi

### 2.1. `GET /api/companions/search`

Query params:

- `skillId` - `guid`, bat buoc
- `minimumDurationMinutes` - `30 | 45 | 60 | 90 | 120`, optional
- `maxLearnerChargePoints` - `number > 0`, optional
- `credentialCountGroup` - `Zero | One | Two | ThreeOrMore`, optional
- `page` - default `1`
- `limit` - default `20`

### 2.2. `GET /api/companions/{companionId}`

Query params:

- `skillId` - `guid`, bat buoc
- `minimumDurationMinutes` - `30 | 45 | 60 | 90 | 120`, optional
- `maxLearnerChargePoints` - `number > 0`, optional
- `credentialCountGroup` - `Zero | One | Two | ThreeOrMore`, optional
- `reviewPage` - default `1`
- `reviewLimit` - default `10`

### 2.3. Legacy params khong con duoc gui

Khong gui nua:

- `deliveryMode`
- `location`

Neu FE cu van gui, backend se tra `422 VALIDATION_ERROR`.

Vi du:

```json
{
  "statusCode": 422,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "property": "DeliveryMode",
      "message": "Companion discovery now supports online offers only. Remove deliveryMode from the request.",
      "errorCode": "UNSUPPORTED_DELIVERY_MODE_FILTER"
    }
  ]
}
```

Neu gui `location`:

```json
{
  "statusCode": 422,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "property": "Location",
      "message": "Companion discovery now supports online offers only. Remove location from the request.",
      "errorCode": "UNSUPPORTED_LOCATION_FILTER"
    }
  ]
}
```

---

## 3. Rule filter FE can biet

### 3.1. Filter theo thoi luong

- `minimumDurationMinutes` la nguong toi thieu, khong phai exact match.
- Vi du gui `60`:
  - hop le: `60`, `90`, `120`
  - khong hop le: `30`, `45`

### 3.2. Filter theo diem toi da learner tra

- `maxLearnerChargePoints` duoc ap tren `learnerChargePoints`.
- Khong ap tren `companionPayoutPoints`.
- Vi du gui `270`:
  - offer/duration co `learnerChargePoints <= 270` moi duoc giu lai.

### 3.3. Filter dong thoi duration + diem

- Mot duration option phai dat ca hai dieu kien:
  - `durationMinutes >= minimumDurationMinutes`
  - `learnerChargePoints <= maxLearnerChargePoints`

### 3.4. Filter theo nhom chung chi

- `Zero` -> dung `0` chung chi
- `One` -> dung `1` chung chi
- `Two` -> dung `2` chung chi
- `ThreeOrMore` -> tu `3` tro len

Backend dem chung chi theo `credentialUrls`, fallback `degreeUrl` neu can.

### 3.5. Rule quan trong ve skill/offer

- Backend chi xet filter tren chinh offer dang match voi `skillId`.
- Khong lay duration/gia cua skill khac de lam companion pass filter.

---

## 4. Response thay doi

### 4.1. `GET /api/companions/search`

Moi item companion trong `data` co them:

- `credentialCount`
- `matchedOffers`

Y nghia:

- `matchingSessionCount`: so offer da match sau khi loc xong
- `lowestPointCost`: diem learner tra thap nhat trong cac matched offer
- `pricingPreview`: range tong hop chi tinh tren matched offers/durations con lai
- `matchedOffers`: danh sach offer FE nen render khi can show chi tiet

Vi du:

```json
{
  "data": [
    {
      "companionId": "22222222-2222-2222-2222-222222222222",
      "displayName": "Nguyen Van A",
      "avatarUrl": "https://cdn.edskill.test/u/avatar.png",
      "bio": "Public companion bio",
      "skillsToTeach": ["Speaking", "Presentation"],
      "credentialCount": 2,
      "avgRating": 4.8,
      "totalReviews": 12,
      "matchingSessionCount": 1,
      "lowestPointCost": 313,
      "pricingPreview": {
        "minCompanionPayoutPoints": 250,
        "maxCompanionPayoutPoints": 350,
        "minLearnerChargePoints": 313,
        "maxLearnerChargePoints": 438,
        "minPlatformFeePoints": 63,
        "maxPlatformFeePoints": 88
      },
      "nextScheduledAt": "2026-05-20T09:00:00Z",
      "matchedOffers": [
        {
          "sessionId": "33333333-3333-3333-3333-333333333333",
          "companionId": "22222222-2222-2222-2222-222222222222",
          "learnerId": null,
          "skill": "Speaking",
          "description": "Interview speaking practice",
          "deliveryMode": "Online",
          "location": null,
          "durationMinutes": 120,
          "pointCost": 313,
          "pricingModel": "FormulaV1",
          "durationOptions": [60, 90, 120],
          "durationPricingOptions": [
            {
              "durationMinutes": 60,
              "learnerChargePoints": 313,
              "companionPayoutPoints": 250,
              "platformFeePoints": 63,
              "durationMultiplierPercent": 100,
              "isSelected": false
            },
            {
              "durationMinutes": 90,
              "learnerChargePoints": 363,
              "companionPayoutPoints": 290,
              "platformFeePoints": 73,
              "durationMultiplierPercent": 140,
              "isSelected": false
            },
            {
              "durationMinutes": 120,
              "learnerChargePoints": 438,
              "companionPayoutPoints": 350,
              "platformFeePoints": 88,
              "durationMultiplierPercent": 180,
              "isSelected": false
            }
          ],
          "selectedDurationMinutes": null,
          "pricingPreview": {
            "minCompanionPayoutPoints": 250,
            "maxCompanionPayoutPoints": 350,
            "minLearnerChargePoints": 313,
            "maxLearnerChargePoints": 438,
            "minPlatformFeePoints": 63,
            "maxPlatformFeePoints": 88
          },
          "pricingBreakdown": null,
          "scheduledAt": "2026-05-20T09:00:00Z",
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
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### 4.2. `GET /api/companions/{companionId}`

Response co them:

- `credentialCount`

Va `sessions` chi con gom:

- offer `online`
- dung `skillId`
- con hop le sau filter duration/price/credential

Vi du:

```json
{
  "companionId": "22222222-2222-2222-2222-222222222222",
  "displayName": "Nguyen Van A",
  "avatarUrl": "https://cdn.edskill.test/u/avatar.png",
  "bio": "Public companion bio",
  "skillsToTeach": ["Speaking", "Presentation"],
  "roles": ["learner", "companion"],
  "credentialCount": 2,
  "totalSessions": 12,
  "lastActiveAt": "2026-05-13T08:40:00Z",
  "avgRating": 4.8,
  "totalReviews": 12,
  "reviews": {
    "data": [],
    "total": 12,
    "page": 1,
    "limit": 10
  },
  "sessions": [
    {
      "sessionId": "33333333-3333-3333-3333-333333333333",
      "companionId": "22222222-2222-2222-2222-222222222222",
      "learnerId": null,
      "skill": "Speaking",
      "description": "Interview speaking practice",
      "deliveryMode": "Online",
      "location": null,
      "durationMinutes": 90,
      "pointCost": 313,
      "pricingModel": "FormulaV1",
      "durationOptions": [60, 90],
      "durationPricingOptions": [
        {
          "durationMinutes": 60,
          "learnerChargePoints": 313,
          "companionPayoutPoints": 250,
          "platformFeePoints": 63,
          "durationMultiplierPercent": 100,
          "isSelected": false
        },
        {
          "durationMinutes": 90,
          "learnerChargePoints": 363,
          "companionPayoutPoints": 290,
          "platformFeePoints": 73,
          "durationMultiplierPercent": 140,
          "isSelected": false
        }
      ],
      "selectedDurationMinutes": null,
      "pricingPreview": {
        "minCompanionPayoutPoints": 250,
        "maxCompanionPayoutPoints": 290,
        "minLearnerChargePoints": 313,
        "maxLearnerChargePoints": 363,
        "minPlatformFeePoints": 63,
        "maxPlatformFeePoints": 73
      },
      "pricingBreakdown": null,
      "scheduledAt": "2026-05-20T09:00:00Z",
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
  ]
}
```

---

## 5. FE render rules bat buoc

1. Khong render filter offline nua.
2. Khong gui `deliveryMode` va `location` cho discovery/detail.
3. Dung `matchedOffers` trong search neu UI can mo preview offer ngay tren search result.
4. Dung `sessions` trong detail va tin rang backend da loc san.
5. Voi formula offer:
   - render duration option theo `durationOptions` hoac `durationPricingOptions`
   - khong tu tinh lai pricing
   - `pointCost` la gia learner thap nhat trong cac option con lai cua offer do
6. Voi search card:
   - `lowestPointCost` la gia learner thap nhat da match
   - `pricingPreview` la range cua cac matched offers/durations, khong phai range toan bo offer goc

---

## 6. Validation error codes moi FE can handle

- `UNSUPPORTED_DELIVERY_MODE_FILTER`
- `UNSUPPORTED_LOCATION_FILTER`
- `INVALID_MINIMUM_DURATION`
- `INVALID_MAX_LEARNER_CHARGE_POINTS`
- `INVALID_CREDENTIAL_COUNT_GROUP`

Tat ca cac loi tren duoc wrap trong response `422 VALIDATION_ERROR`.

---

## 7. Checklist FE can update ngay

1. Xoa UI filter offline/location trong companion search/detail.
2. Them UI filter:
   - thoi luong toi thieu
   - diem toi da
   - nhom chung chi
3. Khi call search/detail, chi gui query moi.
4. Search result:
   - render `credentialCount`
   - neu can danh sach offer, dung `matchedOffers`
5. Companion detail:
   - render `credentialCount`
   - render `sessions` nhu danh sach da loc san
6. Neu nhan `422` voi `UNSUPPORTED_DELIVERY_MODE_FILTER` hoac `UNSUPPORTED_LOCATION_FILTER`, kiem tra lai FE con gui query cu hay khong.

---

## 8. AI FE handoff

Section nay viet theo kieu implement brief de AI FE co the code ngay.

### 8.1. TypeScript types de dung thang

```ts
export type CredentialCountGroup = "Zero" | "One" | "Two" | "ThreeOrMore";

export type CompanionSearchFilters = {
  skillId: string;
  minimumDurationMinutes?: 30 | 45 | 60 | 90 | 120;
  maxLearnerChargePoints?: number;
  credentialCountGroup?: CredentialCountGroup;
  page?: number;
  limit?: number;
};

export type SessionPricingPreview = {
  minCompanionPayoutPoints: number;
  maxCompanionPayoutPoints: number;
  minLearnerChargePoints: number;
  maxLearnerChargePoints: number;
  minPlatformFeePoints: number;
  maxPlatformFeePoints: number;
};

export type SessionDurationPricingOption = {
  durationMinutes: number;
  learnerChargePoints: number;
  companionPayoutPoints: number;
  platformFeePoints: number;
  durationMultiplierPercent: number;
  isSelected: boolean;
};

export type SessionDto = {
  sessionId: string;
  companionId: string;
  learnerId: string | null;
  skill: string;
  description: string | null;
  deliveryMode: "Online" | "Offline";
  location: string | null;
  durationMinutes: number;
  pointCost: number;
  pricingModel: "FormulaV1" | "LegacyManual";
  durationOptions: number[];
  durationPricingOptions: SessionDurationPricingOption[];
  selectedDurationMinutes: number | null;
  pricingPreview: SessionPricingPreview;
  pricingBreakdown: {
    learnerChargePoints: number;
    companionPayoutPoints: number;
    platformFeePoints: number;
    skillBasePoints: number | null;
    credentialBonusPoints: number | null;
    durationMultiplierPercent: number | null;
  } | null;
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
};

export type CompanionSearchItem = {
  companionId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  skillsToTeach: string[];
  credentialCount: number;
  avgRating: number;
  totalReviews: number;
  matchingSessionCount: number;
  lowestPointCost: number;
  pricingPreview: SessionPricingPreview;
  nextScheduledAt: string;
  matchedOffers: SessionDto[];
};

export type CompanionSearchResponse = {
  data: CompanionSearchItem[];
  total: number;
  page: number;
  limit: number;
};

export type CompanionDetailResponse = {
  companionId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  skillsToTeach: string[];
  roles: string[];
  credentialCount: number;
  totalSessions: number;
  lastActiveAt: string | null;
  avgRating: number;
  totalReviews: number;
  reviews: {
    data: Array<{
      reviewId: string;
      rating: number;
      comment: string | null;
      reviewerDisplayName: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };
  sessions: SessionDto[];
};

export type ValidationErrorResponse = {
  statusCode: 422;
  errorCode: "VALIDATION_ERROR";
  message: string;
  errors: Array<{
    property: string;
    message: string;
    errorCode: string;
  }>;
};
```

### 8.2. Query builder FE nen dung

```ts
export function buildCompanionSearchQuery(filters: CompanionSearchFilters) {
  const params = new URLSearchParams();

  params.set("skillId", filters.skillId);

  if (filters.minimumDurationMinutes) {
    params.set("minimumDurationMinutes", String(filters.minimumDurationMinutes));
  }

  if (typeof filters.maxLearnerChargePoints === "number" && filters.maxLearnerChargePoints > 0) {
    params.set("maxLearnerChargePoints", String(filters.maxLearnerChargePoints));
  }

  if (filters.credentialCountGroup) {
    params.set("credentialCountGroup", filters.credentialCountGroup);
  }

  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  return params.toString();
}
```

Bat buoc:

- khong add `deliveryMode`
- khong add `location`

### 8.3. Search page implementation flow

1. User chon `skill`.
2. FE render 3 filter:
   - minimum duration
   - max learner points
   - credential group
3. FE goi `GET /api/companions/search`.
4. FE render list companion.
5. Tren moi card:
   - show `displayName`, `avatarUrl`, `avgRating`, `totalReviews`
   - show `credentialCount`
   - show gia tu `lowestPointCost` hoac `pricingPreview`
   - neu UI co preview offer, doc tu `matchedOffers[0]` hoac loop `matchedOffers`

### 8.4. Companion detail page implementation flow

1. FE lay `companionId` tu route.
2. FE giu nguyen 3 filter nhu page search.
3. FE goi `GET /api/companions/{companionId}`.
4. FE render:
   - profile block
   - badge `credentialCount`
   - reviews
   - list `sessions`
5. FE khong can loc lai `sessions`.

### 8.5. Render rules cho formula offer

Neu `pricingModel === "FormulaV1"`:

- render option theo `durationPricingOptions`
- moi button duration dung:
  - label: `durationMinutes`
  - price: `learnerChargePoints`
- khong tu tinh lai gia
- `pointCost` tren offer card = gia learner thap nhat trong cac option con lai

Neu `pricingModel === "LegacyManual"`:

- treat offer nhu 1 gia co dinh
- khong can duration picker phuc tap

### 8.6. Loi FE can map

Neu response la `422 VALIDATION_ERROR`:

- `UNSUPPORTED_DELIVERY_MODE_FILTER`
  - nghia la FE van dang gui query cu
- `UNSUPPORTED_LOCATION_FILTER`
  - nghia la FE van dang gui query cu
- `INVALID_MINIMUM_DURATION`
  - reset dropdown duration ve empty
- `INVALID_MAX_LEARNER_CHARGE_POINTS`
  - validate input diem > 0
- `INVALID_CREDENTIAL_COUNT_GROUP`
  - reset credential filter ve empty

### 8.7. UI labels goi y

- `minimumDurationMinutes` -> `Thoi luong toi thieu`
- `maxLearnerChargePoints` -> `Diem toi da`
- `credentialCountGroup` -> `Chung chi`
- `Zero` -> `0 chung chi`
- `One` -> `1 chung chi`
- `Two` -> `2 chung chi`
- `ThreeOrMore` -> `3+ chung chi`

### 8.8. Output expectation cho AI FE

AI FE nen implement it nhat:

1. Search filter form moi.
2. API client cho search/detail theo query moi.
3. Xoa hoan toan offline filter trong discovery/detail UI.
4. Search card support:
   - credential count
   - matched offer preview
   - price range tu response backend
5. Detail page support:
   - credential count
   - sessions da loc san
   - formula duration options da trim san
