# EdSkill FE Update - Click Duration Shows Exact Points

Tai lieu nay la **ban update rieng** cho FE.

Muc dich:

- override phan pricing display trong modal/man hinh chon thoi luong
- de FE khong hien `khoang diem` sau khi user click vao so phut
- thay vao do, FE hien **so diem exact** ung voi tung muc thoi luong

Tai lieu nay override cac huong dan cu lien quan den:

- `SessionDto.durationOptions`
- `SessionDto.pricingPreview`
- UI modal chon thoi luong truoc khi book

---

## 1. Thay doi contract

Backend vua them field moi vao `SessionDto`:

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

### FE phai dung field nao

- `durationOptions`
  - Dung de render danh sach cac nut thoi luong co the chon
  - Day la source de biet co nhung moc nao

- `durationPricingOptions`
  - Dung de hien thi **gia exact** cho tung moc
  - Day la source chinh de update text `Du kien chi phi`
  - FE khong can tu tinh lai

- `pricingPreview`
  - Chi dung khi user **chua chon duration nao**
  - Dung de render text kieu `169 - 219 diem`
  - Sau khi user click 1 moc duration, FE nen doi sang so diem exact tu `durationPricingOptions`

---

## 2. Rule UI moi

### Truoc khi user chon thoi luong

FE hien:

- `Du kien chi phi: 169 - 219 diem`

Nguon du lieu:

- `pricingPreview.minLearnerChargePoints`
- `pricingPreview.maxLearnerChargePoints`

### Sau khi user click vao 1 muc phut

FE hien:

- `Du kien chi phi: 188 diem`

Nguon du lieu:

- tim item trong `durationPricingOptions` co `durationMinutes = duration da click`
- lay `learnerChargePoints`

### Sau khi book thanh cong

FE hien:

- `Tong diem Learner tra`: `pricingBreakdown.learnerChargePoints`
- `Companion nhan`: `pricingBreakdown.companionPayoutPoints`
- `Phi nen tang`: `pricingBreakdown.platformFeePoints`

Luc nay:

- uu tien `pricingBreakdown`
- khong can doc lai `durationPricingOptions` de hien final summary

---

## 3. Mapping field cho FE

### `durationPricingOptions[].durationMinutes`

- Hien thi label tren nut
- Vi du: `30 phút`, `45 phút`, `60 phút`

### `durationPricingOptions[].learnerChargePoints`

- Hien thi so diem exact learner phai tra khi user click vao nut duration tuong ung
- Day la field FE can uu tien nhat cho booking modal

### `durationPricingOptions[].companionPayoutPoints`

- FE thong thuong bo qua trong booking modal learner
- Neu co modal giai thich pricing, co the hien thi `Companion nhan`

### `durationPricingOptions[].platformFeePoints`

- FE thong thuong bo qua trong booking modal learner
- Neu co modal giai thich pricing, co the hien thi `Phi nen tang`

### `durationPricingOptions[].durationMultiplierPercent`

- FE bo qua trong UI co ban
- Neu can tooltip cong thuc, co the render `x0.6`, `x0.75`, `x1.0`, `x1.4`, `x1.8`

### `durationPricingOptions[].isSelected`

- Neu response la session da book roi, field nay giup FE biet muc nao dang duoc chon
- Với session `Available` chua book, field nay thuong la `false` cho tat ca
- FE local state van la source chinh trong booking modal truoc submit

---

## 4. Rule nghiep vu FE can biet

### Rule 1 - Companion chon moc lon nhat

FE create session:

- companion chi can chon **1 moc lon nhat**
- vi du chon `120`

BE se tu mo rong thanh:

- `30, 45, 60, 90, 120`

Nghia la FE booking side khong duoc gia dinh response se chi co 1 moc.

### Rule 2 - Learner chon trong list BE tra ve

FE booking:

- phai render option theo `durationOptions` hoac `durationPricingOptions`
- khong tu suy duration
- khong hardcode rule `120 -> 30/45/60/90/120` o FE
- neu sau nay BE doi rule, FE van dung vi chi doc response

### Rule 3 - Exact points chi tin tu response

FE khong tu tinh:

- `skill base points`
- `credential bonus`
- `markup 25%`
- `ceiling rounding`

FE chi doc:

- `durationPricingOptions[].learnerChargePoints`

### Rule 4 - Session cu van hoat dong

Co the DB session cu chi luu moc lon nhat, vi du `[120]`.

Nhung khi `GET /api/sessions` hoac `GET /api/sessions/{id}`:

- BE se tu mo rong va tra `durationOptions`
- dong thoi tra `durationPricingOptions`

FE khong can xu ly branch rieng cho session cu.

---

## 5. Endpoint bi anh huong

FE nen update parse response cho cac endpoint sau:

### `GET /api/sessions`

- Moi item `SessionDto` nay co them `durationPricingOptions`
- Dung cho list card / my sessions / available sessions

### `GET /api/sessions/{id}`

- Endpoint quan trong nhat cho booking modal
- FE nen lay `durationPricingOptions` tu day de render gia exact khi click vao duration

### `POST /api/sessions`

- Response create session cung co `durationPricingOptions`
- Dung de companion preview lai bang gia exact theo tung moc

### `POST /api/sessions/{id}/book`

- Response sau book van co `durationPricingOptions`
- Nhung summary final nen uu tien `pricingBreakdown`

### `GET /api/companions/{companionId}`

