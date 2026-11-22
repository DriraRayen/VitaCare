import React, { useState, useEffect } from "react";
import GestionDocuments from "../components/Documents";
import GestionProfile from "../components/GestionProfile";
import AnalysisPage from "./AnalysisPage";
import CareExpensesPage from "./CareJourneyPage";
import DoctorCollaborationPage from "./DoctorCollaborationPage";
import Sidebar from "../components/Sidebar/Sidebar";
import { useSidebar } from "../hooks/useSidebar";
import { COLORS, SIDER_ITEMS } from "../constants";
import { languages, useLanguage } from "../utils/language";
import { useSearchParams } from "react-router-dom";
import { apiFetch, getEmailFromToken } from "../utils/api";
import moment from "moment";

import Logo from "../assets/VitaCare_logo.png";

import {
   Layout,
   ConfigProvider,
   Card,
   Typography,
   Button,
   Modal,
   Select,
   Space,
   Dropdown,
   Input,
   Row,
   Col,
} from "antd";
import {
   UserOutlined,
   SettingOutlined,
   SearchOutlined,
   BellOutlined,
   FileTextOutlined,
} from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;

// Destructure colors from constants
const { PRIMARY, BG_LIGHT, BG_CARD, SIDEBAR_BORDER, TEXT_DARK, TEXT_MEDIUM } =
   COLORS;

