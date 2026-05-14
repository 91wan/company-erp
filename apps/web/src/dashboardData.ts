import type { LucideIcon } from "lucide-react";
import type { PermissionAreaCode } from "@company-erp/shared";
import {
  Bell,
  Building2,
  Box,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Home,
  Landmark,
  MapPin,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  icon: LucideIcon;
  permissionArea?: PermissionAreaCode;
  active?: boolean;
};

export type MetricTone = "blue" | "green" | "purple" | "orange" | "cyan";

export type MetricCard = {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", icon: Home, active: true },
  { label: "基础资料", icon: Building2, permissionArea: "masterData" },
  { label: "采购", icon: ShoppingCart, permissionArea: "procurement" },
  { label: "库存", icon: Warehouse, permissionArea: "inventoryQuantity" },
  { label: "合同", icon: FileText, permissionArea: "contracts" },
  { label: "业务项目", icon: Landmark, permissionArea: "businessProjects" },
  { label: "证照资质", icon: ShieldCheck, permissionArea: "certificates" },
  { label: "项目点", icon: MapPin, permissionArea: "projectUsage" },
  { label: "人员权限", icon: Users, permissionArea: "employees" },
  { label: "Excel 导入", icon: FileSpreadsheet, permissionArea: "masterData" },
];

export const workflowSteps = [
  { label: "采购需求", tone: "blue", icon: ClipboardCheck },
  { label: "待审批", tone: "orange", icon: Bell },
  { label: "采购执行", tone: "green", icon: ShoppingCart },
  { label: "入库", tone: "purple", icon: Truck },
  { label: "库存", tone: "blue", icon: Box },
  { label: "项目点领用", tone: "cyan", icon: MapPin },
] as const;

export const SettingsIcon = Settings;
