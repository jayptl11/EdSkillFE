# EdSkill FE Update - Exact Duration Pricing

Tai lieu nay la ban update rieng cho FE sau thay doi Formula Pricing V1.

Muc tieu:

- FE khong hien `Du kien chi phi: 375 - 675 diem` trong modal chon thoi luong nhu anh mock hien tai.
- FE phai hien gia chinh xac theo tung nut thoi luong.
- Khi user click `30 phut`, `45 phut`, `60 phut`, `90 phut`, `120 phut`, UI phai doi ngay sang so diem learner se tra cho muc vua chon.

Tai lieu nay chi cover delta moi. Nhung contract khac van doc theo:

- `docs/intergartion/EdSkill_FE_Integration_Formula_Pricing_V1.md`

---

## 1. Thay doi contract response

Field moi duoc them vao `SessionDto`:

```json
"durationPricingOptions": [
  {
    "durationMinutes": 30,
    "learnerChargePoints": 169,
    "companionPayoutPoints": 135,
    "platformFeePoints": 34,
    "durationMultiplierPercent": 60,
    "isSelected": false
  },
  {
    "durationMinutes": 45,
    "learnerChargePoints": 188,
    "companionPayoutPoints": 150,
    "platformFeePoints": 38,
    "durationMultiplierPercent": 75,
    "isSelected": false
  },
  {
    "durationMinutes": 60,
    "learnerChargePoints": 219,
    "companionPayoutPoints": 175,
    "platformFeePoints": 44,
    "durationMultiplierPercent": 100,
    "isSelected": false
  }
]
```

Y nghia tung field:

- `durationMinutes`: so phut cua option. Dung de render text tren button, vi du `30 phut`.
- `learnerChargePoints`: so diem learner can tra neu chon option nay. Day la field FE phai hien thi chinh trong modal.
- `companionPayoutPoints`: khong can hien thi trong modal book neu UI khong co cho nay. Co the dung trong trang chi tiet session neu muon show phan companion nhan.
- `platformFeePoints`: FE bo qua trong luong book neu khong co UI cho phi nen tang.
- `durationMultiplierPercent`: FE bo qua neu khong hien cong thuc.
- `isSelected`: backend danh dau option duoc chon tren session da book. Trong modal chua book, FE co the bo qua va tu quan ly selected state local.

---

## 2. Endpoint bi anh huong

Khong co endpoint moi. FE tiep tuc goi cac endpoint cu:

- `GET /api/sessions`
- `GET /api/sessions/{id}`
- `POST /api/sessions`
- `POST /api/sessions/{id}/book`
- Cac endpoint companion detail/list neu dang doc nested `SessionDto`

Thay doi nam o response `SessionDto`, khong nam o request.

---

## 3. Rule FE bat buoc phai doi

### 3.1. Trong card/list session

Van duoc phep hien range tu `pricingPreview` de user quet nhanh:

- `pricingPreview.minLearnerChargePoints`
- `pricingPreview.maxLearnerChargePoints`

Vi du:

- Neu min = max -> hien `219 diem`
- Neu min != max -> hien `169 - 319 diem`

Day chi dung o list/card/preview.

### 3.2. Trong modal chon thoi luong

Khong dung `pricingPreview` de hien gia sau khi user da mo modal.

FE phai:

1. Render danh sach nut theo `durationPricingOptions`
2. Khi user click 1 nut:
   - luu selected option vao state local
   - hien `selectedOption.learnerChargePoints`
3. Khi bam `Xac nhan dat lich`:
   - goi `POST /api/sessions/{id}/book`
   - body:

```json
{
  "selectedDurationMinutes": 60
}
```

Text UI de xai trong modal:

- Truoc khi user chon:
  - `Chon thoi luong de xem diem can tra`
- Sau khi user chon:
  - `Chi phi: 219 diem`

Khong render:

- `Du kien chi phi: 169 - 319 diem`

trong modal chon phut nua.

### 3.3. Thu tu option

Backend tra option tang dan theo phut:

- `30, 45, 60, 90, 120`

FE render dung thu tu response, khong can sort lai.

### 3.4. Rule mo rong duration

Backend da tu mo rong theo moc lon nhat:

- Session tao voi `120` -> response co `30, 45, 60, 90, 120`
- Session tao voi `90` -> response co `30, 45, 60, 90`
- Session tao voi `60` -> response co `30, 45, 60`
- Session tao voi `45` -> response co `30, 45`
- Session tao voi `30` -> response co `30`

FE khong tu suy, khong tu generate them option. Chi render theo `durationPricingOptions`.

---

## 4. Contract usage theo man hinh

### 4.1. Session list / companion detail

Dung:

- `pricingPreview` de hien range
- `durationOptions` de hien text tong quat neu can, vi du `Ho tro 30-120 phut`

Khong can dung:

- `durationPricingOptions` neu card khong mo picker

### 4.2. Session detail page

Neu page co khu vuc chon thoi luong ngay tren page:

- render radio/button tu `durationPricingOptions`
- show exact point tu option dang active

Neu page chi co nut `Dat lich` mo modal:

- chi can truyen `durationPricingOptions` vao modal

### 4.3. Booking modal

State FE de nghi:

```ts
type DurationPricingOption = {
  durationMinutes: number;
  learnerChargePoints: number;
  companionPayoutPoints: number;
  platformFeePoints: number;
  durationMultiplierPercent: number;
  isSelected: boolean;
};

const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
```

Gia tri dang hien thi:

- tim option theo `selectedDuration`
- neu thay -> show `learnerChargePoints`
- neu chua thay -> show prompt chon phut

