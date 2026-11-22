import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Input, Row, Select, Space, Spin, Typography } from "antd";
import { apiFetch } from "../utils/api";
import { useLanguage } from "../utils/language";
import { documentAccept, uploadErrorMessage, uploadIssue } from "../utils/documentUpload";

export default function AnalysisPage({ filename, autoStart, onSelect }) {
   const { language, t } = useLanguage();
   const [documents, setDocuments] = useState([]);
   const [draft, setDraft] = useState("");
   const [job, setJob] = useState(null);
   const [result, setResult] = useState(null);
   const [error, setError] = useState(null);
   const [documentsFailed, setDocumentsFailed] = useState(false);
   const [loading, setLoading] = useState(Boolean(filename));
   const [uploading, setUploading] = useState(false);
   const fileInput = useRef(null);
   const uploadRequest = useRef(null);

   useEffect(() => () => uploadRequest.current?.abort(), []);

   useEffect(() => {
      const controller = new AbortController();
      apiFetch("/api/documents", { signal: controller.signal })
         .then(async (response) => {
            if (!response?.ok) throw new Error();
            const entries = await response.json();
            if (!controller.signal.aborted) setDocuments(entries);
         })
         .catch(() => {
            if (!controller.signal.aborted) setDocumentsFailed(true);
         });
      return () => controller.abort();
   }, []);

   useEffect(() => {
      const controller = new AbortController();
      setResult(null);
      setError(null);

      if (!filename && !job) {
         setLoading(false);
         return () => controller.abort();
      }

      const request = async () => {
         setLoading(true);
         try {
            const requestedLanguage = job?.language || autoStart;
            const execute = Boolean(requestedLanguage);
            const languageQuery = execute ? "?language=" + requestedLanguage : "";
            const response = filename
               ? await apiFetch(
                  "/api/documents/analyse/" + encodeURIComponent(filename) + languageQuery,
                  { method: execute ? "POST" : "GET", signal: controller.signal }
               )
               : await apiFetch("/api/documents/analysis/summarize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(job),
                  signal: controller.signal,
               });
            if (controller.signal.aborted) return;
            if (!execute && response?.status === 404) return;
            if (!response?.ok) {
               if (response?.status === 422) setError("unreadable");
               else if (filename && response?.status === 404) setError("missing");
               else setError("failed");
               return;
            }
            const data = await response.json();
            if (!controller.signal.aborted) setResult(data);
         } catch {
            if (!controller.signal.aborted) setError("failed");
         } finally {
            if (!controller.signal.aborted) setLoading(false);
         }
      };

      request();
      return () => controller.abort();
   }, [filename, autoStart, job]);

   const select = (value) => {
      setJob(null);
      setDraft("");
      onSelect(value);
   };

   const upload = async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setResult(null);
      setError(null);
      const issue = uploadIssue(file);
      if (issue) {
         setError(issue);
         return;
      }

      const controller = new AbortController();
      uploadRequest.current = controller;
      setUploading(true);
      const body = new FormData();
      body.append("file", file);
      try {
         const response = await apiFetch("/api/documents/upload", { method: "POST", body, signal: controller.signal });
         if (!response?.ok) {
            if (!controller.signal.aborted) setError(response?.status === 413 ? "tooLarge" : "upload");
            return;
         }
         const name = await response.text();
         if (!name.trim()) throw new Error();
         if (!controller.signal.aborted) onSelect(name, true);
      } catch (exception) {
         if (!controller.signal.aborted) setError(exception instanceof TypeError ? "network" : "upload");
      } finally {
         if (!controller.signal.aborted) setUploading(false);
      }
   };

   const errors = {
      unreadable: filename
         ? t("Aucun texte lisible dans ce document. Vous pouvez coller son texte.", "No readable text was found in this document. You can paste its text instead.", "لم يُعثر على نص قابل للقراءة في المستند. يمكنك لصق نصه.")
         : t("Saisissez un texte à analyser.", "Enter text to analyse.", "أدخل نصًا لتحليله."),
      missing: t("Ce document est introuvable. Choisissez un autre fichier.", "This document could not be found. Choose another file.", "تعذر العثور على المستند. اختر ملفًا آخر."),
      failed: t("Impossible de charger l’analyse. Réessayez.", "Could not load the analysis. Try again.", "تعذر تحميل التحليل. حاول مرة أخرى."),
   };

   return (
      <Row gutter={[20, 20]}>
         <Col xs={24} lg={10}>
            <Card title={t("Source", "Source", "المصدر")}>
               <Space direction="vertical" style={{ width: "100%" }}>
                  {documentsFailed && <Alert type="error" message={t("Documents indisponibles", "Documents unavailable", "المستندات غير متاحة")} />}
                  <Select
                     aria-label={t("Document", "Document", "المستند")}
                     allowClear
                     disabled={uploading}
                     value={filename || undefined}
                     placeholder={t("Choisir un document", "Choose a document", "اختر مستندًا")}
                     onChange={select}
                     options={documents.map((doc) => ({ value: doc.filename, label: doc.analysed ? doc.filename + " · " + t("Enregistrée", "Saved", "محفوظ") : doc.filename }))}
                     style={{ width: "100%" }}
                  />
                  {!filename && <>
                     <input ref={fileInput} type="file" accept={documentAccept}
                        aria-label={t("Fichier à analyser", "File to analyse", "الملف المراد تحليله")} onChange={upload} hidden />
                     <Button loading={uploading} disabled={loading} onClick={() => fileInput.current.click()}>
                        {t("Téléverser et analyser", "Upload and analyse", "رفع وتحليل")}
                     </Button>
                  </>}
                  {!filename && (
                     <Input.TextArea
                        rows={5}
                        aria-label={t("Texte à analyser", "Text to analyse", "النص المراد تحليله")}
                        placeholder={t("Ou coller du texte", "Or paste text", "أو الصق النص")}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                     />
                  )}
                  <Button type="primary" loading={loading} disabled={uploading || (!filename && !draft.trim()) || Boolean(filename && result)}
                     onClick={() => setJob({ text: draft.trim(), language })}>
                     {t("Analyser", "Analyse", "تحليل")}
                  </Button>
               </Space>
            </Card>
         </Col>
         <Col xs={24} lg={14}>
            <Card title={t("Résultat", "Result", "النتيجة")}>
               {loading && <Spin tip={t("Analyse en cours", "Analysing", "جارٍ التحليل")}><div style={{ minHeight: 70 }} /></Spin>}
               {!loading && error && <Alert type="error" showIcon message={errors[error] || uploadErrorMessage(error, t)} />}
               {!loading && !error && result && (
                  <Space direction="vertical" style={{ width: "100%" }}>
                     <Typography.Text type="secondary">
                        {filename && t("Enregistré avec le document", "Saved with the document", "محفوظ مع المستند")}
                        {filename && result.excerpt && " · "}
                        {result.excerpt && t("Extrait anonymisé", "Redacted excerpt", "مقتطف منزوع البيانات الشخصية")}
                     </Typography.Text>
                     <Typography.Paragraph dir="auto" lang={result.language || undefined} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {result.summary}
                     </Typography.Paragraph>
                  </Space>
               )}
               {!loading && !error && !result && (
                  <Typography.Text type="secondary">
                     {filename ? t("Aucune analyse enregistrée.", "No saved analysis yet.", "لا يوجد تحليل محفوظ بعد.")
                        : t("Choisissez un document, téléversez un fichier ou collez du texte.", "Choose a document, upload a file, or paste text.", "اختر مستندًا أو ارفع ملفًا أو الصق نصًا.")}
                  </Typography.Text>
               )}
            </Card>
         </Col>
      </Row>
   );
}
