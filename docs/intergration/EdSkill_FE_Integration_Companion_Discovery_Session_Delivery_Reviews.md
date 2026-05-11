# EdSkill FE Integration - Companion Discovery, Session Delivery, Reviews

Tai lieu nay la tai lieu FE integration MOI cho phan backend vua them:

- tim kiem Companion theo skill + hinh thuc hoc
- session `Online` / `Offline`
- trang chi tiet Companion public
- review sau session

Muc tieu:

- de FE update nhanh theo contract moi
- chi ro phan nao la `UPDATE BAT BUOC`
- chi ro phan nao la `API MOI`
- mo ta luong UI -> API -> state de FE khong phai doan

Quan trong:

- KHONG sua tai lieu cu.
- Cac tai lieu cu da duoc team FE tich hop xong.
- Tu scope nay tro di, FE nen dung tai lieu nay de update cac man lien quan.
- Tai lieu nay chi override nhung phan duoi day:
  - create session offer
  - session DTO hien thi cho FE
  - session online/offline behavior
  - companion discovery page
  - companion public detail page
  - review create flow

JSON conventions:

- response dung camelCase
- enum tra ve dang string
- thoi gian la UTC ISO-8601

--- 

## 1. Tong quan thay doi

### 1.1. UPDATE BAT BUOC

FE phai update cac phan da co:

1. Form tao session cua Companion:
   - truoc day gui `skill`
   - bay gio phai gui `skillId`
   - phai them `deliveryMode`
   - neu `deliveryMode = Offline` phai them `location`

2. Session DTO:
   - them `deliveryMode`
   - them `location`

3. Flow join/leave:
   - chi session `Online` moi dung `/join` va `/leave`
   - session `Offline` khong duoc goi 2 endpoint nay

4. UI hien thi session:
   - can render label `Online` / `Offline`
   - neu `Offline` thi hien thi dia diem
   - neu `Offline` thi khong hien nut vao phong hoc Jitsi

### 1.2. API MOI

Backend vua them cac API moi:

1. `GET /api/companions/search`
2. `GET /api/companions/{companionId}`
3. `POST /api/reviews`

### 1.3. Scope nghiep vu cua release nay

- search result CHI hien Companion co it nhat 1 session `Available` khop bo loc
- filter offline location hien tai la `text contains`, chua phai map/radius search
- offline session khong tao `jitsiRoomId`
- review hien tai la tao review sau session `Completed`, khong co edit/delete review

---

## 2. Session contract moi

Base route:

```text
/api/sessions
```

## 2.1. Session DTO moi

Tat ca endpoint session tra ve `SessionDto` nay:

```json
{
  "sessionId": "8d70ff0f-3d4c-4e42-97ea-89eb8e7b1111",
  "companionId": "36ee2ab0-7be1-498f-8f76-78b5f7ce1111",
  "learnerId": "5f3aa607-a58f-4f6f-9b43-7ea095711111",
  "skill": "Excel",
  "description": "Basic formulas",
  "deliveryMode": "Offline",
  "location": "District 1, Ho Chi Minh City",
  "durationMinutes": 60,
  "pointCost": 100,
  "scheduledAt": "2026-05-12T13:00:00Z",
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
  "createdAt": "2026-05-11T02:00:00Z",
  "updatedAt": "2026-05-11T02:05:00Z"
}
```

### Field moi

- `deliveryMode`:
  - `Online`
  - `Offline`
- `location`:
  - `null` neu `Online`
  - string neu `Offline`

### FE rendering rule

- `Online`:
  - hien badge `Online`
  - co the hien nut vao phong hoc khi status hop le
- `Offline`:
  - hien badge `Offline`
  - hien dia diem
  - khong hien nut vao phong Jitsi

---

## 3. UPDATE BAT BUOC - Tao session offer

### POST `/api/sessions`

Role thuc te:

- can user co role `companion`

### Request MOI

