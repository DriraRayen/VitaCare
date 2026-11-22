import React, { useState, useEffect } from "react";
import {
    Steps,
    Card,
    Button,
    Input,
    Select,
    Checkbox,
    Alert,
    Table,
    Tag,
    Modal,
    Spin,
    message,
    Typography,
    Row,
    Col,
    Divider,
    Space,
    Popconfirm,
} from "antd";
import {
    CompassOutlined,
    FileTextOutlined,
    EditOutlined,
    CheckCircleOutlined,
    ShareAltOutlined,
    DownloadOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    SafetyCertificateOutlined,
    WarningOutlined,
    LinkOutlined,
} from "@ant-design/icons";
import { apiFetch, getEmailFromToken } from "../utils/api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function MasarPage({ initialChecklistId, onFinish }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Step 1: Case creation
    const [checklists, setChecklists] = useState([]);
    const [selectedChecklistId, setSelectedChecklistId] = useState(initialChecklistId || "");
    const [complaint, setComplaint] = useState("");
    const [urgentAnswers, setUrgentAnswers] = useState([]);
    const [currentCase, setCurrentCase] = useState(null);

    // Step 2: Document selection & consent
    const [userDocuments, setUserDocuments] = useState([]);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    const [hasConsent, setHasConsent] = useState(false);
    const [consentModalVisible, setConsentModalVisible] = useState(false);

    // Step 3: Extracted results editing
    const [caseResults, setCaseResults] = useState([]);

    // Step 4: Rules evaluation
    const [evaluation, setEvaluation] = useState(null);

    // Step 5: Sharing & Packet
    const [specialistQuestion, setSpecialistQuestion] = useState("");
    const [shareData, setShareData] = useState(null);

    useEffect(() => {
        loadChecklists();
        loadUserDocuments();
        checkConsent();
        loadExistingCases();
    }, []);

    useEffect(() => {
        if (initialChecklistId) {
            setSelectedChecklistId(initialChecklistId);
        }
    }, [initialChecklistId]);

    const loadChecklists = async () => {
        try {
            const res = await apiFetch("/api/masar/checklists");
            if (res.ok) {
                const data = await res.json();
                setChecklists(data);
                if (!selectedChecklistId && data.length > 0) {
                    setSelectedChecklistId(data[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to load checklists", err);
        }
    };

    const loadUserDocuments = async () => {
        const email = getEmailFromToken();
        if (!email) return;
        try {
            const res = await apiFetch(`/api/documents?email=${encodeURIComponent(email)}`);
            if (res.ok) {
                const docs = await res.json();
                setUserDocuments(docs);
                // Pre-select all by default
                setSelectedDocIds(docs.map((d) => d.id));
            }
        } catch (err) {
            console.error("Failed to load documents", err);
        }
    };

    const checkConsent = async () => {
        try {
            const res = await apiFetch("/api/masar/consent");
            if (res.ok) {
                const data = await res.json();
                setHasConsent(data.hasConsent);
            }
        } catch (err) {
            console.error("Failed to check consent", err);
        }
    };

    const loadExistingCases = async () => {
        try {
            const res = await apiFetch("/api/masar/cases");
            if (res.ok) {
                const cases = await res.json();
                if (cases.length > 0 && !currentCase) {
                    // Load most recent active case if available
                    const latest = cases[0];
                    setCurrentCase(latest);
                    setSelectedChecklistId(latest.checklistId);
                    setComplaint(latest.complaint);
                    setCaseResults(latest.results || []);
                }
            }
        } catch (err) {
            console.error("Failed to load cases", err);
        }
    };

    const selectedChecklist = checklists.find((c) => c.id === selectedChecklistId);
    const isUrgentSelected = urgentAnswers.length > 0;

    // --- STEP 1: Create Case ---
    const handleCreateCase = async () => {
        if (!complaint.trim()) {
            message.warning("Veuillez décrire vos symptômes ou motif de consultation.");
            return;
        }
        try {
            setLoading(true);
            const res = await apiFetch("/api/masar/cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    checklistId: selectedChecklistId,
                    complaint,
                    answeredUrgentQuestions: urgentAnswers,
                }),
            });
            if (res.ok) {
                const created = await res.json();
                setCurrentCase(created);
                message.success("Dossier d'orientation initié avec succès !");
                setCurrentStep(1);
            } else {
                message.error("Erreur lors de l'initiation du dossier.");
            }
        } catch (err) {
            message.error("Erreur réseau");
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 2: Trigger Extraction ---
    const handleStartExtraction = async () => {
        if (!hasConsent) {
            setConsentModalVisible(true);
            return;
        }
        performExtraction();
    };

    const handleGrantConsent = async () => {
        try {
            const res = await apiFetch("/api/masar/consent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consentGranted: true, version: "1.0" }),
            });
            if (res.ok) {
                setHasConsent(true);
                setConsentModalVisible(false);
                message.success("Consentement enregistré.");
                performExtraction();
            }
        } catch (err) {
            message.error("Échec de l'enregistrement du consentement.");
        }
    };

    const performExtraction = async () => {
        if (!currentCase) return;
        try {
            setLoading(true);
            const res = await apiFetch(`/api/masar/cases/${currentCase.id}/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documentIds: selectedDocIds }),
            });
            if (res.ok) {
                const updated = await res.json();
                setCurrentCase(updated);
                setCaseResults(updated.results || []);
                message.success("Extraction terminée avec succès !");
                setCurrentStep(2);
            } else if (res.status === 403) {
                setConsentModalVisible(true);
            } else {
                message.error("Échec de l'extraction des documents.");
            }
        } catch (err) {
            message.error("Erreur d'extraction");
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 3: Edit / Confirm Results ---
    const handleUpdateResult = async (resultId, field, value) => {
        const updatedList = caseResults.map((r) => (r.id === resultId ? { ...r, [field]: value } : r));
        setCaseResults(updatedList);

        const target = updatedList.find((r) => r.id === resultId);
        try {
            await apiFetch(`/api/masar/cases/${currentCase.id}/results/${resultId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    canonicalCode: target.canonicalCode,
                    rawName: target.rawName,
                    numericValue: target.numericValue,
                    unit: target.unit,
                    resultDate: target.resultDate,
                    confirmedByUser: target.confirmedByUser,
                    reportText: target.reportText,
                }),
            });
        } catch (err) {
            console.error("Save result failed", err);
        }
    };

    const handleConfirmAll = () => {
        caseResults.forEach((r) => {
            if (!r.confirmedByUser) {
                handleUpdateResult(r.id, "confirmedByUser", true);
            }
        });
        message.success("Toutes les valeurs ont été confirmées.");
    };

    // --- STEP 4: Evaluate Rules ---
    const handleEvaluateRules = async () => {
        if (!currentCase) return;
        try {
            setLoading(true);
            const res = await apiFetch(`/api/masar/cases/${currentCase.id}/evaluate`, { method: "POST" });
            if (res.ok) {
                const evalData = await res.json();
                setEvaluation(evalData);
                setCurrentStep(3);
            }
        } catch (err) {
            message.error("Erreur lors de l'évaluation");
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 5: PDF & Share Link ---
    const handleDownloadPdf = () => {
        if (!currentCase) return;
        const url = `http://localhost:8081/api/masar/cases/${currentCase.id}/packet/pdf?question=${encodeURIComponent(specialistQuestion)}`;
        const token = localStorage.getItem("jwt");

        fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => res.blob())
            .then((blob) => {
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = `Dossier_Orientation_Masar_${currentCase.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch(() => message.error("Échec du téléchargement du PDF"));
    };

    const handleCreateShareLink = async () => {
        if (!currentCase) return;
        try {
            setLoading(true);
            const res = await apiFetch(`/api/masar/cases/${currentCase.id}/share`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setShareData(data);
                message.success("Lien de partage sécurisé 72h généré !");
            }
        } catch (err) {
            message.error("Échec de la génération du lien");
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeShareLink = async () => {
        if (!currentCase) return;
        try {
            const res = await apiFetch(`/api/masar/cases/${currentCase.id}/share`, { method: "DELETE" });
            if (res.ok) {
                setShareData(null);
                message.info("Lien de partage révoqué avec succès.");
            }
        } catch (err) {
            message.error("Échec de la révocation");
        }
    };

    const handleDeleteCase = async () => {
        if (!currentCase) return;
        try {
            const res = await apiFetch(`/api/masar/cases/${currentCase.id}`, { method: "DELETE" });
            if (res.ok) {
                message.success("Dossier et résultats supprimés définitivement.");
                setCurrentCase(null);
                setCaseResults([]);
                setEvaluation(null);
                setCurrentStep(0);
            }
        } catch (err) {
            message.error("Erreur lors de la suppression");
        }
    };

    const steps = [
        { title: "Plainte & Parcours", icon: <CompassOutlined /> },
        { title: "Documents & IA", icon: <FileTextOutlined /> },
        { title: "Revue des résultats", icon: <EditOutlined /> },
        { title: "Bilan clinique", icon: <CheckCircleOutlined /> },
        { title: "Dossier & Partage", icon: <ShareAltOutlined /> },
    ];

    const resultColumns = [
        {
            title: "Examen extrait",
            dataIndex: "rawName",
            key: "rawName",
            render: (text, record) => (
                <div>
                    <Input
                        value={text}
                        onChange={(e) => handleUpdateResult(record.id, "rawName", e.target.value)}
                        style={{ fontWeight: 600 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        Code : <Tag>{record.canonicalCode}</Tag>
                    </Text>
                </div>
            ),
        },
        {
            title: "Valeur numérique",
            dataIndex: "numericValue",
            key: "numericValue",
            width: 140,
            render: (val, record) => (
                <Input
                    type="number"
                    step="0.01"
                    value={val != null ? val : ""}
                    onChange={(e) => handleUpdateResult(record.id, "numericValue", parseFloat(e.target.value) || null)}
                />
            ),
        },
        {
            title: "Unité",
            dataIndex: "unit",
            key: "unit",
            width: 120,
            render: (unit, record) => (
                <Input
                    value={unit || ""}
                    onChange={(e) => handleUpdateResult(record.id, "unit", e.target.value)}
                />
            ),
        },
        {
            title: "Date du résultat",
            dataIndex: "resultDate",
            key: "resultDate",
            width: 160,
            render: (d, record) => (
                <Input
                    type="date"
                    value={d || ""}
                    onChange={(e) => handleUpdateResult(record.id, "resultDate", e.target.value)}
                />
            ),
        },
        {
            title: "Confiance IA",
            dataIndex: "confidence",
            key: "confidence",
            width: 130,
            render: (conf, record) => {
                const isLow = conf < 0.7 || record.canonicalCode === "UNMAPPED";
                return (
                    <Tag color={isLow ? "volcano" : "green"}>
                        {isLow ? <WarningOutlined /> : <CheckCircleOutlined />} {Math.round(conf * 100)}%
                        {isLow && " (À vérifier)"}
                    </Tag>
                );
            },
        },
        {
            title: "Confirmation",
            dataIndex: "confirmedByUser",
            key: "confirmedByUser",
            width: 140,
            render: (confirmed, record) => (
                <Checkbox
                    checked={confirmed}
                    onChange={(e) => handleUpdateResult(record.id, "confirmedByUser", e.target.checked)}
                >
                    {confirmed ? <Text type="success">Confirmé</Text> : <Text type="warning">À confirmer</Text>}
                </Checkbox>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ color: "#1A8BB7", margin: 0 }}>
                    Mon Parcours de Soins - Masar (مسار)
                </Title>
                <Text type="secondary">
                    Préparez votre première consultation : bilan des examens existants, détection des renouvellements et regroupement des ordonnances.
                </Text>
            </div>

            <Card style={{ borderRadius: 16, marginBottom: 24 }}>
                <Steps current={currentStep} items={steps} onChange={(step) => setCurrentStep(step)} />
            </Card>

            {/* STEP 0 : Selection plainte + questions urgentes */}
            {currentStep === 0 && (
                <Card style={{ borderRadius: 16 }}>
                    <Title level={4}>1. Motif de consultation & Choix du parcours</Title>
                    <Paragraph type="secondary">
                        Sélectionnez le parcours correspondant à votre situation ou prescription initiale.
                    </Paragraph>

                    <div style={{ marginBottom: 20 }}>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>Parcours clinique :</Text>
                        <Select
                            value={selectedChecklistId}
                            onChange={(val) => setSelectedChecklistId(val)}
                            style={{ width: "100%", maxWidth: 600 }}
                        >
                            {checklists.map((c) => (
                                <Option key={c.id} value={c.id}>
                                    {c.title} {c.reviewedByDoctorName ? `(Validé par ${c.reviewedByDoctorName})` : "(Non validé cliniquement)"}
                                </Option>
                            ))}
                        </Select>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            Vos symptômes ou motif de consultation :
                        </Text>
                        <TextArea
                            rows={3}
                            placeholder="Décrivez vos symptômes actuels (ex: fatigue depuis 2 mois, soif intense, perte de poids...)"
                            value={complaint}
                            onChange={(e) => setComplaint(e.target.value)}
                        />
                    </div>

                    {selectedChecklist?.urgentQuestions && selectedChecklist.urgentQuestions.length > 0 && (
                        <Card
                            type="inner"
                            title={<span style={{ color: "#fa8c16" }}><ExclamationCircleOutlined /> Questionnaire de sécurité urgent</span>}
                            style={{ marginBottom: 20, background: "#FFFBF6", borderColor: "#FFE7BA" }}
                        >
                            <Paragraph style={{ fontSize: 13 }}>
                                Cochez si vous ressentez actuellement l'un des symptômes d'alerte suivants :
                            </Paragraph>
                            <Checkbox.Group
                                value={urgentAnswers}
                                onChange={(vals) => setUrgentAnswers(vals)}
                                style={{ display: "flex", flexDirection: "column", gap: 10 }}
                            >
                                {selectedChecklist.urgentQuestions.map((q) => (
                                    <Checkbox key={q.questionId} value={q.questionId}>
                                        <Text strong={urgentAnswers.includes(q.questionId)}>{q.questionFr}</Text>
                                    </Checkbox>
                                ))}
                            </Checkbox.Group>
                        </Card>
                    )}

                    {isUrgentSelected && (
                        <Alert
                            type="error"
                            showIcon
                            message="⚠️ Alerte médicale urgente"
                            description="Consultez un médecin en urgence ou appelez le SAMU (190) sans attendre."
                            style={{ marginBottom: 20 }}
                        />
                    )}

                    <Button
                        type="primary"
                        size="large"
                        style={{ background: "#1A8BB7" }}
                        onClick={handleCreateCase}
                        loading={loading}
                    >
                        Continuer vers la sélection des documents
                    </Button>
                </Card>
            )}

            {/* STEP 1 : Selection des documents & Consentement */}
            {currentStep === 1 && (
                <Card style={{ borderRadius: 16 }}>
                    <Title level={4}>2. Documents médicaux à analyser</Title>
                    <Paragraph type="secondary">
                        Sélectionnez les bilans biologiques ou comptes-rendus existants dans votre espace VitaCare.
                    </Paragraph>

                    {userDocuments.length === 0 ? (
                        <Alert
                            type="info"
                            message="Aucun document trouvé"
                            description="Veuillez d'abord déposer vos bilans dans l'onglet 'Documents' de votre application."
                            style={{ marginBottom: 20 }}
                        />
                    ) : (
                        <div style={{ marginBottom: 24 }}>
                            <Checkbox.Group
                                value={selectedDocIds}
                                onChange={(vals) => setSelectedDocIds(vals)}
                                style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}
                            >
                                {userDocuments.map((doc) => (
                                    <Card key={doc.id} size="small" style={{ borderRadius: 8 }}>
                                        <Checkbox value={doc.id}>
                                            <Text strong>{doc.filename}</Text>
                                            <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>
                                                {doc.fileType} • {doc.tags?.join(", ") || "Sans tag"}
                                            </Text>
                                        </Checkbox>
                                    </Card>
                                ))}
                            </Checkbox.Group>
                        </div>
                    )}

                    <Space>
                        <Button onClick={() => setCurrentStep(0)}>Retour</Button>
                        <Button
                            type="primary"
                            size="large"
                            style={{ background: "#1A8BB7" }}
                            onClick={handleStartExtraction}
                            loading={loading}
                            disabled={selectedDocIds.length === 0}
                        >
                            Lancer l'analyse de mes documents
                        </Button>
                    </Space>
                </Card>
            )}

            {/* STEP 2 : Revue et confirmation des valeurs */}
            {currentStep === 2 && (
                <Card style={{ borderRadius: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>3. Revue et validation des résultats extraits</Title>
                            <Text type="secondary">
                                Vérifiez et confirmez chaque valeur. Les examens à faible confiance sont signalés en orange.
                            </Text>
                        </div>
                        <Button onClick={handleConfirmAll}>Tout confirmer</Button>
                    </div>

                    <Table
                        columns={resultColumns}
                        dataSource={caseResults}
                        rowKey="id"
                        pagination={false}
                        style={{ marginBottom: 24 }}
                    />

                    <Space>
                        <Button onClick={() => setCurrentStep(1)}>Retour</Button>
                        <Button
                            type="primary"
                            size="large"
                            style={{ background: "#1A8BB7" }}
                            onClick={handleEvaluateRules}
                            loading={loading}
                        >
                            Évaluer la conformité du parcours
                        </Button>
                    </Space>
                </Card>
            )}

            {/* STEP 3 : Bilan du parcours (Règles déterministes) */}
            {currentStep === 3 && evaluation && (
                <div>
                    {!evaluation.clinicallyValidated && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Parcours non validé cliniquement"
                            description={evaluation.validationBanner}
                            style={{ marginBottom: 20 }}
                        />
                    )}

                    {evaluation.urgent && (
                        <Alert
                            type="error"
                            showIcon
                            message="Alerte urgente signalée"
                            description={evaluation.urgentMessage}
                            style={{ marginBottom: 20 }}
                        />
                    )}

                    <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                        <Col span={12}>
                            <Card style={{ borderRadius: 16, background: "#E8F8F5", border: "1px solid #A3E4D7" }}>
                                <Title level={2} style={{ color: "#16A085", margin: 0 }}>
                                    {evaluation.testsAvoidedCount}
                                </Title>
                                <Text strong style={{ color: "#16A085" }}>
                                    Examens récents valides (inutile de refaire)
                                </Text>
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card style={{ borderRadius: 16, background: "#FEF9E7", border: "1px solid #F9E79F" }}>
                                <Title level={2} style={{ color: "#D4AC0D", margin: 0 }}>
                                    {evaluation.testResults?.filter((t) => t.status !== "DONE_VALID").length || 0}
                                </Title>
                                <Text strong style={{ color: "#B7950B" }}>
                                    Examens à renouveler ou manquants
                                </Text>
                            </Card>
                        </Col>
                    </Row>

                    {evaluation.testsToRequestTogether && Object.keys(evaluation.testsToRequestTogether).length > 0 && (
                        <Card
                            style={{
                                borderRadius: 16,
                                marginBottom: 24,
                                background: "#FFFDF9",
                                border: "1px solid #F39C12"
                            }}
                        >
                            <Title level={5} style={{ color: "#B9770E", marginTop: 0 }}>
                                📦 Examens à regrouper en une seule prescription :
                            </Title>
                            {Object.entries(evaluation.testsToRequestTogether).map(([specialty, tests]) => (
                                <div key={specialty} style={{ marginBottom: 8 }}>
                                    <Text strong>• {specialty} : </Text>
                                    <Text>{tests.join(", ")}</Text>
                                </div>
                            ))}
                        </Card>
                    )}

                    <Card style={{ borderRadius: 16, marginBottom: 24 }}>
                        <Title level={5}>Détail examen par examen :</Title>
                        <Table
                            dataSource={evaluation.testResults || []}
                            rowKey="code"
                            pagination={false}
                            columns={[
                                { title: "Examen", dataIndex: "code", key: "code", render: (t) => <Text strong>{t}</Text> },
                                {
                                    title: "Statut",
                                    dataIndex: "status",
                                    key: "status",
                                    render: (st) => {
                                        if (st === "DONE_VALID") return <Tag color="success">VALIDE</Tag>;
                                        if (st === "EXPIRED") return <Tag color="warning">EXPIRÉ</Tag>;
                                        return <Tag color="error">MANQUANT</Tag>;
                                    }
                                },
                                { title: "Dernière date / Raison", dataIndex: "reason", key: "reason" },
                                {
                                    title: "Avis informatif",
                                    key: "flags",
                                    render: (_, r) => (
                                        r.flagged ? <Tag color="volcano">{r.flagMessage}</Tag> : <Text type="secondary">-</Text>
                                    )
                                }
                            ]}
                        />
                    </Card>

                    <Space>
                        <Button onClick={() => setCurrentStep(2)}>Retour</Button>
                        <Button
                            type="primary"
                            size="large"
                            style={{ background: "#1A8BB7" }}
                            onClick={() => setCurrentStep(4)}
                        >
                            Étape suivante : Préparer mon dossier d'orientation
                        </Button>
                    </Space>
                </div>
            )}

            {/* STEP 4 : Dossier d'orientation & Partage */}
            {currentStep === 4 && (
                <Card style={{ borderRadius: 16 }}>
                    <Title level={4}>5. Dossier d'orientation & Partage pour le spécialiste</Title>
                    <Paragraph type="secondary">
                        Téléchargez votre dossier au format PDF structuré ou créez un lien de consultation sécurisé pour le médecin ou le secrétariat.
                    </Paragraph>

                    <div style={{ marginBottom: 20 }}>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            Question ou précision pour le médecin spécialiste :
                        </Text>
                        <TextArea
                            rows={3}
                            placeholder="Ex: Demander si l'adaptation du traitement est nécessaire compte tenu de la créatinine..."
                            value={specialistQuestion}
                            onChange={(e) => setSpecialistQuestion(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 30 }}>
                        <Button
                            type="primary"
                            size="large"
                            icon={<DownloadOutlined />}
                            style={{ background: "#27ae60" }}
                            onClick={handleDownloadPdf}
                        >
                            Télécharger le dossier PDF
                        </Button>

                        {!shareData ? (
                            <Button
                                size="large"
                                icon={<ShareAltOutlined />}
                                onClick={handleCreateShareLink}
                                loading={loading}
                            >
                                Créer un lien de partage sécurisé (72h)
                            </Button>
                        ) : (
                            <Button danger size="large" onClick={handleRevokeShareLink}>
                                Révoquer le lien de partage
                            </Button>
                        )}

                        <Popconfirm
                            title="Supprimer définitivement ce dossier ?"
                            description="Toutes les données associées seront effacées conformément au droit à l'oubli."
                            onConfirm={handleDeleteCase}
                            okText="Supprimer"
                            cancelText="Annuler"
                        >
                            <Button danger icon={<DeleteOutlined />} size="large">
                                Supprimer mon dossier
                            </Button>
                        </Popconfirm>
                    </div>

                    {shareData && (
                        <Alert
                            type="success"
                            showIcon
                            icon={<LinkOutlined />}
                            message="Lien de consultation sécurisé actif (72 heures)"
                            description={
                                <div>
                                    <Paragraph copyable style={{ margin: "8px 0" }}>
                                        {`http://localhost:3000${shareData.shareUrl}`}
                                    </Paragraph>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Ce lien est accessible en lecture seule sans connexion. Vous pouvez le révoquer à tout moment.
                                    </Text>
                                </div>
                            }
                        />
                    )}
                </Card>
            )}

            {/* Modal de consentement explicite */}
            <Modal
                open={consentModalVisible}
                onCancel={() => setConsentModalVisible(false)}
                title="🔒 Consentement au traitement local des documents"
                footer={[
                    <Button key="cancel" onClick={() => setConsentModalVisible(false)}>
                        Refuser
                    </Button>,
                    <Button
                        key="accept"
                        type="primary"
                        style={{ background: "#1A8BB7" }}
                        icon={<SafetyCertificateOutlined />}
                        onClick={handleGrantConsent}
                    >
                        J'accepte et je lance l'extraction
                    </Button>
                ]}
            >
                <Paragraph>
                    Pour extraire automatiquement vos valeurs de laboratoire, l'outil analyse localement le texte de vos bilans.
                </Paragraph>
                <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    <Text strong>Garanties de confidentialité :</Text>
                    <ul style={{ paddingLeft: 20, margin: "8px 0 0" }}>
                        <li>Traitement 100% local sur votre machine (aucun transfert tiers).</li>
                        <li>Anonymisation stricte avant toute lecture (votre nom, email, CIN et téléphone sont masqués).</li>
                        <li>Vous vérifiez et confirmez manuellement chaque résultat extrait avant évaluation.</li>
                        <li>L'IA n'émet aucun diagnostic : seuls des protocoles déterministes comparent les dates de validité.</li>
                    </ul>
                </div>
            </Modal>
        </div>
    );
}
