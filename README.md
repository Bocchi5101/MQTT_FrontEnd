# MQTT FrontEnd — React IoT Dashboard

## เปิดใช้งาน

- ออนไลน์: https://bocchi5101.github.io/MQTT_FrontEnd/ (หลังเปิด GitHub Pages)
- ในเครื่อง: เปิด `index.html` ที่ราก repository หรือ `frontend/Start-Dashboard.cmd`
- อ่านสรุปวิชา: `summary.html`

ไฟล์พร้อมเปิดอยู่ใน index.html และ assets/ ไม่มีการโหลด JSX ตรงจาก browser และไม่ต้องติดตั้ง dependencies เพื่ออ่านหน้าเว็บ

กรอก HiveMQ WebSocket URL เช่น `wss://YOUR-CLUSTER.s1.eu.hivemq.cloud:8884/mqtt`, MQTT username/password และ topic prefix (ค่าเริ่มต้น lab) จากนั้นกดเชื่อมต่อ รหัสผ่านไม่ถูกบันทึกลงไฟล์หรือ localStorage

| Topic | Payload | ทิศทาง |
|---|---|---|
| lab/sensor/temp | 28.5 | ESP → เว็บ |
| lab/sensor/humidity | 65.0 | ESP → เว็บ |
| lab/led/status | ON / OFF | ESP → เว็บ |
| lab/led/control | ON / OFF | เว็บ → ESP |

ESP ต้องส่งสถานะกลับหลังคำสั่งเว็บและการกดปุ่มจริง เว็บรอ status จริง ไม่เปลี่ยน LED บนหน้าจอเพียงเพราะกดปุ่ม เชื่อมต่อ broker ไม่ได้ยืนยันว่าบอร์ดออนไลน์ และ retained status อาจเป็นค่าเก่า

## แก้ไข source

ติดตั้ง Node.js 22.12+ แล้วรันใน frontend:

```sh
npm install
npm run dev
npm test
npm run build
```

หรือใช้ pnpm install --frozen-lockfile ตาม pnpm-lock.yaml ที่แนบมา

- `src/App.jsx`: UI และ MQTT client
- `src/protocol.js`: topic และตรวจข้อมูล
- `src/App.css`: รูปแบบหน้าเว็บ
- `scripts/build.mjs`: build React/MQTT.js ด้วย esbuild เป็น assets/dashboard.js และ CSS ที่ราก
- `scripts/export-site.mjs`: สร้าง index.html และ .nojekyll
- `npm run build:vite`: ทางเลือก Vite build ไป dist สำหรับนักพัฒนา ไม่ใช่ไฟล์ที่ GitHub Pages ใช้

หลังแก้ source ต้อง npm run build แล้ว commit index.html และ assets/ ด้วย หน้า GitHub Pages ใช้ main / (root) โดยตรง ไม่ต้องตั้ง base เป็นชื่อ repository เพราะลิงก์ assets เป็น relative และ bundle เป็น classic script ที่เปิดจาก file:// ได้

## สาเหตุที่เวอร์ชันเดิมเปิดไม่ได้

1. frontend มี JSX source แต่ไม่มี node_modules และ dist หลัง clone เพราะเป็น generated files ที่ไม่ได้อยู่ใน Git
2. ตัวเปิดเดิมต้องใช้ dist และ Vite บนเครื่อง จึงหยุดเมื่อ clone ใหม่
3. index.html ที่รากเป็นสรุปบทเรียน ไม่ใช่ Dashboard
4. Git remote เดิมชี้ไป Bocchi5101.github.io แทน MQTT_FrontEnd

แก้โดยแนบ production assets ที่พร้อมเปิด, ให้ root index เป็น Dashboard และเก็บสรุปเดิมใน summary.html ตัวเปิด Windows ใช้ browser โดยตรง

## การทดสอบ

Protocol tests 3 ข้อผ่าน ตรวจ payload ผิด, ค่าความชื้นนอกช่วง และ topic ที่ไม่เกี่ยวข้อง ในสภาพแวดล้อมผู้ช่วย Node child-process ถูกจำกัด (spawn EPERM) จึงรัน esbuild CLI โดยตรงด้วย options เดียวกับ build.mjs แล้วรัน export-site.mjs เพื่อสร้างไฟล์เผยแพร่

ยังต้องทดสอบกับ HiveMQ credentials และบอร์ดจริงของผู้ใช้ ไม่ฝัง credentials ลง repository