```json
{
  "skillId": "11111111-1111-1111-1111-111111111111",
  "description": "Basic formulas",
  "deliveryMode": "Offline",
  "location": "District 1, Ho Chi Minh City",
  "durationMinutes": 60,
  "pointCost": 100,
  "scheduledAt": "2026-05-12T13:00:00Z"
}
```

### Khac voi contract cu

Truoc day:

```json
{
  "skill": "Excel",
  "description": "Basic formulas",
  "durationMinutes": 60,
  "pointCost": 100,
  "scheduledAt": "2026-05-12T13:00:00Z"
}
```

Bay gio:

- bo `skill`
- them `skillId`
- them `deliveryMode`
- them `location` neu offline

### Validation FE nen lam truoc

- `skillId`: bat buoc
- `deliveryMode`: bat buoc
- `durationMinutes`: chi nhan `30 | 45 | 60 | 90 | 120`
- `pointCost`: > 0
- `scheduledAt`: phai la tuong lai
- neu `deliveryMode = Offline`:
  - `location` bat buoc
  - trim
  - khuyen nghi FE limit 500 ky tu
- neu `deliveryMode = Online`:
  - khong gui `location`, hoac gui `null`

### Response

- `201 Created`
- body la `SessionDto`

### Error hay gap

- `403 FORBIDDEN`
- `404 SKILL_NOT_FOUND`
- `404 PROFILE_NOT_FOUND`
- `422 VALIDATION_ERROR`
- `400 SESSION_LIMIT_REACHED`
- `422 COMPANION_PROFILE_INCOMPLETE`

### FE form behavior khuyen nghi

1. User chon skill bang autocomplete tu `GET /api/skills`
2. FE luu ca:
   - `skillId`
   - `skillName` de render local
3. User chon:
   - `Online`
   - `Offline`
4. Neu `Offline`:
   - show input `location`
5. Neu doi tu `Offline` sang `Online`:
   - FE nen clear `location`

---

## 4. UPDATE BAT BUOC - Session online/offline behavior

## 4.1. Confirm session

### POST `/api/sessions/{id}/confirm`

Behavior moi:

- neu session `Online`:
  - backend tao `jitsiRoomId`
- neu session `Offline`:
  - backend KHONG tao `jitsiRoomId`

### FE rule

- khong duoc assume `Confirmed` la luon co `jitsiRoomId`
- chi hien nut `Join room` khi:
  - `deliveryMode = Online`
  - va `jitsiRoomId != null`

## 4.2. Join session

### POST `/api/sessions/{id}/join`

Chi dung cho session `Online`.

Neu FE goi cho `Offline`:

- `400 SESSION_NOT_ONLINE`

## 4.3. Leave session

### POST `/api/sessions/{id}/leave`

Chi dung cho session `Online`.

Neu FE goi cho `Offline`:

- `400 SESSION_NOT_ONLINE`

## 4.4. FE state rule cho man session detail / session card

Neu `deliveryMode = Online`:

- hien `Join room`
- hien Jitsi flow nhu cu
- van co `join` / `leave`

Neu `deliveryMode = Offline`:

- hien:
  - dia diem
  - thong tin lich hoc
  - cac nut booking / confirm / cancel nhu session thuong
- an:
  - `Join room`
  - UI phu thuoc `jitsiRoomId`
- khong goi `join` / `leave`

---

## 5. API MOI - Companion discovery

Base route:

```text
/api/companions
```

## 5.1. Man search du kien

Man search FE nen co:

1. input skill
2. dropdown/autocomplete skill
3. filter:
   - `Online`
   - `Offline`
4. neu chon `Offline`:
   - them input `location`
5. search result list

## 5.2. Lay goi y skill

### GET `/api/skills?q=...`

API nay da co tu truoc.

FE dung API nay de:

- goi y skill theo keyword user nhap
- user chon 1 skill item
- FE lay `id` cua skill do de gui sang `/api/companions/search`

Khuyen nghi:

