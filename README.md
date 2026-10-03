# คิวงาน + LINE meeting bot

Next.js 16 บน Vercel

- `/` — เว็บแอป "คิวงาน" (แอดลง Home Screen ของ iPhone ได้)
  - **ว่างไหม** — เช็กวันเวลาที่มีคนถาม เทียบกับปฏิทิน Outlook ได้ข้อความตอบกลับ และปุ่มเปิดฟอร์มลงนัดใน Outlook
  - **เสนอเวลา** — หาช่วงว่างในช่วงวันที่ ติ๊กเลือก คัดลอกข้อความ และกันช่วงที่เสนอไว้ไม่ให้เสนอซ้ำ
  - **Teamup** — ส่งช่วงว่างเข้าปฏิทิน Teamup ที่ได้รับลิงก์มาผ่าน Teamup API
- `/api/line/webhook` — LINE bot (เฟส 2)

## ตัวแปรใน Vercel (Settings → Environment Variables)

| ชื่อ | ค่า |
| --- | --- |
| `ICS_URL` | ลิงก์ ICS ที่เผยแพร่จาก Outlook (เก็บเป็นความลับ) |
| `APP_PIN` | PIN สำหรับเข้าแอป อย่างน้อย 6 ตัว |
| `TEAMUP_API_KEY` | API key ของ Teamup ขอฟรีที่ https://teamup.com/api-keys/request |
| `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` | ของ LINE bot เดิม |

## ข้อจำกัด

- อ่านปฏิทินจาก ICS ที่ Outlook เผยแพร่ นัดที่เพิ่งลงอาจยังไม่ขึ้นทันที
- ช่องที่กันไว้และการตั้งค่าเก็บในเครื่องแต่ละเครื่อง (localStorage)

## พัฒนาในเครื่อง

```bash
npm install
ICS_URL=... APP_PIN=... npm run dev
```
