import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, List, Modal, Space, Tag, Typography } from "antd";
import SharedCareDocuments from "../components/SharedCareDocuments";
import { apiFetch } from "../utils/api";
import { useLanguage } from "../utils/language";

export default function DoctorCollaborationPage({ showConnections = false, openConnections }) {
   const { language, t } = useLanguage();
   const [workspace, setWorkspace] = useState(null);
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState(null);
   const [email, setEmail] = useState("");
   const [recipient, setRecipient] = useState(null);
   const [shareWith, setShareWith] = useState(null);
   const [form] = Form.useForm();

   const load = async (signal) => {
      const response = await apiFetch("/api/care", { signal });
      if (!response?.ok) throw new Error();
      const data = await response.json();
      if (!signal?.aborted) setWorkspace(data);
   };

   useEffect(() => {
      const controller = new AbortController();
      load(controller.signal).catch(() => {
         if (!controller.signal.aborted) setError("failed");
      });
      return () => controller.abort();
   }, []);

   const send = async (path, method, body, onSuccess) => {
      setBusy(true);
      setError(null);
      try {
         const response = await apiFetch("/api/care" + path, {
            method,
            ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
         });
         if (!response?.ok) {
            setError(path === "/connections" && response?.status === 404 ? "doctorMissing" : "failed");
            return;
         }
         onSuccess?.();
         await load();
      } catch {
         setError("failed");
      } finally {
         setBusy(false);
      }
   };

   const connections = workspace?.connections || [];
   const accepted = connections.filter((connection) => connection.status === "ACCEPTED");
   const doctor = workspace?.doctor;
   const linksPath = (id) => "/connections/" + id;
   const addInstruction = (id) => {
      form.resetFields();
      setRecipient(id);
   };
   return (
      <Space direction="vertical" size="middle" style={{ width: "100%", maxWidth: 900 }}>
         {error && <Alert type="error" showIcon message={error === "doctorMissing"
            ? t("Aucun compte médecin associé à cette adresse.", "No doctor account uses this email.", "لا يوجد حساب طبيب بهذا البريد.")
            : t("Action impossible. Réessayez.", "Could not complete the action. Try again.", "تعذر إكمال العملية. حاول مرة أخرى.")} />}
         <Card loading={!workspace && !error} title={showConnections
            ? t("Connexions", "Connections", "الارتباطات")
            : t("Consignes du médecin", "Doctor’s instructions", "تعليمات الطبيب")}
            extra={!showConnections && <Button type="link" onClick={openConnections}>
               {t("Connexions", "Connections", "الارتباطات")}
            </Button>}>
            {workspace && showConnections && (
               <>
                  {!doctor && <form onSubmit={(event) => {
                     event.preventDefault();
                     send("/connections", "POST", { email: email.trim() }, () => setEmail(""));
                  }}>
                     <Space wrap>
                        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)}
                           aria-label={t("E-mail du médecin", "Doctor’s email", "بريد الطبيب الإلكتروني")}
                           placeholder={t("E-mail du médecin", "Doctor’s email", "بريد الطبيب الإلكتروني")} />
                        <Button htmlType="submit" type="primary" loading={busy}>
                           {t("Inviter", "Invite", "إرسال دعوة")}
                        </Button>
                     </Space>
                  </form>}
                  <List dataSource={connections} locale={{ emptyText: t("Aucune connexion", "No connections", "لا توجد ارتباطات") }}
                     renderItem={(link) => <List.Item key={link.id} actions={[
                        doctor && link.status === "PENDING" && <Button key="accept" disabled={busy}
                           onClick={() => send(linksPath(link.id) + "/accept", "POST")}>
                           {t("Accepter", "Accept", "قبول")}
                        </Button>,
                        link.status === "ACCEPTED" && <Button key="documents" type="link" onClick={() => setShareWith(link)}>
                           {t("Documents", "Documents", "المستندات")}
                        </Button>,
                        <Button key="disconnect" danger type="link" disabled={busy}
                           onClick={() => send(linksPath(link.id), "DELETE")}>
                           {link.status === "PENDING"
                              ? (doctor ? t("Refuser", "Decline", "رفض") : t("Annuler", "Cancel", "إلغاء"))
                              : t("Déconnecter", "Disconnect", "إلغاء الارتباط")}
                        </Button>,
                     ].filter(Boolean)}>
                        <List.Item.Meta title={<span dir="ltr">{link.email}</span>}
                           description={link.status === "PENDING"
                              ? t("Invitation en attente", "Invitation pending", "دعوة قيد الانتظار")
                              : t("Connexion active", "Connected", "ارتباط مفعّل")} />
                     </List.Item>} />
               </>
            )}
            {workspace && !showConnections && (
               <>
                  {doctor && accepted.length > 0 && (
                     <Space wrap>
                        {accepted.map((link) => <Button key={link.id} type="primary" onClick={() => addInstruction(link.id)}>
                           {t("Ajouter pour", "Add for", "إضافة إلى")} <span dir="ltr">{link.email}</span>
                        </Button>)}
                     </Space>
                  )}
                  <List dataSource={workspace.instructions} locale={{ emptyText: t("Aucune consigne", "No instructions", "لا توجد تعليمات") }}
                     renderItem={(task) => <List.Item key={task.id} actions={doctor ? [] : [
                        <Button key="complete" disabled={busy} onClick={() =>
                           send(linksPath(task.connectionId) + "/instructions/" + task.id, "PUT", { done: !task.done })}>
                           {task.done ? t("Rouvrir", "Reopen", "إعادة فتح") : t("Terminer", "Mark done", "وضع علامة مكتمل")}
                        </Button>,
                     ]}>
                        <List.Item.Meta title={<Space wrap>
                           <span dir="auto">{task.title}</span>
                           <Tag color={task.done ? "success" : "processing"}>
                              {task.done ? t("Terminée", "Done", "مكتملة") : t("À faire", "To do", "قيد التنفيذ")}
                           </Tag>
                        </Space>} description={<>
                           {task.details && <Typography.Paragraph dir="auto" style={{ whiteSpace: "pre-wrap" }}>{task.details}</Typography.Paragraph>}
                           <span dir="ltr">{task.contact}</span>
                           {task.dueDate && " · " + new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" })
                              .format(new Date(task.dueDate + "T00:00:00Z"))}
                        </>} />
                     </List.Item>} />
               </>
            )}
         </Card>
         {showConnections && shareWith && <SharedCareDocuments
            connection={shareWith} doctor={doctor} onClose={() => setShareWith(null)} />}
         <Modal
            title={t("Ajouter une consigne", "Add instruction", "إضافة تعليمات")}
            forceRender
            open={recipient !== null}
            onCancel={() => setRecipient(null)}
            onOk={form.submit}
            confirmLoading={busy}
            okText={t("Envoyer", "Send", "إرسال")}
            cancelText={t("Annuler", "Cancel", "إلغاء")}>
            <Form form={form} layout="vertical" onFinish={(values) =>
               send(linksPath(recipient) + "/instructions", "POST", { ...values, dueDate: values.dueDate || null }, () => setRecipient(null))}>
               <Form.Item name="title" label={t("Titre", "Title", "العنوان")}
                  rules={[{ required: true, whitespace: true, message: t("Saisissez un titre", "Enter a title", "أدخل عنوانًا") }]}>
                  <Input maxLength={160} />
               </Form.Item>
               <Form.Item name="details" label={t("Détails", "Details", "التفاصيل")}>
                  <Input.TextArea rows={3} maxLength={2000} />
               </Form.Item>
               <Form.Item name="dueDate" label={t("Échéance", "Due date", "تاريخ الاستحقاق")}>
                  <Input type="date" />
               </Form.Item>
            </Form>
         </Modal>
      </Space>
   );
}
