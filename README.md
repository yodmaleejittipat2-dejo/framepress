# Framepress — Video Compressor & Converter

บีบอัดและแปลงไฟล์วิดีโอ **บนเบราว์เซอร์ของผู้ใช้** ด้วย FFmpeg WebAssembly — ไม่อัปโหลดไฟล์ ไม่มีลายน้ำ
มีโหมดมืด (ค่าเริ่มต้น) / โหมดสว่าง และระบบ **Admin** สำหรับแก้ข้อความบนเว็บและจัดการพรีเซ็ตโดยไม่ต้องแก้โค้ด (Firebase)

**สร้างโดย Jittipat_Editz**

---

## สารบัญ
1. [ตั้งค่า Firebase](#1-ตั้งค่า-firebase-ทำครั้งเดียว)
2. [รันบนเครื่อง](#2-รันบนเครื่อง)
3. [เอาขึ้นเว็บจริงด้วย GitHub Pages](#3-เอาขึ้นเว็บจริงด้วย-github-pages)
4. [ใช้งานหน้า Admin](#4-ใช้งานหน้า-admin)
5. [โครงสร้างโปรเจกต์](#5-โครงสร้างโปรเจกต์)

---

## 1. ตั้งค่า Firebase (ทำครั้งเดียว)

### 1.1 สร้างโปรเจกต์
1. เข้า https://console.firebase.google.com → **Add project** → ตั้งชื่อ เช่น `framepress` → ปิด Google Analytics ได้ → **Create project**
2. หน้าโปรเจกต์ กดไอคอน **`</>`** (Web) → ตั้งชื่อแอป `framepress-web` → **Register app** (ไม่ต้องติ๊ก Hosting)
3. จะเห็นโค้ด `firebaseConfig = { apiKey: "...", authDomain: "...", ... }` → **คัดลอกเก็บไว้** (ใช้ในข้อ 2 และ 3)

### 1.2 เปิดระบบล็อกอิน + สร้างบัญชี Admin
1. เมนูซ้าย **Build → Authentication → Get started**
2. แท็บ **Sign-in method** → เลือก **Email/Password** → เปิด **Enable** (อันบน) → **Save**
3. แท็บ **Users** → **Add user**
   - Email: `jittipat_admin@framepress.app`
   - Password: รหัสผ่านของคุณ
   > หน้า Admin ให้พิมพ์แค่ชื่อผู้ใช้ `jittipat_admin` ระบบจะเติม `@framepress.app` ให้เอง
   > รหัสผ่าน **ไม่ได้อยู่ในโค้ด** — เก็บอยู่ใน Firebase เท่านั้น เปลี่ยนได้ตลอดที่หน้า Users
4. (แนะนำ) แท็บ **Settings → User actions** → ปิด **Enable create (sign-up)** เพื่อไม่ให้ใครสมัครบัญชีเองได้

### 1.3 สร้างฐานข้อมูล Firestore + ใส่กฎความปลอดภัย
1. เมนูซ้าย **Build → Firestore Database → Create database** → เลือก location ใกล้ ๆ (เช่น `asia-southeast1` สิงคโปร์) → **Start in production mode**
2. แท็บ **Rules** → ลบของเดิม แล้ววางเนื้อหาจากไฟล์ [`firestore.rules`](firestore.rules) → **Publish**
   - ทุกคนอ่านข้อความ/พรีเซ็ตได้ (หน้าเว็บต้องใช้)
   - **เขียนได้เฉพาะ** บัญชี `jittipat_admin@framepress.app` เท่านั้น

---

## 2. รันบนเครื่อง

ต้องมี Node.js 18.18+ (แนะนำ 22 LTS)

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

เปิด `.env.local` แล้วใส่ค่าจาก `firebaseConfig` (ข้อ 1.1):

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=framepress-xxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=framepress-xxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=framepress-xxxx.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

```bash
npm run dev
```

- หน้าเว็บ: http://localhost:3000
- หน้า Admin: http://localhost:3000/admin

> ค่า Firebase web config เป็นข้อมูลสาธารณะโดยธรรมชาติ (อยู่ในหน้าเว็บอยู่แล้ว) ความปลอดภัยมาจาก Firestore Rules + บัญชี Admin
> ถ้ายังไม่ใส่ค่า Firebase เว็บก็ยังใช้งานได้ปกติด้วยข้อความ/พรีเซ็ตเริ่มต้น แค่หน้า Admin จะยังใช้ไม่ได้

---

## 3. เอาขึ้นเว็บจริงด้วย GitHub Pages

### 3.1 อัปโหลดโค้ดขึ้น GitHub
1. สมัคร/ล็อกอิน https://github.com → **New repository** → ชื่อ `framepress` → **Public** → **Create repository**
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (**ยกเว้น** `node_modules`, `.next`, `out`, `.env.local` — ไฟล์ `.gitignore` กันไว้ให้แล้วถ้าใช้ git)
   - ง่ายสุด: ใช้ **GitHub Desktop** → File → Add local repository → เลือกโฟลเดอร์ → Publish
   - หรือใช้คำสั่ง:
     ```bash
     git init && git add . && git commit -m "Framepress"
     git branch -M main
     git remote add origin https://github.com/<ชื่อคุณ>/framepress.git
     git push -u origin main
     ```
   > ต้องมีโฟลเดอร์ `.github/workflows/deploy.yml` ขึ้นไปด้วย (เป็นตัวสั่ง build อัตโนมัติ)

### 3.2 ตั้งค่า repo
1. **Settings → Pages** → Source: เลือก **GitHub Actions**
2. **Settings → Secrets and variables → Actions → แท็บ Variables → New repository variable** ใส่ 6 ตัวนี้ (ค่าเดียวกับ `.env.local`):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIza...` |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `xxx.firebaseapp.com` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `xxx` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `xxx.firebasestorage.app` |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123...` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123...:web:...` |

3. แท็บ **Actions** → เลือก **Deploy to GitHub Pages** → **Run workflow** (หรือ push โค้ดใหม่ก็รันเอง) รอ ~2–3 นาทีจนขึ้น ✓ สีเขียว

### 3.3 เปิดใช้งาน
- หน้าเว็บ: `https://<ชื่อคุณ>.github.io/framepress/`
- หน้า Admin: `https://<ชื่อคุณ>.github.io/framepress/admin/`

ใน Firebase → Authentication → **Settings → Authorized domains** → **Add domain** → `<ชื่อคุณ>.github.io`

> **Multi-thread บน GitHub Pages:** GitHub Pages ตั้ง header COOP/COEP ไม่ได้ เว็บจึงใช้ `coi-serviceworker.js` เพิ่ม header ให้ในเบราว์เซอร์
> ครั้งแรกที่เปิดหน้าเว็บจะ **รีโหลดตัวเองหนึ่งครั้ง** (ปกติ) จากนั้นมุมขวาบนจะขึ้น `READY · MT`
>
> อยากใช้ Vercel แทนก็ได้: Import repo ที่ vercel.com แล้วใส่ Environment Variables 6 ตัวเดียวกัน — ไม่ต้องตั้งอะไรเพิ่ม

---

## 4. ใช้งานหน้า Admin

1. ไปที่ `/admin/` → ชื่อผู้ใช้ `jittipat_admin` + รหัสผ่านที่ตั้งในข้อ 1.2
2. แท็บ **ข้อความเว็บ** — แก้ได้ทุกส่วน: ชื่อเว็บ, แถบประกาศ, หัวข้อใหญ่ + คำไฮไลต์, คำอธิบาย, ปุ่ม, ป้าย, แถบฟิล์มวิ่ง, จุดเด่น, ขั้นตอน, FAQ, ข้อความปิดท้าย (เพิ่ม/ลบ/สลับลำดับรายการได้)
3. แท็บ **พรีเซ็ต** — เพิ่ม / ลบ / ทำสำเนา / สลับลำดับ / เปิด-ปิดซ่อนชั่วคราว และตั้งค่า Codec, Speed, CRF หรือขนาดเป้าหมาย, FPS, Resolution, เสียง, Container, กลุ่ม, ไอคอน (ปุ่ม **อัตโนมัติ** สร้างคำอธิบายจากค่าที่ตั้ง)
4. กด **บันทึก** ที่แถบด้านล่าง → หน้าเว็บของทุกคนอัปเดตทันที (ไม่ต้อง deploy ใหม่)
5. **คืนค่าเริ่มต้น** ใช้ย้อนทุกอย่างกลับเป็นค่าตั้งต้น (ต้องกดบันทึกเพื่อยืนยัน)

เครดิต **“สร้างโดย Jittipat_Editz”** แสดงถาวรใน footer และไม่ขึ้นกับข้อมูลใน Admin

---

## ฟีเจอร์ทั้งหมด

| ฟีเจอร์ | อยู่ตรงไหน |
|---|---|
| บีบ/แปลงไฟล์แบบ HandBrake + พรีเซ็ต | Workspace → โหมดง่าย |
| **ตัดช่วงคลิป** (แถบเลื่อนจุดเริ่ม/จบ, ตั้งจากตำแหน่งวิดีโอ) | ใต้ตัวอย่างวิดีโอ |
| **ประมาณขนาด + ทดลอง 5 วินาที** | การ์ด Process ก่อนกดเริ่ม |
| **บีบหลายไฟล์ (คิว) + ดาวน์โหลดทั้งหมด .zip** | ลาก/เลือกหลายไฟล์พร้อมกัน |
| **โหมดคำสั่ง FFmpeg + แนบไฟล์เพิ่ม** (โลโก้, เพลง) | Settings → คำสั่ง FFmpeg |
| ภาษาไทย / English | ปุ่ม EN/TH บนเมนู (เลือกตามภาษาเบราว์เซอร์อัตโนมัติ) |
| โหมดมืด / สว่าง | ปุ่มพระอาทิตย์/พระจันทร์ |
| **ตัวนับ "บีบไปแล้ว X ไฟล์"** (ไม่ระบุตัวตน) | หน้าแรก · เปิด/ปิดใน Admin |
| **เตือนเบราว์เซอร์ที่ไม่รองรับ / เบราว์เซอร์ในแอป** | อัตโนมัติ |
| **หน้า License & Privacy** | `/legal/` (ลิงก์ใน footer) |
| **ภาพตอนแชร์ลิงก์ + ติดตั้งเป็นแอป (PWA)** | `public/og.png`, `app/manifest.ts` |
| Admin: แก้ข้อความ **ไทย + อังกฤษ**, พรีเซ็ต (มีชื่อ EN), **ประวัติ 30 เวอร์ชัน + ย้อนกลับ**, **Export/Import JSON** | `/admin/` |

> **สำคัญ — อัปเดต Firestore Rules** ทุกครั้งที่อัปเดตเวอร์ชันนี้: Firebase → Firestore Database → Rules → วางเนื้อหาใหม่จาก `firestore.rules` → Publish
> (เพิ่มสิทธิ์ให้ `site/content_en`, `history` และตัวนับ `stats/global`)

## 5. โครงสร้างโปรเจกต์

```
app/
  page.tsx                หน้าเว็บหลัก
  admin/page.tsx          หน้า Admin (login + dashboard)
  layout.tsx              ฟอนต์, สคริปต์ธีม (กันจอกะพริบ), coi-serviceworker
  globals.css             Design system: โทเคนสี dark/light, ปุ่ม, panel, filmstrip ฯลฯ
components/               Navbar, Hero, Filmstrip, FileUploader, SettingsPanel, ProgressCard, LogConsole, Sections, Footer, ThemeToggle
components/admin/         ContentEditor, PresetEditor, fields
hooks/useFFmpeg.ts        โหลด engine, อ่านข้อมูลไฟล์, รันคำสั่ง, progress, cancel, fallback อัตโนมัติ
lib/
  content.ts              ข้อความ + พรีเซ็ตเริ่มต้น (ใช้เมื่อ Firestore ยังว่าง)
  firebase.ts             เชื่อม Firebase จาก env
  site.ts                 subscribe ข้อมูลแบบ realtime + บันทึก
  buildArgs.ts            แปลงค่าตั้ง → คำสั่ง FFmpeg
firestore.rules           กฎความปลอดภัย Firestore
.github/workflows/deploy.yml   Build + deploy GitHub Pages อัตโนมัติ
```

### ข้อจำกัดของ ffmpeg.wasm ที่ระบบจัดการให้แล้ว
| ปัญหา | วิธีจัดการ |
|---|---|
| core multi-thread crash ถ้าไม่ระบุจำนวนเธรด | ใส่ `-threads 4` ให้อัตโนมัติ / crash กลางงาน → สลับ single-thread แล้วรันใหม่ |
| VP9 crash ใน ffmpeg.wasm ทุกเวอร์ชันที่ทดสอบ | ลอง VP9 ก่อน ถ้าล้มเหลวสลับเป็น VP8 (WebM) และแจ้งใน log |
| libopus crash กับเสียง stereo | ใช้ Opus encoder ตัว native ของ FFmpeg แทน |
| หน่วยความจำ WASM ~2GB | แจ้งให้ใช้ไฟล์เล็กลง/ลดความละเอียด |

License: FFmpeg core มี libx264/libx265 (GPL) — ควรระบุ license ของ FFmpeg/ffmpeg.wasm เมื่อเผยแพร่สาธารณะ
