# FrontEnd source

ดู [README หลัก](../README.md) สำหรับวิธีเปิดหน้าเว็บ ตั้งค่า MQTT และ build

เปิดใช้งานทันที: ดับเบิลคลิก Start-Dashboard.cmd หรือ ../index.html (ไม่ต้องมี dist หรือ Node.js)

แก้ไข source: npm install แล้ว npm run dev

สร้างหน้าเว็บพร้อมเผยแพร่: npm run build สร้าง ../assets/dashboard.js, ../assets/dashboard.css และ ../index.html

ทดสอบ: npm test

ไฟล์ App.jsx คือส่วน JavaScript/React ที่รับข้อมูล MQTT แสดงค่า และจัดการปุ่ม LED
