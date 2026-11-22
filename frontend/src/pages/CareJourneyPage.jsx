import React, { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, List, Modal, Row, Select, Space, Statistic, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useLanguage } from "../utils/language";

const storageKey = "vitacare_care_items";

export default function CareExpensesPage() {
   const { language, t } = useLanguage();
   const [items, setItems] = useState(() => {
      try {
         const saved = JSON.parse(localStorage.getItem(storageKey));
         return Array.isArray(saved) ? saved.filter((item) => item.custom) : [];
      } catch {
         return [];
      }
   });
   const [rate, setRate] = useState(70);
   const [open, setOpen] = useState(false);
   const [form] = Form.useForm();

   useEffect(() => {
      localStorage.setItem(storageKey, JSON.stringify(items));
   }, [items]);

   const categories = [
      { value: "consult", label: t("Consultation", "Consultation", "استشارة") },
      { value: "tests", label: t("Analyses", "Lab tests", "تحاليل") },
      { value: "imaging", label: t("Imagerie", "Imaging", "تصوير طبي") },
      { value: "medication", label: t("Pharmacie", "Pharmacy", "صيدلية") },
      { value: "other", label: t("Autre", "Other", "أخرى") },
   ];
   const statuses = [
      { value: "none", label: t("Non envoyé", "Not submitted", "لم يُرسل") },
      { value: "sent", label: t("Envoyé", "Submitted", "تم الإرسال") },
      { value: "refunded", label: t("Remboursé", "Reimbursed", "تم التعويض") },
   ];
   const totals = [
      [t("Montant payé", "Amount paid", "المبلغ المدفوع"), items.reduce((sum, item) => sum + item.paid, 0)],
      [t("En attente (estimation)", "Pending (estimate)", "قيد الانتظار (تقديري)"), estimate("sent")],
      [t("Remboursé (estimation)", "Reimbursed (estimate)", "تم التعويض (تقديري)"), estimate("refunded")],
   ];

   function estimate(status) {
      return items.filter((item) => item.claim === status && item.cat !== "other")
         .reduce((sum, item) => sum + Math.round(item.paid * rate / 100), 0);
   }

   const money = (amount) => new Intl.NumberFormat(language, { style: "currency", currency: "TND" }).format(amount);
   const add = ({ title, paid, cat, claim }) => {
      setItems((previous) => [{
         id: Date.now(),
         title: title.trim(),
         cat,
         paid,
         est: paid,
         claim: cat === "other" ? "none" : claim,
         status: "done",
         custom: true,
         date: new Date().toISOString().slice(0, 10),
      }, ...previous]);
      form.resetFields();
      setOpen(false);
   };

   return (
      <Space direction="vertical" size="middle" style={{ width: "100%", maxWidth: 1000 }}>
         <Row gutter={[12, 12]}>
            {totals.map(([label, amount]) => <Col xs={24} md={8} key={label}>
               <Card><Statistic title={label} value={amount} formatter={() => money(amount)} /></Card>
            </Col>)}
         </Row>
         <Card title={t("Dépenses", "Expenses", "النفقات")} extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
               {t("Ajouter", "Add", "إضافة")}
            </Button>
         }>
            <Space wrap>
               <label htmlFor="cnam-rate">{t("Taux CNAM estimé", "Estimated CNAM rate", "نسبة تعويض CNAM التقديرية")}</label>
               <InputNumber id="cnam-rate" min={0} max={100} value={rate}
                  onChange={(value) => setRate(value ?? 70)} addonAfter="%" />
            </Space>
            <List dataSource={items} locale={{ emptyText: t("Aucune dépense", "No expenses", "لا توجد نفقات") }}
               renderItem={(item) => <List.Item key={item.id} actions={[
                  item.cat !== "other" && <Select key="claim"
                     aria-label={t("Statut CNAM", "CNAM status", "حالة ملف CNAM")}
                     value={item.claim || "none"} options={statuses}
                     onChange={(claim) => setItems((previous) => previous.map((entry) =>
                        entry.id === item.id ? { ...entry, claim } : entry))} />,
                  <Button key="delete" type="link" danger onClick={() =>
                     setItems((previous) => previous.filter((entry) => entry.id !== item.id))}>
                     {t("Supprimer", "Delete", "حذف")}
                  </Button>,
               ].filter(Boolean)}>
                  <List.Item.Meta title={<span dir="auto">{item.title}</span>}
                     description={categories.find((category) => category.value === item.cat)?.label} />
                  <Typography.Text strong>{money(item.paid)}</Typography.Text>
               </List.Item>} />
         </Card>
         <Modal title={t("Ajouter une dépense", "Add an expense", "إضافة نفقة")} open={open}
            onCancel={() => setOpen(false)} onOk={form.submit} forceRender
            okText={t("Enregistrer", "Save", "حفظ")} cancelText={t("Annuler", "Cancel", "إلغاء")}>
            <Form form={form} layout="vertical" onFinish={add} initialValues={{ cat: "medication", claim: "none" }}>
               <Form.Item name="title" label={t("Motif", "Description", "الوصف")}
                  rules={[{ required: true, whitespace: true, message: t("Saisissez un motif", "Enter a description", "أدخل وصفًا") }]}>
                  <Input maxLength={160} />
               </Form.Item>
               <Form.Item name="paid" label={t("Montant (TND)", "Amount (TND)", "المبلغ (د.ت)")}
                  rules={[{ required: true, type: "number", min: 0, message: t("Saisissez un montant valide", "Enter a valid amount", "أدخل مبلغًا صالحًا") }]}>
                  <InputNumber min={0} style={{ width: "100%" }} />
               </Form.Item>
               <Form.Item name="cat" label={t("Catégorie", "Category", "الفئة")}><Select options={categories} /></Form.Item>
               <Form.Item name="claim" label={t("Statut CNAM", "CNAM status", "حالة ملف CNAM")}><Select options={statuses} /></Form.Item>
            </Form>
         </Modal>
      </Space>
   );
}
