# EdSkill FE Update - Create Session Online-Only + Owned Teaching Skills

Tai lieu nay la delta integration cho FE sau khi backend siet lai flow `Create Session`.

Muc tieu:

- Companion chi duoc mo buoi hoc voi skill day ma ho dang so huu.
- Form tao buoi hoc khong con cho chon hinh thuc hoc.
- FE phai dung `teachingSkills` tu profile de build dropdown skill.
- `POST /api/sessions` da doi request contract.

Tai lieu nay chi cover delta cho:

- `GET /api/profile/me`
- `GET /api/profile/{userId}`
- `POST /api/sessions`

Neu can full contract Formula Pricing/session flow thi doc them:

- `docs/intergartion/EdSkill_FE_Integration_Formula_Pricing_V1.md`
- `docs/intergartion/EdSkill_Profile_FE_Integration.md`

---

## 1. Thay doi nghiep vu chinh

1. Session offer moi luon la `online`.
2. FE khong hien thi dropdown/radio `deliveryMode` nua.
3. FE khong hien thi input `location` nua trong man `Create Session`.
4. Companion chi duoc chon skill nam trong `ProfileDto.teachingSkills`.
5. Backend van giu `deliveryMode` va `location` trong `SessionDto` de tuong thich response cu:
   - `deliveryMode` luon la `"Online"`
   - `location` luon la `null`

---

## 2. Profile response addition

Backend da them 2 field additive vao `ProfileDto`:

- `teachingSkills`
- `learningSkills`

Moi item co shape:

```ts
export interface ProfileSkillDto {
  skillId: string;
  name: string;
  iconKey: string | null;
}
```

### 2.1. FE phai dung field nao

- Van co the giu `skillsToTeach` va `skillsToLearn` de render text/tag nhu cu.
- Man `Create Session` phai dung `teachingSkills` lam source of truth.
- FE khong duoc map nguoc tu text `skillsToTeach[]` de tu tim `skillId`.

### 2.2. Vi du `GET /api/profile/me`

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
    "https://cdn.edskill.test/degree/2a9e7a90/cert-1.pdf"
  ],
  "credentialCount": 1,
  "skillsToTeach": ["Presentation", "Speaking"],
  "skillsToLearn": ["React"],
  "teachingSkills": [
    {
      "skillId": "8e5a3f2c-8d35-4d83-8e85-a3156a5e0001",
      "name": "Presentation",
      "iconKey": "paintbrush"
    },
    {
      "skillId": "8e5a3f2c-8d35-4d83-8e85-a3156a5e0002",
      "name": "Speaking",
      "iconKey": "languages"
    }
  ],
  "learningSkills": [
    {
      "skillId": "8e5a3f2c-8d35-4d83-8e85-a3156a5e0003",
      "name": "React",
      "iconKey": "code"
    }
  ],
  "isPublic": true,
  "roles": ["learner", "companion"],
  "totalSessions": 4,
  "lastActiveAt": "2026-05-13T08:40:00Z",
  "isCompanionOnboardingComplete": true,
  "missingCompanionProfileFields": []
}
```

### 2.3. FE implementation note

Khi load form tao buoi hoc:

1. Goi `GET /api/profile/me`.
2. Doc `isCompanionOnboardingComplete`.
3. Neu `false`, khoa form va show checklist onboarding.
4. Neu `true`, render dropdown skill tu `teachingSkills`.

---

## 3. `POST /api/sessions` contract moi

### 3.1. Request body moi

FE chi gui:

```json
{
  "skillId": "8e5a3f2c-8d35-4d83-8e85-a3156a5e0002",
  "description": "Luyen giao tiep co ban",
  "durationOptions": [60],
  "scheduledAt": "2026-05-20T09:00:00Z"
}
```

### 3.2. Da bo khoi request

Khong gui nua:

- `deliveryMode`
- `location`

### 3.3. Rule duration giu nguyen

- FE moi van nen gui 1 phan tu duy nhat trong `durationOptions`.
- Gia tri do la `moc lon nhat` companion muon mo.
- Backend se tu mo rong cac moc nho hon hop le trong response.

Vi du:

- gui `[120]` -> response co `durationOptions = [30,45,60,90,120]`
- gui `[90]` -> response co `[30,45,60,90]`

---

## 4. Error handling moi FE can map

### 4.1. Business error moi

Neu skill duoc chon khong nam trong `teachingSkills`, backend tra:

```json
{
  "errorCode": "COMPANION_SKILL_NOT_OWNED",
  "errorMessage": "Companion can only create session offers for owned teaching skills."
}
```

FE map:

- inline error field skill: `Ban chi duoc mo buoi hoc voi ky nang dang so huu trong ho so day hoc`

### 4.2. Error cu van con

- `SKILL_NOT_FOUND`
- `INVALID_DURATION_OPTIONS`
- `SESSION_TIME_CONFLICT`
- `SESSION_LIMIT_REACHED`
- `COMPANION_PROFILE_INCOMPLETE`
- `FORBIDDEN`

---

## 5. FE thay doi bat buoc tren UI

### 5.1. Form `Create Session`

Xoa hoan toan:

- dropdown/radio `deliveryMode`
- input `location`
- moi validation lien quan offline/location

Giu lai:

- skill
- description
- duration
- scheduledAt

### 5.2. Skill picker

Render moi item dropdown tu `teachingSkills`:

- `name`
- `iconKey` neu FE da co local icon mapping

State de xuat:

```ts
export type CreateSessionSkillOption = {
  skillId: string;
  name: string;
  iconKey: string | null;
};
```

### 5.3. Payload builder

```ts
export type CreateSessionPayload = {
  skillId: string;
  description?: string | null;
  durationOptions: number[];
  scheduledAt: string;
};

export function buildCreateSessionPayload(input: {
  selectedSkillId: string;
  description: string;
  selectedMaxDuration: 30 | 45 | 60 | 90 | 120;
  scheduledAtIso: string;
}): CreateSessionPayload {
  return {
    skillId: input.selectedSkillId,
    description: input.description.trim() || null,
    durationOptions: [input.selectedMaxDuration],
    scheduledAt: input.scheduledAtIso,
  };
}
```

---

## 6. Response compatibility FE can rely on

`SessionDto` khong doi shape response.

FE van nhan:

- `deliveryMode`
- `location`

Nhung voi session moi tao theo flow nay:

- `deliveryMode === "Online"`
- `location === null`

FE render recommendation:

- hien chip `Online` nhu cu neu UI dang dung field nay
- khong render block dia diem khi `location = null`

---

## 7. Checklist cho AI FE

1. Update type `ProfileDto` de them `teachingSkills` va `learningSkills`.
2. Tao type `ProfileSkillDto`.
3. Update loader cua man `Create Session`:
   - goi `GET /api/profile/me`
   - gate theo `isCompanionOnboardingComplete`
   - build skill dropdown tu `teachingSkills`
4. Xoa UI `deliveryMode` va `location`.
5. Update payload `POST /api/sessions`:
   - chi gui `skillId`, `description`, `durationOptions`, `scheduledAt`
6. Map loi `COMPANION_SKILL_NOT_OWNED` vao field skill.
7. Khong tu suy luan `skillId` tu text name.
8. Neu UI session detail/list dang hien thi `deliveryMode`, giu nguyen render chip `Online` tu response.

---

## 8. Output expectation cho AI FE

AI FE nen giao ra it nhat:

1. Update types/contracts.
2. Update create-session form UI.
3. Update API client cho `POST /api/sessions`.
4. Update error mapping.
5. Update create-session gate de dung `teachingSkills`.
