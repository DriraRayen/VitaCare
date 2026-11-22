import React, { useEffect, useState } from "react";
import { Alert, Button, List, Modal } from "antd";
import { apiFetch } from "../utils/api";
import { useLanguage } from "../utils/language";

export default function SharedCareDocuments({ connection, doctor, onClose }) {
   const { t } = useLanguage();
   const path = "/api/care/connections/" + connection.id + "/documents";
   const [documents, setDocuments] = useState(null);
   const [shared, setShared] = useState([]);
   const [busy, setBusy] = useState(false);
   const [failed, setFailed] = useState(false);

   useEffect(() => {
      const controller = new AbortController();
      const get = async (url) => {
         const response = await apiFetch(url, { signal: controller.signal });
         if (!response?.ok) throw new Error();
         return response.json();
      };
      Promise.all([get(path), doctor ? Promise.resolve(null) : get("/api/documents")])
         .then(([entries, owned]) => {
            if (controller.signal.aborted) return;
            setShared(entries.map((entry) => entry.id));
            setDocuments(owned || entries);
         })
         .catch(() => {
            if (!controller.signal.aborted) setFailed(true);
         });
      return () => controller.abort();
   }, [doctor, path]);

   const act = async (doc) => {
      setBusy(true);
      setFailed(false);
      try {
         const url = path + "/" + doc.id;
         if (doctor) {
            const response = await apiFetch(url);
            if (!response?.ok) throw new Error();
            const href = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = href;
            link.download = doc.filename;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(href), 1000);
         } else {
            const grant = !shared.includes(doc.id);
            const response = await apiFetch(url, {
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ shared: grant }),
            });
            if (!response?.ok) throw new Error();
            setShared((previous) => grant ? [...previous, doc.id] : previous.filter((id) => id !== doc.id));
         }
      } catch {
         setFailed(true);
      } finally {
         setBusy(false);
      }
   };

   return (
      <Modal open onCancel={onClose} footer={null}
         title={t("Documents partagés", "Shared documents", "المستندات المشتركة")}>
         <span dir="ltr">{connection.email}</span>
         {failed && <Alert type="error" message={t("Documents indisponibles", "Documents unavailable", "المستندات غير متاحة")} />}
         <List loading={!documents && !failed} dataSource={documents || []}
            locale={{ emptyText: t("Aucun document", "No documents", "لا توجد مستندات") }}
            renderItem={(doc) => <List.Item key={doc.id} actions={[
               <Button key="action" disabled={busy} onClick={() => act(doc)}>
                  {doctor ? t("Télécharger", "Download", "تنزيل") : shared.includes(doc.id)
                     ? t("Révoquer", "Revoke access", "إلغاء الوصول")
                     : t("Partager", "Share", "مشاركة")}
               </Button>,
            ]}>
               <span dir="auto" style={{ overflowWrap: "anywhere" }}>{doc.filename}</span>
            </List.Item>} />
      </Modal>
   );
}
