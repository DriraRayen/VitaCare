import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Button, Typography, Modal, message, Space, Alert, List } from "antd";
import { CheckOutlined, StopOutlined, SafetyCertificateOutlined, EyeOutlined } from "@ant-design/icons";
import { apiFetch } from "../utils/api";

const { Title, Text, Paragraph } = Typography;

export default function DoctorChecklistsPage() {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDraft, setSelectedDraft] = useState(null);

    useEffect(() => {
        fetchDrafts();
    }, []);

    const fetchDrafts = async () => {
        try {
            setLoading(true);
            const res = await apiFetch("/api/masar/doctor/checklists");
            if (res.ok) {
                const data = await res.json();
                setDrafts(data);
            } else if (res.status === 403) {
                message.error("Accès réservé aux professionnels de santé (ROLE_DOCTOR).");
            }
        } catch (err) {
            console.error("Failed to load doctor drafts", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (id) => {
        try {
            const res = await apiFetch(`/api/masar/doctor/checklists/${id}/publish`, { method: "POST" });
            if (res.ok) {
                message.success("Checklist validée et publiée aux patients !");
                setSelectedDraft(null);
                fetchDrafts();
            } else {
                message.error("Échec de la publication.");
            }
        } catch (err) {
            message.error("Erreur réseau");
        }
    };

    const handleArchive = async (id) => {
        try {
            const res = await apiFetch(`/api/masar/doctor/checklists/${id}/archive`, { method: "POST" });
            if (res.ok) {
                message.info("Checklist archivée.");
                setSelectedDraft(null);
                fetchDrafts();
            }
        } catch (err) {
            message.error("Erreur réseau");
        }
    };

    const columns = [
        {
            title: "Identifiant",
            dataIndex: "id",
            key: "id",
            render: (text) => <Text code>{text}</Text>,
        },
        {
            title: "Titre du parcours clinique",
            dataIndex: "title",
            key: "title",
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: "Société savante / Recommandation",
            dataIndex: "guideline",
            key: "guideline",
        },
        {
            title: "Examens",
            key: "testsCount",
            render: (_, record) => <Tag color="blue">{record.tests?.length || 0} tests</Tag>,
        },
        {
            title: "Statut",
            dataIndex: "status",
            key: "status",
            render: (status) => <Tag color="orange">{status}</Tag>,
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => setSelectedDraft(record)}>
                        Examiner
                    </Button>
                    <Button
                        type="primary"
                        style={{ background: "#27ae60" }}
                        icon={<CheckOutlined />}
                        onClick={() => handlePublish(record.id)}
                    >
                        Valider & Publier
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ color: "#1A8BB7", margin: 0 }}>
                    Espace Médecin : Revue des Checklists & Protocoles
                </Title>
                <Text type="secondary">
                    En tant que médecin validateur, vous certifiez la conformité des protocoles avant leur mise à disposition des patients.
                </Text>
            </div>

            <Card style={{ borderRadius: 16 }}>
                <Table
                    columns={columns}
                    dataSource={drafts}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                />
            </Card>

            <Modal
                open={!!selectedDraft}
                onCancel={() => setSelectedDraft(null)}
                width={750}
                title={`Revue clinique : ${selectedDraft?.title}`}
                footer={[
                    <Button key="archive" danger icon={<StopOutlined />} onClick={() => handleArchive(selectedDraft.id)}>
                        Archiver
                    </Button>,
                    <Button key="cancel" onClick={() => setSelectedDraft(null)}>
                        Fermer
                    </Button>,
                    <Button
                        key="publish"
                        type="primary"
                        style={{ background: "#27ae60" }}
                        icon={<SafetyCertificateOutlined />}
                        onClick={() => handlePublish(selectedDraft.id)}
                    >
                        Valider et Publier sous mon nom
                    </Button>,
                ]}
            >
                {selectedDraft && (
                    <div>
                        <Paragraph><Text strong>Guideline : </Text>{selectedDraft.guideline}</Paragraph>
                        {selectedDraft.note && (
                            <Alert
                                type="info"
                                message="Notes d'application"
                                description={selectedDraft.note}
                                style={{ marginBottom: 16 }}
                            />
                        )}
                        <Title level={5}>Examens prescrits dans le protocole :</Title>
                        <List
                            bordered
                            dataSource={selectedDraft.tests || []}
                            renderItem={(t) => (
                                <List.Item style={{ display: "flex", justifyContent: "space-between" }}>
                                    <div>
                                        <Text strong>{t.code}</Text> ({t.canonicalUnit || "rapport"})
                                        {t.flagExpr && <Tag color="volcano" style={{ marginLeft: 8 }}>Seuil: {t.flagExpr}</Tag>}
                                        {t.caveat && <Text type="secondary" style={{ display: "block", fontSize: 12 }}>{t.caveat}</Text>}
                                    </div>
                                    <div>
                                        <Tag>Validité: {t.validityDays} jours</Tag>
                                        <Tag color="cyan">{t.specialty || "Biologie"}</Tag>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}