- debounce 250-400ms
- chi search khi user nhap >= 1 ky tu
- sau khi user chon skill, luu object skill da chon trong state

## 5.3. Search Companion

### GET `/api/companions/search`

### Query params

- `skillId`: guid, bat buoc
- `deliveryMode`: optional
  - `Online`
  - `Offline`
- `location`: bat buoc neu `deliveryMode = Offline`
- `page`: default `1`
- `limit`: default `20`

### Vi du 1 - Search online

```http
GET /api/companions/search?skillId=11111111-1111-1111-1111-111111111111&deliveryMode=Online&page=1&limit=12
```

### Vi du 2 - Search offline

```http
GET /api/companions/search?skillId=11111111-1111-1111-1111-111111111111&deliveryMode=Offline&location=district%201&page=1&limit=12
```

### Response `200`

```json
{
  "data": [
    {
      "companionId": "22222222-2222-2222-2222-222222222222",
      "displayName": "Nguyen Van A",
      "avatarUrl": "https://cdn.edskill.test/u/avatar.png",
      "bio": "Public companion bio",
      "skillsToTeach": ["Speaking", "Presentation"],
      "avgRating": 4.8,
      "totalReviews": 12,
      "matchingSessionCount": 2,
      "lowestPointCost": 100,
      "nextScheduledAt": "2026-05-12T09:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 12
}
```

### Nghia cua tung field

- `matchingSessionCount`: so session `Available` cua Companion khop bo loc hien tai
- `lowestPointCost`: gia session thap nhat trong cac session khop
- `nextScheduledAt`: lich gan nhat trong cac session khop
- `avgRating`, `totalReviews`: aggregate review Companion nhan duoc khi dong vai `Companion`

### Rule quan trong

- ket qua KHONG phai tat ca Companion co skill
- ket qua CHI la Companion co session `Available` khop bo loc

### Error hay gap

- `404 SKILL_NOT_FOUND`
- `422 VALIDATION_ERROR`

## 5.4. FE rendering rule cho search card

Moi card search nen hien thi:

- avatar
- displayName
- bio ngan
- skillsToTeach
- avgRating + totalReviews
- lowestPointCost
- nextScheduledAt
- badge `Online` / `Offline` theo bo loc hien tai, neu FE can

Khuyen nghi CTA:

- `Xem ho so`
- `Xem lich hoc`

---

## 6. API MOI - Companion public detail

### GET `/api/companions/{companionId}`

Trang nay la public detail page cua Companion cho skill dang duoc tim.

### Query params

- `skillId`: guid, bat buoc
- `deliveryMode`: optional
- `location`: bat buoc neu `deliveryMode = Offline`
- `reviewPage`: default `1`
- `reviewLimit`: default `10`

### Vi du

```http
GET /api/companions/22222222-2222-2222-2222-222222222222?skillId=11111111-1111-1111-1111-111111111111&deliveryMode=Offline&location=district%201&reviewPage=1&reviewLimit=10
```

### Response `200`

```json
{
  "companionId": "22222222-2222-2222-2222-222222222222",
  "displayName": "Nguyen Van A",
  "avatarUrl": "https://cdn.edskill.test/u/avatar.png",
  "bio": "Public companion bio",
  "skillsToTeach": ["Speaking", "Presentation"],
  "roles": ["learner", "companion"],
  "totalSessions": 20,
  "lastActiveAt": "2026-05-11T10:00:00Z",
  "avgRating": 4.8,
  "totalReviews": 12,
  "reviews": {
    "data": [
      {
        "reviewId": "44444444-4444-4444-4444-444444444444",
        "rating": 5,
        "comment": "Rat de hieu",
        "reviewerDisplayName": "Tran Thi B",
        "createdAt": "2026-05-10T09:00:00Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 10
  },
  "sessions": [
    {
      "sessionId": "8d70ff0f-3d4c-4e42-97ea-89eb8e7b1111",
      "companionId": "22222222-2222-2222-2222-222222222222",
      "learnerId": null,
      "skill": "Speaking",
      "description": "Mock interview",
      "deliveryMode": "Offline",
      "location": "District 1, Ho Chi Minh City",
      "durationMinutes": 60,
      "pointCost": 100,
      "scheduledAt": "2026-05-12T13:00:00Z",
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
      "createdAt": "2026-05-11T02:00:00Z",
      "updatedAt": "2026-05-11T02:05:00Z"
    }
  ]
}
```