- Trong `sessions[]` moi item cung co `durationPricingOptions`
- Dung neu user book tu trang detail companion

### `GET /api/companions/search`

- Search item KHONG tra full `durationPricingOptions`
- Search card chi nen hien range tu `pricingPreview`
- Chi khi vao detail session/modal moi hien exact theo duration

---

## 6. Cac trang thai UI can xu ly

### Case A - Chua chon duration

Hien thi:

- `Du kien chi phi: {min} - {max} diem`

Neu `min == max`:

- hien thi 1 gia duy nhat

### Case B - Da chon duration

Hien thi:

- `Du kien chi phi: {exactLearnerChargePoints} diem`

Vi du:

- click `30 phút` -> `169 điểm`
- click `45 phút` -> `188 điểm`
- click `60 phút` -> `219 điểm`

### Case C - `durationPricingOptions` rong

Chi ap dung voi:

- legacy session
- hoac session loi contract hiem gap

FE fallback:

- dung `pricingPreview`
- neu cung khong co du lieu thi dung `pointCost`

### Case D - Book thanh cong

Hien thi summary final tu `pricingBreakdown`:

- `Tong diem Learner tra`
- `Companion nhan`
- `Phi nen tang`

---

## 7. UI implementation goi y

### State FE de nghi

```ts
type DurationPricingOption = {
  durationMinutes: number;
  learnerChargePoints: number;
  companionPayoutPoints: number;
  platformFeePoints: number;
  durationMultiplierPercent: number;
  isSelected: boolean;
};

type BookingState = {
  selectedDurationMinutes: number | null;
  selectedPricing: DurationPricingOption | null;
};
```

### Cach update state khi click nut duration

1. user click `60 phút`
2. FE tim item trong `durationPricingOptions` co `durationMinutes === 60`
3. set:
   - `selectedDurationMinutes = 60`
   - `selectedPricing = item`
4. update UI text:
   - tu `375 - 675 điểm`
   - thanh `675 điểm`

### Text rendering rule

Neu `selectedPricing != null`:

```ts
`Du kien chi phi: ${selectedPricing.learnerChargePoints} diem`
```

Neu `selectedPricing == null`:

```ts
pricingPreview.minLearnerChargePoints === pricingPreview.maxLearnerChargePoints
  ? `Du kien chi phi: ${pricingPreview.minLearnerChargePoints} diem`
  : `Du kien chi phi: ${pricingPreview.minLearnerChargePoints} - ${pricingPreview.maxLearnerChargePoints} diem`
```

---

## 8. Vi du response FE nen ky vong

### `GET /api/sessions/{id}` - session available

```json
{
  "sessionId": "cb405f8f-cf2b-486c-bd4c-5d9bbfc85f13",
  "companionId": "5e16b88b-6a36-453d-b74d-0e28044a0f52",
  "learnerId": null,
  "skill": "C#",
  "description": "Hoc co ban",
  "deliveryMode": "Online",
  "location": null,
  "durationMinutes": 120,
  "pointCost": 375,
  "pricingModel": "FormulaV1",
  "durationOptions": [30, 45, 60, 90, 120],
  "durationPricingOptions": [
    {
      "durationMinutes": 30,
      "learnerChargePoints": 375,
      "companionPayoutPoints": 300,
      "platformFeePoints": 75,
      "durationMultiplierPercent": 60,
      "isSelected": false
    },
    {
      "durationMinutes": 45,
      "learnerChargePoints": 431,
      "companionPayoutPoints": 345,
      "platformFeePoints": 86,
      "durationMultiplierPercent": 75,
      "isSelected": false
    },
    {
      "durationMinutes": 60,
      "learnerChargePoints": 500,
      "companionPayoutPoints": 400,
      "platformFeePoints": 100,
      "durationMultiplierPercent": 100,
      "isSelected": false
    },
    {
      "durationMinutes": 90,
      "learnerChargePoints": 600,
      "companionPayoutPoints": 480,
      "platformFeePoints": 120,
      "durationMultiplierPercent": 140,
      "isSelected": false
    },
    {
      "durationMinutes": 120,
      "learnerChargePoints": 675,
      "companionPayoutPoints": 540,
      "platformFeePoints": 135,
      "durationMultiplierPercent": 180,
      "isSelected": false
    }
  ],
  "selectedDurationMinutes": null,
  "pricingPreview": {
    "minCompanionPayoutPoints": 300,
    "maxCompanionPayoutPoints": 540,
    "minLearnerChargePoints": 375,
    "maxLearnerChargePoints": 675,
    "minPlatformFeePoints": 75,
    "maxPlatformFeePoints": 135
  },
  "pricingBreakdown": null,
  "scheduledAt": "2026-05-16T13:00:00Z",
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
  "createdAt": "2026-05-14T03:00:00Z",
  "updatedAt": "2026-05-14T03:00:00Z"
}
```

FE render:

- ban dau: `Du kien chi phi: 375 - 675 diem`
- click `60 phút`: `Du kien chi phi: 500 diem`
- click `120 phút`: `Du kien chi phi: 675 diem`

---

## 9. Checklist FE can update ngay

1. Update type `SessionDto` de them `durationPricingOptions`.
2. Booking modal:
   - click duration -> doi text range thanh exact points.
3. Neu da co local component render `pricingPreview`:
   - them branch uu tien `selectedPricing`.
4. Khong tu tinh lai pricing tren client.
5. Search page van hien range.
6. Session detail / booking modal moi hien exact theo duration da click.
