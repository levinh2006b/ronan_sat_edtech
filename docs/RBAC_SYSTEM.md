# RBAC System Design

## 1. Muc tieu

Tai lieu nay liet ke:

- Toan bo `permissions` co the xay ra trong web app SAT hien tai
- Cach nhom cac permission vao 3 role muc tieu: `STUDENT`, `PARENT`, `ADMIN`
- Cac permission bo sung can co de ho tro flow "Phu huynh lien ket voi con bang email + verification code"

Luu y quan trong:

- Code hien tai trong du an dang moi co `user` va `admin`
- Trong tai lieu nay:
  - `user` hien tai duoc map thanh `STUDENT`
  - `PARENT` la role muc tieu can them moi

## 2. Resource chinh trong he thong

Nhung resource/chuc nang chinh dang co hoac nen co trong app:

1. `Auth`
2. `User Account`
3. `Parent-Student Link`
4. `Test`
5. `Question`
6. `Result`
7. `Progress / Analytics`
8. `Leaderboard / Hall of Fame`
9. `Review / AI Chat`
10. `PDF / Export`
11. `Admin Dashboard`
12. `System / Role Management`

## 3. Danh sach Permissions

Ten permission nen dat theo format:

- `resource.action`
- Vi du: `test.read`, `result.create`, `user.updateSelf`

### 3.1 Auth

- `auth.registerStudent`
- `auth.login`
- `auth.logout`
- `auth.googleLogin`
- `auth.forgotPassword`
- `auth.resetPassword`
- `auth.changeOwnPassword`

### 3.2 User Account

- `user.readSelf`
- `user.updateSelfProfile`
- `user.readOwnRole`
- `user.readAny`
- `user.create`
- `user.updateAny`
- `user.deleteAny`
- `user.assignRole`

### 3.3 Parent-Student Link

Day la nhom permission ban can them de ho tro flow phu huynh:

- `parentLink.requestChildVerification`
- `parentLink.verifyChildCode`
- `parentLink.create`
- `parentLink.readOwnChildren`
- `parentLink.readLinkedParents`
- `parentLink.deleteOwnLink`
- `parentLink.manageAny`

### 3.4 Test

- `test.readList`
- `test.readDetail`
- `test.create`
- `test.update`
- `test.delete`
- `test.publish`
- `test.unpublish`

### 3.5 Question

- `question.readByTest`
- `question.readExplanation`
- `question.create`
- `question.update`
- `question.delete`
- `question.bulkImport`

### 3.6 Result

- `result.createOwn`
- `result.readOwn`
- `result.readChild`
- `result.readAny`
- `result.updateOwn`
- `result.deleteOwn`
- `result.deleteAny`

Ghi chu:

- Trong mo hinh thong thuong, `result.updateOwn` chi nen dung cho bai dang lam/chua chot.
- Sau khi nop bai xong, ket qua nen khoa, khong cho sua tu do.

### 3.7 Progress / Analytics

- `progress.readOwn`
- `progress.readChild`
- `progress.readAny`
- `progress.exportOwn`
- `progress.exportChild`
- `progress.exportAny`

### 3.8 Leaderboard / Hall of Fame

- `leaderboard.read`
- `leaderboard.createStudentCard`
- `leaderboard.updateStudentCard`
- `leaderboard.deleteStudentCard`

### 3.9 Review / AI Chat

- `review.readOwn`
- `review.readChild`
- `review.chatOwn`
- `review.chatChild`
- `review.deleteOwnChat`
- `review.readAny`

### 3.10 PDF / Export

- `pdf.readOwn`
- `pdf.readChild`
- `pdf.exportOwn`
- `pdf.exportChild`
- `pdf.exportAny`

### 3.11 Admin Dashboard / Backoffice

- `admin.accessDashboard`
- `admin.manageTests`
- `admin.manageQuestions`
- `admin.manageStudents`
- `admin.manageUsers`
- `admin.viewSystemStats`

## 4. Nhom Permission theo Role

## 4.1 STUDENT

`STUDENT` la hoc sinh dang hoc va lam bai.

Duoc phep:

- `auth.registerStudent`
- `auth.login`
- `auth.logout`
- `auth.googleLogin`
- `auth.forgotPassword`
- `auth.resetPassword`
- `auth.changeOwnPassword`
- `user.readSelf`
- `user.updateSelfProfile`
- `user.readOwnRole`
- `parentLink.readLinkedParents`
- `test.readList`
- `test.readDetail`
- `question.readByTest`
- `question.readExplanation`
- `result.createOwn`
- `result.readOwn`
- `progress.readOwn`
- `progress.exportOwn`
- `leaderboard.read`
- `review.readOwn`
- `review.chatOwn`
- `pdf.readOwn`
- `pdf.exportOwn`

Khong duoc phep:

