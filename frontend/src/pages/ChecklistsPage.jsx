import React, { useState, useEffect } from "react";
import { Card, Input, Row, Col, Tag, Button, Modal, Typography, List, Alert, Spin } from "antd";
import { SearchOutlined, SafetyCertificateOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { apiFetch } from "../utils/api";

const { Title, Text, Paragraph } = Typography;

export default function ChecklistsPage({ onSelectChecklist }) {
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedChecklist, setSelectedChecklist] = useState(null);

    useEffect(() => {
        fetchChecklists();
    }, []);

    const fetchChecklists = async () => {
        try {
            setLoading(true);
            const res = await apiFetch("/api/masar/checklists");
            if (res.ok) {
                const data = await res.json();
                setChecklists(data);
            }
        } catch (err) {
            console.error("Failed to load checklists", err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = checklists.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.guideline && c.guideline.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0, color: "#1A8BB7" }}>Checklists & Parcours Cliniques</Title>
                    <Text type="secondary">Consultez les bilans recommandés validés par des médecins praticiens</Text>
                </div>
                <Input
                    placeholder="Rechercher un bilan ou recommandation..."
                    prefix={<SearchOutlined />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 320, borderRadius: 8 }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}><Spin size="large" /></div>
            ) : filtered.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 40, borderRadius: 12 }}>
                    <Text type="secondary">Aucune checklist disponible correspondant à votre recherche.</Text>
                </Card>
            ) : (
                <Row gutter={[24, 24]}>
                    {filtered.map((item) => (
                        <Col xs={24} md={12} lg={12} key={item.id}>
                            <Card
                                hoverable
                                style={{
                                    borderRadius: 16,
                                    border: "1px solid #E3E8EF",
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between"
                                }}
                            >
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                        <Tag color="blue">{item.tests?.length || 0} examens</Tag>
                                        {item.reviewedByDoctorName ? (
                                            <Tag color="success" icon={<SafetyCertificateOutlined />}>Validé par {item.reviewedByDoctorName}</Tag>
                                        ) : (
                                            <Tag color="orange" icon={<ExclamationCircleOutlined />}>Non validé cliniquement</Tag>
                                        )}
                                    </div>
                                    <Title level={4} style={{ color: "#22313F", marginBottom: 8 }}>{item.title}</Title>
                                    <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
                                        {item.guideline || "Recommandations cliniques standards"}
                                    </Text>
                                    {item.note && (
                                        <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 12 }}>
                                            {item.note}
                                        </Paragraph>
                                    )}
                                </div>

                                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                                    <Button onClick={() => setSelectedChecklist(item)}>
                                        Voir le détail
                                    </Button>
                                    <Button
                                        type="primary"
                                        style={{ background: "#1A8BB7" }}
                                        icon={<ArrowRightOutlined />}
                                        onClick={() => onSelectChecklist && onSelectChecklist(item.id)}
                                    >
                                        Commencer mon parcours
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Checklist details modal */}
            <Modal
                open={!!selectedChecklist}
                onCancel={() => setSelectedChecklist(null)}
                footer={[
                    <Button key="close" onClick={() => setSelectedChecklist(null)}>Fermer</Button>,
                    <Button
                        key="start"
                        type="primary"
                        style={{ background: "#1A8BB7" }}
                        onClick={() => {
                            const id = selectedChecklist.id;
                            setSelectedChecklist(null);
                            if (onSelectChecklist) onSelectChecklist(id);
                        }}
                    >
                        Commencer avec ce parcours
                    </Button>
                ]}
                width={700}
                title={selectedChecklist?.title}
            >
                {selectedChecklist && (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>Référence / Recommandation : </Text>
                            <Text>{selectedChecklist.guideline || "Standard médical"}</Text>
                        </div>
                        {selectedChecklist.note && (
                            <Alert
                                type="info"
                                message="Note clinique"
                                description={selectedChecklist.note}
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        )}
                        <Title level={5}>Examens inclus ({selectedChecklist.tests?.length}) :</Title>
                        <List
                            size="small"
                            bordered
                            dataSource={selectedChecklist.tests || []}
                            renderItem={(test) => (
                                <List.Item style={{ display: "flex", justifyContent: "space-between" }}>
                                    <div>
                                        <Text strong>{test.code}</Text>
                                        {test.synonyms && test.synonyms.length > 0 && (
                                            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                                                Synonymes : {test.synonyms.join(", ")}
                                            </Text>
                                        )}
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <Tag color="cyan">Validité: {test.validityDays} j</Tag>
                                        {test.optional && <Tag>Optionnel</Tag>}
                                    </div>
                                </List.Item>
                            )}
                        />

                        {selectedChecklist.urgentQuestions && selectedChecklist.urgentQuestions.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <Title level={5} style={{ color: "#fa8c16" }}>Signes d'alerte / Questions urgentes :</Title>
                                <List
                                    size="small"
                                    dataSource={selectedChecklist.urgentQuestions}
                                    renderItem={(uq) => (
                                        <List.Item>
                                            <Text type="warning">• {uq.questionFr}</Text>
                                        </List.Item>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