### Rule nghiep vu

- profile phai la public
- reviews la review Companion nhan duoc
- `sessions` chi la session `Available` khop skill/filter nguoi dung dang xem

### Error hay gap

- `404 SKILL_NOT_FOUND`
- `404 PROFILE_NOT_FOUND`
- `403 PROFILE_PRIVATE`
- `422 VALIDATION_ERROR`

### FE page structure khuyen nghi

1. Header:
   - avatar
   - displayName
   - bio
   - avgRating
   - totalReviews
   - totalSessions

2. Skills:
   - `skillsToTeach`

3. Reviews section:
   - list comment
   - sao
   - reviewerDisplayName
   - createdAt
   - pagination `reviewPage`

4. Matching sessions section:
   - chi hien session khop skill dang tim
   - card co:
     - description
     - deliveryMode
     - location neu co
     - pointCost
     - scheduledAt
     - CTA `Dat buoi hoc`

---

## 7. API MOI - Create review

Base route:

```text
/api/reviews
```

Can:

```http
Authorization: Bearer <accessToken>
```

## 7.1. POST `/api/reviews`

### Request

```json
{
  "sessionId": "33333333-3333-3333-3333-333333333333",
  "rating": 5,
  "comment": "Very helpful session"
}
```

### Validation FE nen lam truoc

- `rating`: bat buoc, 1-5
- `comment`: optional
- neu co `comment`, khuyen nghi FE limit 1000 ky tu

### Response `201 Created`

```json
{
  "reviewId": "55555555-5555-5555-5555-555555555555",
  "sessionId": "33333333-3333-3333-3333-333333333333",
  "reviewerId": "66666666-6666-6666-6666-666666666666",
  "revieweeId": "77777777-7777-7777-7777-777777777777",
  "rating": 5,
  "comment": "Very helpful session",
  "createdAt": "2026-05-11T12:00:00Z"
}
```

### Error hay gap

- `404 SESSION_NOT_FOUND`
- `403 NOT_SESSION_PARTICIPANT`
- `409 SESSION_INVALID_STATUS`
- `409 REVIEW_ALREADY_EXISTS`
- `410 REVIEW_WINDOW_CLOSED`
- `422 VALIDATION_ERROR`

### Rule nghiep vu FE phai biet

- chi review duoc session `Completed`
- moi user chi review 1 lan cho 1 session
- chi review trong 48h sau khi session completed
- backend tu suy ra `revieweeId`, FE khong gui len

### FE behavior khuyen nghi

- chi show review form khi:
  - user la participant cua session
  - session status = `Completed`
- sau khi submit thanh cong:
  - disable form hoac hide form
  - local UI co the hien `Da gui danh gia`
- neu gap `REVIEW_ALREADY_EXISTS`:
  - coi nhu user da review roi
  - an form
- neu gap `REVIEW_WINDOW_CLOSED`:
  - an form
  - hien message `Da qua thoi gian danh gia`

---

## 8. Luong FE de nghi

## 8.1. Luong search Companion

```text
User nhap tu khoa skill
-> FE goi GET /api/skills?q=keyword
-> User chon 1 skill trong suggestion
-> FE luu skillId
-> User chon Online hoac Offline
-> Neu Offline: user nhap location
-> FE goi GET /api/companions/search
-> Render list Companion
-> User bam vao 1 Companion
-> FE mo companion detail page
```

## 8.2. Luong companion detail