function Dashboard({ setLanguage }) {
   const { language, t } = useLanguage();
   const { collapsed, setCollapsed } = useSidebar();
   const [params, setParams] = useSearchParams();
   const activePage = params.get("page") || "1";
   const filename = activePage === "2" ? params.get("document") : null;
   const [autoStart, setAutoStart] = useState(null);
   const [settingsOpen, setSettingsOpen] = useState(false);
   const setActivePage = (page) => {
      setAutoStart(null);
      setParams(page === "1" ? {} : { page });
   };
   const selectDocument = (document, execute, replace = false) => {
      setAutoStart(execute ? { document, language } : null);
      setParams(document ? { page: "2", document } : { page: "2" }, { replace });
   };
   const pageLabels = {
      1: t("Tableau de bord", "Dashboard", "لوحة التحكم"),
      2: t("Analyses", "Analysis", "التحليل"),
      3: t("Consignes du médecin", "Doctor’s instructions", "تعليمات الطبيب"),
      4: t("Connexions", "Connections", "الارتباطات"),
      5: t("Dépenses de soins", "Care expenses", "نفقات الرعاية"),
      9: t("Documents", "Documents", "المستندات"),
      10: t("Profil", "Profile", "الملف الشخصي"),
   };
   const [searchQuery, setSearchQuery] = useState("");
   const [userData, setUserData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [documentCount, setDocumentCount] = useState(0);
   const [tagCount, setTagCount] = useState(0);

   // Fetch user data and documents for dashboard
   useEffect(() => {
      const fetchDashboardData = async () => {
         try {
            setLoading(true);
            const email = getEmailFromToken();
            if (!email) return;

            // Fetch user profile
            const profileRes = await apiFetch(
               `/api/profile/user/by-email/${encodeURIComponent(email)}`
            );
            if (profileRes.ok) {
               const user = await profileRes.json();
               setUserData(user);
            }

            // Fetch documents count
            const docsRes = await apiFetch(
               `/api/documents?email=${encodeURIComponent(email)}`
            );
            if (docsRes.ok) {
               const docs = await docsRes.json();
               setDocumentCount(docs.length);

               // Count unique tags from documents
               const uniqueTags = new Set();
               docs.forEach((doc) => {
                  if (doc.tagNames && Array.isArray(doc.tagNames)) {
                     doc.tagNames.forEach((tag) => uniqueTags.add(tag));
                  }
               });
               setTagCount(uniqueTags.size);
            }
         } catch (err) {
            console.error("Error fetching dashboard data:", err);
         } finally {
            setLoading(false);
         }
      };
      fetchDashboardData();
   }, []);

   const userMenu = {
      items: [
         { key: "10", label: t("Mon profil", "My profile", "ملفي الشخصي"), icon: <UserOutlined /> },
         { key: "settings", label: t("Paramètres", "Settings", "الإعدادات"), icon: <SettingOutlined /> },
         { type: "divider" },
         { key: "logout", label: t("Déconnexion", "Sign out", "تسجيل الخروج"), danger: true },
      ],
      onClick: ({ key }) => {
         if (key === "10") setActivePage("10");
         if (key === "settings") setSettingsOpen(true);
         if (key === "logout") {
            localStorage.removeItem("jwt");
            window.location.href = "/login";
         }
      },
   };

   return (
      <ConfigProvider
         theme={{
            token: {
               colorPrimary: PRIMARY,
               colorBgContainer: BG_LIGHT,
               colorBgElevated: BG_CARD,
               borderRadius: 16,
               boxShadow: "0 4px 24px rgba(26,139,183,0.08)",
               fontFamily:
                  "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
            },
            components: {
               Menu: {
                  itemBg: "transparent",
                  itemSelectedBg: "rgba(26, 139, 183, 0.10)",
                  itemSelectedColor: PRIMARY,
                  itemHoverBg: "rgba(26, 139, 183, 0.06)",
                  subMenuItemBg: "transparent",
               },
               Layout: {
                  siderBg: COLORS.SIDEBAR_BG,
                  headerBg: BG_CARD,
               },
            },
         }}
      >
         <Layout
            style={{
               minHeight: "100vh",
               background: BG_LIGHT,
            }}
         >
            <Sidebar
               collapsed={collapsed}
               setCollapsed={setCollapsed}
               activePage={activePage}
               setActivePage={setActivePage}
               siderItems={SIDER_ITEMS.map((item) => ({ ...item, label: pageLabels[item.key] }))}
            />

            <Layout style={{ backgroundColor: BG_LIGHT }}>
               {/* Topbar */}
               <div
                  style={{
                     background: BG_CARD,
                     margin: "0px 0px 0 0px",
                     padding: "0 32px",
                     height: 80,
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "space-between",
                     borderBottom: `1.5px solid ${SIDEBAR_BORDER}`,
                     boxShadow: "0 2px 12px rgba(26,139,183,0.04)",
                  }}
               >
                  <div style={{ display: "flex", alignItems: "center" }}>
                     <Title
                        level={3}
                        style={{
                           margin: 0,
                           color: TEXT_DARK,
                           fontWeight: 700,
                           letterSpacing: "-0.5px",
                        }}
                     >
                        {pageLabels[activePage] || ""}
                     </Title>
                  </div>

                  <div
                     style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                     <Input
                        placeholder={t("Rechercher des documents", "Search documents", "البحث في المستندات")}
                        prefix={
                           <SearchOutlined style={{ color: TEXT_MEDIUM }} />
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onPressEnter={() => {
                           if (searchQuery.trim()) {
                              setActivePage("9"); // Navigate to documents page
                           }
                        }}
                        style={{
                           width: 300,
                           borderRadius: 32,
                           backgroundColor: BG_LIGHT,
                           border: searchQuery
                              ? `2px solid ${PRIMARY}20`
                              : "none",
                           boxShadow: searchQuery
                              ? "0 2px 12px rgba(26,139,183,0.15)"
                              : "0 2px 8px rgba(26,139,183,0.08)",
                        }}
                        size="large"
                        allowClear
                     />
                     <Dropdown menu={userMenu} trigger={["click"]}>
                        <Button type="primary" shape="circle" icon={<UserOutlined />} size="large"
                           aria-label={t("Menu du profil", "Profile menu", "قائمة الملف الشخصي")} />
                     </Dropdown>
                  </div>
               </div>

               <Content
                  style={{
                     padding: "32px",
                     background: BG_LIGHT,
                     minHeight: "calc(100vh - 80px)",
                  }}
               >
                  {activePage === "1" && (
                     <Row gutter={[32, 32]}>
                        <Col span={24}>
                           <Card
                              style={{
                                 borderRadius: 24,
                                 background:
                                    "linear-gradient(135deg, #ffffff 0%, #f8fafb 100%)",
                                 border: "none",
                                 boxShadow: "0 8px 32px rgba(26,139,183,0.12)",
                                 overflow: "hidden",
                              }}
                           >
                              <div
                                 style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 0",
                                 }}
                              >
                                 <div>
                                    <Title
                                       level={2}
                                       style={{
                                          color: PRIMARY,
                                          margin: 0,
                                          fontWeight: 700,
                                       }}
                                    >
                                       {t("Bienvenue", "Welcome", "مرحبًا")}{" "}
                                       {userData?.firstName
                                          ? `${userData.firstName}`
                                          : t("sur VitaCare", "to VitaCare", "بك في VitaCare")}
                                    </Title>
                                    <Text
                                       style={{
                                          fontSize: 16,
                                          color: TEXT_MEDIUM,
                                          fontWeight: 500,
                                       }}
                                    >
                                       {t("Gérez votre santé en toute simplicité", "Manage your health records", "إدارة سجلاتك الصحية")}
                                    </Text>
                                 </div>
                                 <div
                                    style={{
                                       width: 80,
                                       height: 80,
                                       borderRadius: 20,
                                       background: `${PRIMARY}15`,
                                       display: "flex",
                                       alignItems: "center",
                                       justifyContent: "center",
                                    }}
                                 >
                                    <img
                                       src={Logo}
                                       alt="VitaCare"
                                       style={{ width: 60, height: 60 }}
                                    />
                                 </div>
                              </div>
                           </Card>
                        </Col>

                        {/* Real-time Analytics Cards */}
                        <Col xs={24} sm={12} lg={8}>
                           <Card
                              style={{
                                 borderRadius: 16,
                                 border: "none",
                                 boxShadow: "0 2px 8px rgba(26,139,183,0.06)",
                                 background: "white",
                                 overflow: "hidden",
                                 transition: "all 0.3s ease",
                              }}
                              bodyStyle={{ padding: 16 }}
                           >
                              <div
                                 style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                 }}
                              >
                                 <div
                                    style={{
                                       display: "flex",
                                       alignItems: "center",
                                       justifyContent: "center",
                                       width: 48,
                                       height: 48,
                                       borderRadius: 12,
                                       background: `${PRIMARY}15`,
                                       flexShrink: 0,
                                    }}
                                 >
                                    <FileTextOutlined
                                       style={{ fontSize: 20, color: PRIMARY }}
                                    />
                                 </div>
                                 <div style={{ flex: 1 }}>
                                    <Text
                                       style={{
                                          fontSize: 12,
                                          color: TEXT_MEDIUM,
                                          display: "block",
                                          marginBottom: 4,
                                       }}
                                    >
                                       {t("documents", "documents", "المستندات")}
                                    </Text>
                                    <div
                                       style={{
                                          display: "flex",
                                          alignItems: "baseline",
                                          gap: 6,
                                       }}
                                    >
                                       <Text
                                          style={{
                                             fontSize: 24,
                                             fontWeight: 700,
                                             color: PRIMARY,
                                             lineHeight: 1,
                                          }}
                                       >
                                          {documentCount}
                                       </Text>
                                       <Text
                                          style={{
                                             fontSize: 12,
                                             color: TEXT_MEDIUM,
                                             fontWeight: 500,
                                          }}
                                       >
                                          fichiers
                                       </Text>
                                    </div>
                                 </div>
                              </div>
                           </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={8}>
                           <Card
                              style={{
                                 borderRadius: 16,
                                 border: "none",
                                 boxShadow: "0 2px 8px rgba(82,196,26,0.06)",
                                 background: "white",
                                 overflow: "hidden",
                                 transition: "all 0.3s ease",
                              }}
                              bodyStyle={{ padding: 16 }}
                           >
                              <div
                                 style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                 }}
                              >
                                 <div
                                    style={{
                                       display: "flex",
                                       alignItems: "center",
                                       justifyContent: "center",
                                       width: 48,
                                       height: 48,
                                       borderRadius: 12,
                                       background: "#52c41a15",
                                       flexShrink: 0,
                                    }}
                                 >
                                    <FileTextOutlined
                                       style={{
                                          fontSize: 20,
                                          color: "#52c41a",
                                       }}
                                    />
                                 </div>
                                 <div style={{ flex: 1 }}>
                                    <Text
                                       style={{
                                          fontSize: 12,
                                          color: TEXT_MEDIUM,
                                          display: "block",
                                          marginBottom: 4,
                                       }}
                                    >
                                       {t("étiquettes", "tags", "الوسوم")}
                                    </Text>
                                    <div
                                       style={{
                                          display: "flex",
                                          alignItems: "baseline",
                                          gap: 6,
                                       }}
                                    >
                                       <Text
                                          style={{
                                             fontSize: 24,
                                             fontWeight: 700,
                                             color: "#52c41a",
                                             lineHeight: 1,
                                          }}
                                       >
                                          {tagCount}
                                       </Text>
                                       <Text
                                          style={{
                                             fontSize: 12,
                                             color: TEXT_MEDIUM,
                                             fontWeight: 500,
                                          }}
                                       >
                                          {t("créées", "created", "تم إنشاؤها")}
                                       </Text>
                                    </div>
                                 </div>
                              </div>
                           </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={8}>
                           <Card
                              style={{
                                 borderRadius: 16,
                                 border: "none",
                                 boxShadow: "0 2px 8px rgba(255,77,79,0.06)",
                                 background: "white",
                                 overflow: "hidden",
                                 transition: "all 0.3s ease",
                              }}
                              bodyStyle={{ padding: 16 }}
                           >
                              <div
                                 style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                 }}
                              >
                                 <div
                                    style={{
                                       display: "flex",
                                       alignItems: "center",
                                       justifyContent: "center",
                                       width: 48,
                                       height: 48,
                                       borderRadius: 12,
                                       background: `${COLORS.WARNING}15`,
                                       flexShrink: 0,
                                    }}
                                 >
                                    <BellOutlined
                                       style={{
                                          fontSize: 20,
                                          color: COLORS.WARNING,
                                       }}
                                    />
                                 </div>
                                 <div style={{ flex: 1 }}>
                                    <Text
                                       style={{
                                          fontSize: 12,
                                          color: TEXT_MEDIUM,
                                          display: "block",
                                          marginBottom: 4,
                                       }}
                                    >
                                       {t("alertes médicales", "medical alerts", "التنبيهات الطبية")}
                                    </Text>
                                    <div
                                       style={{
                                          display: "flex",
                                          alignItems: "baseline",
                                          gap: 6,
                                       }}
                                    >
                                       <Text
                                          style={{
                                             fontSize: 24,
                                             fontWeight: 700,
                                             color: COLORS.WARNING,
                                             lineHeight: 1,
                                          }}
                                       >
                                          {(userData?.allergies &&
                                          userData.allergies.trim()
                                             ? userData.allergies.split(",")
                                                  .length
                                             : 0) +
                                             (userData?.chronicConditions &&
                                             userData.chronicConditions.trim()
                                                ? userData.chronicConditions.split(
                                                     ","
                                                  ).length
                                                : 0) +
                                             (userData?.medications &&
                                             userData.medications.trim()
                                                ? userData.medications.split(
                                                     ","
                                                  ).length
                                                : 0)}
                                       </Text>
                                       <Text
                                          style={{
                                             fontSize: 12,
                                             color: TEXT_MEDIUM,
                                             fontWeight: 500,
                                          }}
                                       >
                                          {t("actives", "active", "نشطة")}
                                       </Text>
                                    </div>
                                 </div>
                              </div>
                           </Card>
                        </Col>

                        {/* Personal Information Section */}
                        {userData && !loading && (
                           <Col span={24}>
                              <Card
                                 style={{
                                    borderRadius: 16,
                                    border: "none",
                                    boxShadow:
                                       "0 2px 8px rgba(26,139,183,0.06)",
                                    background: "white",
                                 }}
                                 bodyStyle={{ padding: 20 }}
                              >
                                 <Title
                                    level={4}
                                    style={{
                                       margin: 0,
                                       marginBottom: 20,
                                       color: TEXT_DARK,
                                       fontWeight: 600,
                                    }}
                                 >
                                    {t("informations personnelles", "Personal information", "المعلومات الشخصية")}
                                 </Title>

                                 <Row gutter={[24, 24]}>
                                    {/* Demographics Card */}
                                    <Col xs={24} lg={8}>
                                       <Card
                                          style={{
                                             height: "100%",
                                             borderRadius: 12,
                                             border: `1px solid ${PRIMARY}15`,
                                          }}
                                          bodyStyle={{ padding: 20 }}
                                       >
                                          <Title
                                             level={5}
                                             style={{
                                                margin: 0,
                                                marginBottom: 16,
                                                color: TEXT_DARK,
                                             }}
                                          >
                                             {t("informations démographiques", "Personal details", "البيانات الشخصية")}
                                          </Title>
                                          <div
                                             style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 16,
                                             }}
                                          >
                                             {userData.dateOfBirth && (
                                                <div>
                                                   <Text
                                                      style={{
                                                         fontSize: 12,
                                                         color: TEXT_MEDIUM,
                                                         display: "block",
                                                         marginBottom: 4,
                                                      }}
                                                   >
                                                      {t("âge", "Age", "العمر")}
                                                   </Text>
                                                   <Text
                                                      strong
                                                      style={{
                                                         fontSize: 18,
                                                         color: TEXT_DARK,
                                                      }}
                                                   >
                                                      {moment().diff(
                                                         moment(
                                                            userData.dateOfBirth
                                                         ),
                                                         "years"
                                                      )}{" "}
                                                      {t("ans", "years", "سنة")}
                                                   </Text>
                                                </div>
                                             )}
                                             {userData.gender && (
                                                <div>
                                                   <Text
                                                      style={{
                                                         fontSize: 12,
                                                         color: TEXT_MEDIUM,
                                                         display: "block",
                                                         marginBottom: 4,
                                                      }}
                                                   >
                                                      {t("genre", "Gender", "الجنس")}
                                                   </Text>
                                                   <Text
                                                      strong
                                                      style={{
                                                         fontSize: 18,
                                                         color: TEXT_DARK,
                                                      }}
                                                   >
                                                      {userData.gender ===
                                                      "MALE"
                                                         ? t("homme", "Male", "ذكر")
                                                         : t("femme", "Female", "أنثى")}
                                                   </Text>
                                                </div>
                                             )}
                                             {userData.phoneNumber && (
                                                <div>
                                                   <Text
                                                      style={{
                                                         fontSize: 12,
                                                         color: TEXT_MEDIUM,
                                                         display: "block",
                                                         marginBottom: 4,
                                                      }}
                                                   >
                                                      {t("téléphone", "Phone", "الهاتف")}
                                                   </Text>
                                                   <Text
                                                      strong
                                                      style={{
                                                         fontSize: 16,
                                                         color: TEXT_DARK,
                                                      }}
                                                   >
                                                      {userData.phoneNumber}
                                                   </Text>
                                                </div>
                                             )}
                                             {userData.bloodType && (
                                                <div>
                                                   <Text
                                                      style={{
                                                         fontSize: 12,
                                                         color: TEXT_MEDIUM,
                                                         display: "block",
                                                         marginBottom: 4,
                                                      }}
                                                   >
                                                      {t("groupe sanguin", "Blood type", "فصيلة الدم")}
                                                   </Text>
                                                   <Text
                                                      strong
                                                      style={{
                                                         fontSize: 18,
                                                         color: TEXT_DARK,
                                                      }}
                                                   >
                                                      {userData.bloodType}
                                                   </Text>
                                                </div>
                                             )}
                                          </div>
                                       </Card>
                                    </Col>

                                    {/* Health Metrics Card */}
                                    <Col xs={24} lg={8}>
                                       <Card
                                          style={{
                                             height: "100%",
                                             borderRadius: 12,
                                             border: `1px solid ${PRIMARY}15`,
                                          }}
                                          bodyStyle={{ padding: 20 }}
                                       >
                                          <Title
                                             level={5}
                                             style={{
                                                margin: 0,
                                                marginBottom: 16,
                                                color: TEXT_DARK,
                                             }}
                                          >
                                             {t("métriques de santé", "Health metrics", "المؤشرات الصحية")}
                                          </Title>
                                          <div
                                             style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 16,
                                             }}
                                          >
                                             {userData.height &&
                                                Number(userData.height) > 0 && (
                                                   <div>
                                                      <Text
                                                         style={{
                                                            fontSize: 12,
                                                            color: TEXT_MEDIUM,
                                                            display: "block",
                                                            marginBottom: 4,
                                                         }}
                                                      >
                                                         {t("taille", "Height", "الطول")}
                                                      </Text>
                                                      <Text
                                                         strong
                                                         style={{
                                                            fontSize: 18,
                                                            color: TEXT_DARK,
                                                         }}
                                                      >
                                                         {userData.height} cm
                                                      </Text>
                                                   </div>
                                                )}
                                             {userData.weight &&
                                                Number(userData.weight) > 0 && (
                                                   <div>
                                                      <Text
                                                         style={{
                                                            fontSize: 12,
                                                            color: TEXT_MEDIUM,
                                                            display: "block",
                                                            marginBottom: 4,
                                                         }}
                                                      >
                                                         {t("poids", "Weight", "الوزن")}
                                                      </Text>
                                                      <Text
                                                         strong
                                                         style={{
                                                            fontSize: 18,
                                                            color: TEXT_DARK,
                                                         }}
                                                      >
                                                         {userData.weight} kg
                                                      </Text>
                                                   </div>
                                                )}
                                             {userData.height &&
                                                Number(userData.height) > 0 &&
                                                userData.weight &&
                                                Number(userData.weight) > 0 && (
                                                   <div>
                                                      <Text
                                                         style={{
                                                            fontSize: 12,
                                                            color: TEXT_MEDIUM,
                                                            display: "block",
                                                            marginBottom: 4,
                                                         }}
                                                      >
                                                         {t("imc", "BMI", "مؤشر كتلة الجسم")}
                                                      </Text>
                                                      <Text
                                                         strong
                                                         style={{
                                                            fontSize: 18,
                                                            color: TEXT_DARK,
                                                         }}
                                                      >
                                                         {(
                                                            userData.weight /
                                                            Math.pow(
                                                               userData.height /
                                                                  100,
                                                               2
                                                            )
                                                         ).toFixed(1)}
                                                      </Text>
                                                      <Text
                                                         style={{
                                                            color: (() => {
                                                               const bmi =
                                                                  userData.weight /
                                                                  Math.pow(
                                                                     userData.height /
                                                                        100,
                                                                     2
                                                                  );
                                                               if (bmi < 18.5)
                                                                  return "#fa8c16";
                                                               if (bmi < 25)
                                                                  return "#52c41a";
                                                               if (bmi < 30)
                                                                  return "#fa8c16";
                                                               return "#ff4d4f";
                                                            })(),
                                                            marginLeft: 8,
                                                            fontSize: 14,
                                                            fontWeight: 500,
                                                         }}
                                                      >
                                                         {(() => {
                                                            const bmi =
                                                               userData.weight /
                                                               Math.pow(
                                                                  userData.height /
                                                                     100,
                                                                  2
                                                               );
                                                            if (bmi < 18.5)
                                                               return t("insuffisance pondérale", "underweight", "نقص الوزن");
                                                            if (bmi < 25)
                                                               return t("normal", "normal", "طبيعي");
                                                            if (bmi < 30)
                                                               return t("surpoids", "overweight", "زيادة الوزن");
                                                            return t("obésité", "obesity", "السمنة");
                                                         })()}
                                                      </Text>
                                                   </div>
                                                )}
                                          </div>
                                       </Card>
                                    </Col>

                                    {/* Medical Alerts Card */}
                                    <Col xs={24} lg={8}>
                                       <Card
                                          style={{
                                             height: "100%",
                                             borderRadius: 12,
                                             border: "1px solid #fa8c1615",
                                          }}
                                          bodyStyle={{ padding: 20 }}
                                       >
                                          <Title
                                             level={5}
                                             style={{
                                                margin: 0,
                                                marginBottom: 16,
                                                color: TEXT_DARK,
                                             }}
                                          >
                                             {t("alertes médicales", "medical alerts", "التنبيهات الطبية")}
                                          </Title>
                                          <div
                                             style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 16,
                                             }}
                                          >
                                             {userData.allergies &&
                                                userData.allergies.trim() && (
                                                   <div>
                                                      <Text
                                                         style={{
                                                            fontSize: 12,
                                                            color: TEXT_MEDIUM,
                                                            display: "block",
                                                            marginBottom: 4,
                                                         }}
                                                      >
                                                         {t("allergies", "Allergies", "الحساسية")}
                                                      </Text>
                                                      <Text
                                                         strong
                                                         style={{
                                                            fontSize: 18,
                                                            color: TEXT_DARK,
                                                         }}
                                                      >
                                                         {userData.allergies
                                                            .length > 80
                                                            ? userData.allergies.substring(
                                                                 0,
                                                                 80
                                                              ) + "..."
                                                            : userData.allergies}
                                                      </Text>
                                                   </div>
                                                )}
                                             {userData.chronicConditions &&
                                                userData.chronicConditions.trim() && (
                                                   <div>
                                                      <Text
                                                         style={{
                                                            fontSize: 12,
                                                            color: TEXT_MEDIUM,
                                                            display: "block",
                                                            marginBottom: 4,
                                                         }}
                                                      >
                                                         {t("maladies chroniques", "Chronic conditions", "الأمراض المزمنة")}
                                                      </Text>
                                                      <Text
                                                         strong
                                                         style={{
                                                            fontSize: 18,
                                                            color: TEXT_DARK,
                                                         }}
                                                      >
                                                         {userData
                                                            .chronicConditions
                                                            .length > 80
                                                            ? userData.chronicConditions.substring(
                                                                 0,
                                                                 80
                                                              ) + "..."
                                                            : userData.chronicConditions}
                                                      </Text>
                                                   </div>
                                                )}
                                             {userData.medications &&
                                                userData.medications.trim() && (
                                                   <div>
                                                      <Text
                                                         style={{
                                                            fontSize: 12,
                                                            color: TEXT_MEDIUM,
                                                            display: "block",
                                                            marginBottom: 4,
                                                         }}
                                                      >
                                                         {t("médicaments", "Medication", "الأدوية")}
                                                      </Text>
                                                      <Text
                                                         strong
                                                         style={{
                                                            fontSize: 18,
                                                            color: TEXT_DARK,
                                                         }}
                                                      >
                                                         {userData.medications
                                                            .length > 80
                                                            ? userData.medications.substring(
                                                                 0,
                                                                 80
                                                              ) + "..."
                                                            : userData.medications}
                                                      </Text>
                                                   </div>
                                                )}
                                          </div>
                                       </Card>
                                    </Col>
                                 </Row>
                              </Card>
                           </Col>
                        )}
                     </Row>
                  )}
                  {activePage === "2" && <AnalysisPage key={filename || "text"} filename={filename}
                     autoStart={filename && autoStart?.document === filename ? autoStart.language : null}
                     onSelect={(document, execute = false) => selectDocument(document, execute, true)} />}
                  {(activePage === "3" || activePage === "4") && <DoctorCollaborationPage key={activePage}
                     showConnections={activePage === "4"} openConnections={() => setActivePage("4")} />}
                  {activePage === "5" && <CareExpensesPage />}
                  {activePage === "9" && (
                     <GestionDocuments searchQuery={searchQuery} onAnalyse={selectDocument} onClearSearch={() => setSearchQuery("")} />
                  )}
                  {activePage === "10" && <GestionProfile />}
               </Content>
            </Layout>
         </Layout>
         <Modal title={t("Paramètres", "Settings", "الإعدادات")} open={settingsOpen}
            footer={null} onCancel={() => setSettingsOpen(false)}>
            <Space direction="vertical" style={{ width: "100%" }}>
               <label htmlFor="app-language">{t("Langue", "Language", "اللغة")}</label>
               <Select id="app-language" style={{ width: "100%" }} value={language} options={languages}
                  onChange={setLanguage} />
            </Space>
         </Modal>
      </ConfigProvider>
   );
}

export default Dashboard;