Disable nut submit khi:

- `selectedDuration === null`

---

## 5. Response behavior can biet de render dung

### 5.1. Session formula chua duoc book

Response co:

- `pricingModel = "FormulaV1"`
- `durationPricingOptions` = day du cac option co the chon
- `selectedDurationMinutes = null`
- `pricingBreakdown = null`

FE behavior:

- Cho phep user chon phut
- Show exact point theo option user click

### 5.2. Session formula da duoc book

Response co:

- `selectedDurationMinutes` co gia tri
- `pricingBreakdown` co gia tri
- `durationPricingOptions` thuong chi con 1 item, la option da chot

FE behavior:

- Khong render lai picker
- Hien thi `Thoi luong da chon: {selectedDurationMinutes} phut`
- Hien thi `Chi phi: {pricingBreakdown.learnerChargePoints} diem`

### 5.3. Session legacy

Response co:

- `pricingModel = "LegacyManual"`
- `durationPricingOptions = []`

FE behavior:

- Giu flow cu
- Khong co minute picker theo cong thuc moi

---

## 6. Vi du response moi cho FE

### 6.1. GET session detail - formula session chua book

```json
{
  "sessionId": "d9f99844-e89a-4e96-93f0-8f030b1b9f5d",
  "companionId": "4f6d4239-51a2-40a4-a3c2-31ddda96f5df",
  "learnerId": null,
  "skill": "C#",
  "description": "1-1 session for backend basics",
  "deliveryMode": "Online",
  "location": null,
  "durationMinutes": 120,
  "pointCost": 169,
  "pricingModel": "FormulaV1",
  "durationOptions": [30, 45, 60, 90, 120],
  "durationPricingOptions": [
    {
      "durationMinutes": 30,
      "learnerChargePoints": 169,
      "companionPayoutPoints": 135,
      "platformFeePoints": 34,
      "durationMultiplierPercent": 60,
      "isSelected": false
    },
    {
      "durationMinutes": 45,
      "learnerChargePoints": 188,
      "companionPayoutPoints": 150,
      "platformFeePoints": 38,
      "durationMultiplierPercent": 75,
      "isSelected": false
    },
    {
      "durationMinutes": 60,
      "learnerChargePoints": 219,
      "companionPayoutPoints": 175,
      "platformFeePoints": 44,
      "durationMultiplierPercent": 100,
      "isSelected": false
    },
    {
      "durationMinutes": 90,
      "learnerChargePoints": 269,
      "companionPayoutPoints": 215,
      "platformFeePoints": 54,
      "durationMultiplierPercent": 140,
      "isSelected": false
    },
    {
      "durationMinutes": 120,
      "learnerChargePoints": 319,
      "companionPayoutPoints": 255,
      "platformFeePoints": 64,
      "durationMultiplierPercent": 180,
      "isSelected": false
    }
  ],
  "selectedDurationMinutes": null,
  "pricingPreview": {
    "minCompanionPayoutPoints": 135,
    "maxCompanionPayoutPoints": 255,
    "minLearnerChargePoints": 169,
    "maxLearnerChargePoints": 319,
    "minPlatformFeePoints": 34,
    "maxPlatformFeePoints": 64
  },
  "pricingBreakdown": null,
  "scheduledAt": "2026-05-20T13:00:00Z",
  "status": "Available"
}
```

FE render:

- List/card: `169 - 319 diem`
- Modal:
  - click `30 phut` -> `Chi phi: 169 diem`
  - click `90 phut` -> `Chi phi: 269 diem`
  - click `120 phut` -> `Chi phi: 319 diem`

### 6.2. POST book success

Request:

```json
{
  "selectedDurationMinutes": 90
}
```

Response:

```json
{
  "sessionId": "d9f99844-e89a-4e96-93f0-8f030b1b9f5d",
  "pricingModel": "FormulaV1",
  "selectedDurationMinutes": 90,
  "durationPricingOptions": [
    {
      "durationMinutes": 90,
      "learnerChargePoints": 269,
      "companionPayoutPoints": 215,
      "platformFeePoints": 54,
      "durationMultiplierPercent": 140,
      "isSelected": true
    }
  ],
  "pricingBreakdown": {
    "learnerChargePoints": 269,
    "companionPayoutPoints": 215,
    "platformFeePoints": 54,
    "skillBasePoints": 100,
    "credentialBonusPoints": 75,
    "durationMultiplierPercent": 140
  },
  "status": "Booked"
}
```

FE render sau book:

- `Thoi luong da chon: 90 phut`
- `Chi phi: 269 diem`

### 6.3. POST book error phut khong hop le

Request:

```json
{
  "selectedDurationMinutes": 15
}
```

Response:

```json
{
  "errorCode": "INVALID_SELECTED_DURATION",
  "errorMessage": "Selected duration is not supported for this session."
}
```

FE xu ly:

- toast loi: `Thoi luong da chon khong hop le`
- giu modal mo
- khong reset option user vua click neu FE muon cho user doi nhanh

---

## 7. Checklist FE can update ngay

1. Trong modal book, doi source render button tu `durationOptions` sang `durationPricingOptions`.
2. Doi source hien gia trong modal tu `pricingPreview` sang `selectedOption.learnerChargePoints`.
3. Disable submit neu chua co option duoc chon.
4. Sau book thanh cong, doc `selectedDurationMinutes` + `pricingBreakdown.learnerChargePoints` de render trang thai da dat.
5. Giu `pricingPreview` chi cho card/list/tile preview, khong dung no lam final price trong picker nua.