```text
Page mo voi companionId + skillId + filter hien tai
-> FE goi GET /api/companions/{companionId}
-> Render profile
-> Render reviews
-> Render cac session Available khop skill/filter
-> User bam Dat buoi hoc
-> FE di tiep flow booking session hien co
```

## 8.3. Luong Companion tao session offline

```text
Companion mo form tao session
-> chon skill tu catalog
-> chon Offline
-> nhap location
-> submit POST /api/sessions
-> backend tra SessionDto co deliveryMode=Offline, location=...
-> FE redirect danh sach session hoac session detail
```

## 8.4. Luong hoc online

```text
session Confirmed
-> neu deliveryMode = Online va co jitsiRoomId
-> FE hien Join room
-> user join
-> FE goi /join
-> khi roi phong
-> FE goi /leave
```

## 8.5. Luong hoc offline

```text
session Confirmed
-> FE hien thong tin dia diem
-> KHONG hien Join room
-> KHONG goi /join
-> KHONG goi /leave
-> sau khi hoc xong
-> user dung flow confirm completion hien co
```

## 8.6. Luong review

```text
session da Completed
-> FE check user co the review
-> show form rating/comment
-> user submit POST /api/reviews
-> thanh cong:
   - mark da review
   - cap nhat UI
-> that bai:
   - REVIEW_ALREADY_EXISTS -> an form
   - REVIEW_WINDOW_CLOSED -> an form + thong bao
```

---

## 9. FE checklist update

## 9.1. Breaking update phai lam ngay

- update type cho `CreateSessionRequest`
- update type cho `SessionDto`
- update create session form:
  - skill select luu `skillId`
  - them `deliveryMode`
  - them `location` cho offline
- update session card/detail UI de hien `deliveryMode/location`
- update Jitsi logic de check `deliveryMode = Online`

## 9.2. API moi can tich hop

- them service `searchCompanions`
- them service `getCompanionDetail`
- them service `createReview`

## 9.3. UI moi / update man

- man search Companion theo skill
- man detail Companion
- form review sau session
- update man Companion tao buoi hoc
- update man session detail / session list de phan biet online va offline

---

## 10. De xuat type cho FE

```ts
type SessionDeliveryMode = "Online" | "Offline";

type SessionDto = {
  sessionId: string;
  companionId: string;
  learnerId: string | null;
  skill: string;
  description: string | null;
  deliveryMode: SessionDeliveryMode;
  location: string | null;
  durationMinutes: number;
  pointCost: number;
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

type CreateSessionRequest = {
  skillId: string;
  description?: string | null;
  deliveryMode: SessionDeliveryMode;
  location?: string | null;
  durationMinutes: 30 | 45 | 60 | 90 | 120;
  pointCost: number;
  scheduledAt: string;
};

type CompanionSearchItemDto = {
  companionId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  skillsToTeach: string[];
  avgRating: number;
  totalReviews: number;
  matchingSessionCount: number;
  lowestPointCost: number;
  nextScheduledAt: string;
};

type CompanionDetailDto = {
  companionId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  skillsToTeach: string[];
  roles: string[];
  totalSessions: number;
  lastActiveAt: string | null;
  avgRating: number;
  totalReviews: number;
  reviews: {
    data: {
      reviewId: string;
      rating: number;
      comment: string | null;
      reviewerDisplayName: string;
      createdAt: string;
    }[];
    total: number;
    page: number;
    limit: number;
  };
  sessions: SessionDto[];
};

type CreateReviewRequest = {
  sessionId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string | null;
};
```

---

## 11. Ghi chu cuoi cung cho FE

- Neu FE dang dung tai lieu cu cho session create, can doi sang tai lieu nay ngay.
- Cac API cu khac khong nam trong tai lieu nay thi giu nguyen theo tai lieu da tich hop truoc do.
- Phan discovery/detail/review moi thi chi can doc tai lieu nay, khong can ghep nguoc voi tai lieu cu.
