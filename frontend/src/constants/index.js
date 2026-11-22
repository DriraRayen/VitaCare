import React from "react";
import {
   DashboardOutlined,
   FileTextOutlined,
   BarChartOutlined,
   MedicineBoxOutlined,
   TeamOutlined,
   WalletOutlined,
} from "@ant-design/icons";

// Color palette
export const COLORS = {
   PRIMARY: "#1A8BB7",
   SECONDARY: "#1ABC9C",
   BG_LIGHT: "#F8FAFC",
   BG_CARD: "#fff",
   SIDEBAR_BG: "#F3F6F9",
   SIDEBAR_BORDER: "#E3E8EF",
   TEXT_DARK: "#22313F",
   TEXT_MEDIUM: "#4B5C6B",
   GREY: "#B0B8C1",
   WARNING: "#fa8c16",
};

// Sidebar menu items configuration
export const SIDER_ITEMS = [
   {
      key: "1",
      icon: <DashboardOutlined />,
   },
   {
      key: "2",
      icon: <BarChartOutlined />,
   },
   {
      key: "3",
      icon: <MedicineBoxOutlined />,
   },
   {
      key: "4",
      icon: <TeamOutlined />,
   },
   {
      key: "5",
      icon: <WalletOutlined />,
   },
   {
      key: "9",
      icon: <FileTextOutlined />,
   },
];