- Xem du lieu cua hoc sinh khac
- Sua/xoa de thi
- Tao/sua/xoa cau hoi
- Xem tat ca user
- Gan role
- Vao admin dashboard

## 4.2 PARENT

`PARENT` la tai khoan phu huynh da lien ket hop le voi it nhat 1 hoc sinh.

Duoc phep:

- `auth.login`
- `auth.logout`
- `auth.forgotPassword`
- `auth.resetPassword`
- `auth.changeOwnPassword`
- `user.readSelf`
- `user.updateSelfProfile`
- `user.readOwnRole`
- `parentLink.requestChildVerification`
- `parentLink.verifyChildCode`
- `parentLink.create`
- `parentLink.readOwnChildren`
- `parentLink.deleteOwnLink`
- `test.readList`
- `test.readDetail`
- `question.readExplanation`
- `result.readChild`
- `progress.readChild`
- `progress.exportChild`
- `leaderboard.read`
- `review.readChild`
- `pdf.readChild`
- `pdf.exportChild`

Khong duoc phep:

- Lam bai thi thay con
- Tao ket qua cho con
- Sua ket qua cua con
- Xem du lieu cua hoc sinh khong lien ket
- Tao/sua/xoa de thi
- Tao/sua/xoa cau hoi
- Vao admin dashboard
- Gan role

Khuyen nghi nghiep vu:

- `PARENT` chi nen co quyen `read` du lieu hoc tap cua con
- Khong nen cho `PARENT` chat AI thay hoc sinh neu ban muon giu logic "hoc sinh tu hoc"
- Neu van muon cho xem phan review, chi nen `readChild`, khong nen `review.chatChild`

## 4.3 ADMIN

`ADMIN` la role quan tri toan he thong.

Duoc phep:

- Toan bo permission cua `STUDENT` neu can
- `user.readAny`
- `user.create`
- `user.updateAny`
- `user.deleteAny`
- `user.assignRole`
- `parentLink.manageAny`
- `test.create`
- `test.update`
- `test.delete`
- `test.publish`
- `test.unpublish`
- `question.create`
- `question.update`
- `question.delete`
- `question.bulkImport`
- `result.readAny`
- `result.deleteAny`
- `progress.readAny`
- `progress.exportAny`
- `leaderboard.createStudentCard`
- `leaderboard.updateStudentCard`
- `leaderboard.deleteStudentCard`
- `review.readAny`
- `pdf.exportAny`
- `admin.accessDashboard`
- `admin.manageTests`
- `admin.manageQuestions`
- `admin.manageStudents`
- `admin.manageUsers`
- `admin.viewSystemStats`

## 5. Bang tong hop nhanh

| Permission | STUDENT | PARENT | ADMIN |
| --- | --- | --- | --- |
| `auth.login` | Yes | Yes | Yes |
| `auth.registerStudent` | Yes | No | Optional |
| `user.readSelf` | Yes | Yes | Yes |
| `user.updateSelfProfile` | Yes | Yes | Yes |
| `user.readAny` | No | No | Yes |
| `user.assignRole` | No | No | Yes |
| `parentLink.requestChildVerification` | No | Yes | Yes |
| `parentLink.verifyChildCode` | No | Yes | Yes |
| `parentLink.create` | No | Yes | Yes |
| `parentLink.readOwnChildren` | No | Yes | Yes |
| `test.readList` | Yes | Yes | Yes |
| `test.readDetail` | Yes | Yes | Yes |
| `test.create` | No | No | Yes |
| `test.update` | No | No | Yes |
| `test.delete` | No | No | Yes |
| `question.readByTest` | Yes | No direct | Yes |
| `question.readExplanation` | Yes | Yes | Yes |
| `question.create` | No | No | Yes |
| `question.update` | No | No | Yes |
| `question.delete` | No | No | Yes |
| `result.createOwn` | Yes | No | Optional |
| `result.readOwn` | Yes | No | Yes |
| `result.readChild` | No | Yes | Yes |
| `result.readAny` | No | No | Yes |
| `progress.readOwn` | Yes | No | Yes |
| `progress.readChild` | No | Yes | Yes |
| `leaderboard.read` | Yes | Yes | Yes |
| `leaderboard.createStudentCard` | No | No | Yes |
| `review.readOwn` | Yes | No | Yes |
| `review.readChild` | No | Yes | Yes |
| `review.chatOwn` | Yes | No | Yes |
| `pdf.exportOwn` | Yes | No | Yes |
| `pdf.exportChild` | No | Yes | Yes |
| `admin.accessDashboard` | No | No | Yes |

## 6. Flow Parent ma ban dang dinh lam

Flow nghiep vu de xay dung role `PARENT`:

