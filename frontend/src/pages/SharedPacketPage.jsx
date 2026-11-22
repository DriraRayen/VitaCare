import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, Tag, Typography, Spin, Alert, Table, Row, Col, Divider } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, SafetyCertificateOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function SharedPacketPage() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSharedData = async () => {
            try {
                setLoading(true);
                const res = await fetch(`http://localhost:8081/public/masar/share/${token}`);
                if (!res.ok) {
                    if (res.status === 410) {
                        throw new Error("Ce lien de partage a expiré ou a été révoqué par le patient.");
                    }
                    throw new Error("Lien de partage introuvable ou invalide.");
                }
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchSharedData();
    }, [token]);

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "100px 20px" }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16 }}>Chargement du dossier d'orientation sécurisé...</Paragraph>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 20px" }}>
                <Alert
                    type="error"
                    showIcon
                    message="Accès au dossier impossible"
                    description={error}
                />
            </div>
        );
    }

    const { evaluation } = data;

    const columns = [
        {
            title: "Examen",
            dataIndex: "code",
            key: "code",
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: "Résultat / Rapport",
            key: "value",
            render: (_, record) => {
                if (record.canonicalValue != null) {
                    return <Text>{record.canonicalValue} {record.canonicalUnit || ""}</Text>;
                }
                if (record.reportText) {
                    return <Text type="secondary">{record.reportText}</Text>;
                }
                return <Text type="secondary">-</Text>;
            },
        },
        {
            title: "Statut",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                if (status === "DONE_VALID") {
                    return <Tag color="success" icon={<CheckCircleOutlined />}>VALIDE (À ne pas refaire)</Tag>;
                }
                if (status === "EXPIRED") {
                    return <Tag color="warning" icon={<ClockCircleOutlined />}>EXPIRÉ (À renouveler)</Tag>;
                }
                return <Tag color="error" icon={<CloseCircleOutlined />}>MANQUANT</Tag>;
            },
        },
        {
            title: "Dernière date / Raison",
            key: "reason",
            render: (_, record) => (
                <div>
                    <div>{record.resultDate || "Non fait"}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.reason}</Text>
                    {record.flagged && (
                        <div style={{ color: "#fa8c16", fontSize: 11 }}>
                            <ExclamationCircleOutlined /> {record.flagMessage}
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px" }}>
            <Card
                style={{
                    borderRadius: 16,
                    boxShadow: "0 8px 32px rgba(26,139,183,0.12)",
                    border: "none",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        <Tag color="cyan" icon={<SafetyCertificateOutlined />}>Partage Sécurisé Masar (Lecture Seule)</Tag>
                        <Title level={2} style={{ color: "#1A8BB7", margin: "12px 0 4px" }}>
                            Dossier d'Orientation Médicale
                        </Title>
                        <Text type="secondary">Parcours : {data.checklistTitle}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Expire le : {new Date(data.expiresAt).toLocaleString("fr-FR")}
                    </Text>
                </div>

                <Card type="inner" title="Profil Patient (Données déclarées)" style={{ marginBottom: 20 }}>
                    <Row gutter={[16, 8]}>
                        <Col span={12}><Text strong>Patient :</Text> {data.patientDisplayName}</Col>
                        <Col span={12}><Text strong>Âge :</Text> {data.age}</Col>
                        <Col span={12}><Text strong>Groupe sanguin :</Text> {data.bloodType || "Non renseigné"}</Col>
                        <Col span={12}><Text strong>Allergies :</Text> {data.allergies || "Aucune"}</Col>
                        <Col span={12}><Text strong>Maladies chroniques :</Text> {data.chronicConditions || "Aucune"}</Col>
                        <Col span={12}><Text span={12} strong>Traitements en cours :</Text> {data.medications || "Aucun"}</Col>
                    </Row>
                </Card>

                <Card type="inner" title="Plainte / Motif de consultation" style={{ marginBottom: 20 }}>
                    <Paragraph style={{ margin: 0 }}>{data.complaint}</Paragraph>
                </Card>

                <Title level={4} style={{ marginTop: 24, marginBottom: 12 }}>État des examens requis</Title>
                <Table
                    columns={columns}
                    dataSource={evaluation?.testResults || []}
                    rowKey="code"
                    pagination={false}
                    size="middle"
                />

                {evaluation?.testsToRequestTogether && Object.keys(evaluation.testsToRequestTogether).length > 0 && (
                    <Card
                        style={{
                            marginTop: 20,
                            background: "#FEF9E7",
                            border: "1px solid #F39C12",
                            borderRadius: 12,
                        }}
                    >
                        <Title level={5} style={{ color: "#B9770E", marginTop: 0 }}>
                            📋 Examens à regrouper pour la prescription :
                        </Title>
                        {Object.entries(evaluation.testsToRequestTogether).map(([sp, tests]) => (
                            <div key={sp} style={{ marginBottom: 4 }}>
                                <Text strong>• {sp} : </Text>
                                <Text>{tests.join(", ")}</Text>
                            </div>
                        ))}
                    </Card>
                )}

                <Divider />
                <Paragraph type="secondary" style={{ fontSize: 12, textAlign: "center", margin: 0 }}>
                    {data.disclaimer}
                </Paragraph>
            </Card>
        </div>
    );
}
