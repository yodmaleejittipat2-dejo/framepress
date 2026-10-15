"use client";
import type { FaqItem, SiteContent, TextItem } from "@/lib/content";
import { AreaField, Card, PairList, StringList, TextField } from "./fields";

export default function ContentEditor({ value, onChange }: { value: SiteContent; onChange: (v: SiteContent) => void }) {
  const set = <K extends keyof SiteContent>(k: K) => (v: SiteContent[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <Card title="แบรนด์ & ประกาศ" desc="ชื่อเว็บที่แสดงบนเมนู และแถบประกาศด้านบน (เว้นว่างเพื่อซ่อน)">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="ชื่อเว็บ" value={value.siteName} onChange={set("siteName")} />
          <TextField label="คำโปรย (ใต้ชื่อ)" value={value.tagline} onChange={set("tagline")} />
        </div>
        <TextField label="ข้อความประกาศ" hint="เว้นว่าง = ไม่แสดง" value={value.announcement} onChange={set("announcement")} placeholder="เช่น 🎉 เพิ่มพรีเซ็ต Instagram Reels แล้ว!" />
      </Card>

      <Card title="ส่วนหัว (Hero)" desc="ข้อความใหญ่ด้านบนสุดของหน้าเว็บ">
        <TextField label="บรรทัดเล็กด้านบน" value={value.heroEyebrow} onChange={set("heroEyebrow")} />
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <TextField label="หัวข้อใหญ่" value={value.heroTitle} onChange={set("heroTitle")} />
          <TextField label="คำที่ไฮไลต์" hint="ต้องอยู่ในหัวข้อ" value={value.heroHighlight} onChange={set("heroHighlight")} />
        </div>
        <AreaField label="คำอธิบาย" value={value.heroDescription} onChange={set("heroDescription")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="ปุ่มหลัก" value={value.heroPrimaryCta} onChange={set("heroPrimaryCta")} />
          <TextField label="ปุ่มรอง" value={value.heroSecondaryCta} onChange={set("heroSecondaryCta")} />
        </div>
        <StringList label="ป้ายใต้ปุ่ม (chips)" items={value.chips} onChange={set("chips")} />
        <StringList label="ข้อความแถบฟิล์มวิ่ง" hint="แนะนำตัวพิมพ์ใหญ่สั้น ๆ" items={value.marquee} onChange={set("marquee")} />
      </Card>

      <Card title="พื้นที่ทำงาน (Workspace)">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <TextField label="ป้ายหัวข้อ" value={value.workspaceEyebrow} onChange={set("workspaceEyebrow")} />
          <TextField label="หัวข้อ" value={value.workspaceTitle} onChange={set("workspaceTitle")} />
        </div>
        <TextField label="คำอธิบายสั้น" value={value.workspaceSubtitle} onChange={set("workspaceSubtitle")} />
      </Card>

      <Card title="จุดเด่น (Features)">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <TextField label="ป้ายหัวข้อ" value={value.featuresEyebrow} onChange={set("featuresEyebrow")} />
          <TextField label="หัวข้อ" value={value.featuresTitle} onChange={set("featuresTitle")} />
        </div>
        <PairList<TextItem> label="การ์ดจุดเด่น" items={value.features} onChange={set("features")} keys={["title", "body"]} labels={["หัวข้อการ์ด", "รายละเอียด"]} blank={{ title: "", body: "" }} />
      </Card>

      <Card title="ขั้นตอนการใช้งาน">
        <TextField label="ป้ายหัวข้อ" value={value.stepsEyebrow} onChange={set("stepsEyebrow")} />
        <PairList<TextItem> label="ขั้นตอน" items={value.steps} onChange={set("steps")} keys={["title", "body"]} labels={["ชื่อขั้นตอน", "รายละเอียด"]} blank={{ title: "", body: "" }} />
      </Card>

      <Card title="คำถามพบบ่อย (FAQ)">
        <TextField label="ป้ายหัวข้อ" value={value.faqEyebrow} onChange={set("faqEyebrow")} />
        <PairList<FaqItem> label="คำถาม–คำตอบ" items={value.faq} onChange={set("faq")} keys={["q", "a"]} labels={["คำถาม", "คำตอบ"]} blank={{ q: "", a: "" }} />
      </Card>

      <Card title="ปิดท้าย & Footer" desc="เครดิต “สร้างโดย Jittipat_Editz” แสดงถาวรใน footer">
        <TextField label="หัวข้อชวนเริ่มใช้งาน" value={value.ctaTitle} onChange={set("ctaTitle")} />
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <TextField label="คำอธิบาย" value={value.ctaSubtitle} onChange={set("ctaSubtitle")} />
          <TextField label="ข้อความปุ่ม" value={value.ctaButton} onChange={set("ctaButton")} />
        </div>
        <TextField label="ข้อความใน footer" value={value.footerNote} onChange={set("footerNote")} />
      </Card>
    </div>
  );
}