1. Phu huynh bam "Toi la phu huynh"
2. Nhap email cua hoc sinh
3. He thong kiem tra email hoc sinh co ton tai khong
4. He thong tao `verification code` ngan han
5. He thong gui code den email cua hoc sinh
6. Hoc sinh dua code cho phu huynh
7. Phu huynh nhap code
8. Server verify code hop le
9. Tao tai khoan parent neu chua co, hoac dang nhap parent neu da co
10. Tao ban ghi lien ket `parentId <-> studentId`
11. Parent duoc access trang rieng chi danh cho role `PARENT`
12. Parent chi doc du lieu tien do hoc cua nhung hoc sinh da lien ket

Permission lien quan toi flow nay:

- `parentLink.requestChildVerification`
- `parentLink.verifyChildCode`
- `parentLink.create`
- `parentLink.readOwnChildren`
- `result.readChild`
- `progress.readChild`
- `review.readChild`
- `pdf.readChild`

## 7. Resource/Model nen them de ho tro Parent RBAC

Ban nen them it nhat 2 model hoac collection:

### 7.1 ParentStudentLink

De luu lien ket giua parent va student.

Truong goi y:

- `parentId`
- `studentId`
- `status` (`pending`, `active`, `revoked`)
- `createdAt`
- `verifiedAt`

### 7.2 ParentVerificationCode

De luu ma xac minh gui cho hoc sinh.

Truong goi y:

- `studentId`
- `studentEmail`
- `codeHash`
- `expiresAt`
- `attemptCount`
- `createdByIp`
- `usedAt`

## 8. Rule RBAC quan trong can ap dung

Khong chi check role, ma con phai check ownership.

Vi du:

- `STUDENT` duoc `result.readOwn`, nhung chi voi ket qua co `userId = session.user.id`
- `PARENT` duoc `result.readChild`, nhung chi voi `studentId` da lien ket voi parent do
- `ADMIN` moi duoc `test.create`, `question.create`, `user.assignRole`

Noi ngan gon:

- `role check` tra loi cau hoi: "nguoi nay thuoc nhom nao?"
- `ownership/link check` tra loi cau hoi: "nguoi nay co duoc xem du lieu cua object cu the nay khong?"

## 9. Mapping voi code hien tai

Theo code hien tai trong repo:

- `user` hien tai nen doi ten logic thanh `STUDENT`
- `admin` giu nguyen la `ADMIN`
- Can them role moi: `PARENT`

Nhung noi se can cap nhat khi them RBAC day du:

1. `lib/models/User.ts`
   Them enum role tu `["user", "admin"]` thanh `["student", "parent", "admin"]`
2. `types/next-auth.d.ts`
   Them role `parent`
3. `lib/authOptions.ts`
   Dam bao session/jwt tra ve dung role moi
4. Middleware/trang protected
   Chan truy cap trang parent cho role khac
5. API routes
   Them check role + ownership theo permission

## 10. De xuat implementation thu tu

Neu ban muon lam RBAC chac tay, nen di theo thu tu nay:

1. Chot danh sach role: `STUDENT`, `PARENT`, `ADMIN`
2. Chot danh sach permission o muc 3
3. Them model `ParentStudentLink`
4. Them API cho flow parent verification
5. Them helper check permission, vi du:
   - `hasRole(session, "ADMIN")`
   - `canReadChild(parentId, studentId)`
6. Bao ve page parent dashboard
7. Bao ve cac API `results`, `progress`, `review`, `pdf`
8. Sau cung moi nang cap UI

## 11. Ban rut gon de dua vao code

Neu muon co ban rut gon de implement nhanh, co the dung mapping sau:

```ts
const ROLE_PERMISSIONS = {
  STUDENT: [
    "auth.login",
    "user.readSelf",
    "user.updateSelfProfile",
    "test.readList",
    "test.readDetail",
    "question.readByTest",
    "question.readExplanation",
    "result.createOwn",
    "result.readOwn",
    "progress.readOwn",
    "review.readOwn",
    "review.chatOwn",
    "pdf.exportOwn",
  ],
  PARENT: [
    "auth.login",
    "user.readSelf",
    "user.updateSelfProfile",
    "parentLink.requestChildVerification",
    "parentLink.verifyChildCode",
    "parentLink.create",
    "parentLink.readOwnChildren",
    "result.readChild",
    "progress.readChild",
    "review.readChild",
    "pdf.exportChild",
  ],
  ADMIN: ["*"],
};
```

## 12. Ket luan

Voi du an nay, bo 3 role hop ly nhat la:

- `STUDENT`: hoc, lam bai, xem ket qua cua chinh minh
- `PARENT`: chi doc tien do hoc cua con da lien ket
- `ADMIN`: quan tri noi dung, user, va du lieu he thong

Dieu quan trong nhat khi lam RBAC cho bai toan parent la:

- Khong chi phan quyen theo role
- Ma phai phan quyen theo quan he lien ket `parent <-> child`

Neu chi check `role === "parent"` ma khong check lien ket, parent A co the doc du lieu cua child B, do la loi bao mat nghiem trong.
