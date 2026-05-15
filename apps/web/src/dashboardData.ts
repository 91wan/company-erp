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
  workspace: string;
  icon: LucideIcon;
  permissionArea?: PermissionAreaCode;
  active?: boolean;
  portalSection?: "overview" | "usage" | "rosterHealth" | "foodLicense" | "insurance" | "payroll";
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export type MetricTone = "blue" | "green" | "purple" | "orange" | "cyan";

export type MetricCard = {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
  icon: LucideIcon;
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "工作台",
    items: [{ label: "总览", workspace: "总览", icon: Home, active: true }],
  },
  {
    label: "经营业务",
    items: [
      { label: "采购", workspace: "采购", icon: ShoppingCart, permissionArea: "procurement" },
      { label: "库存", workspace: "库存", icon: Warehouse, permissionArea: "inventoryQuantity" },
      { label: "项目点", workspace: "项目点", icon: MapPin, permissionArea: "projectUsage" },
      { label: "业务项目", workspace: "业务项目", icon: Landmark, permissionArea: "businessProjects" },
      { label: "合同", workspace: "合同", icon: FileText, permissionArea: "contracts" },
    ],
  },
  {
    label: "合规与人员",
    items: [
      { label: "证照资质", workspace: "证照资质", icon: ShieldCheck, permissionArea: "certificates" },
      { label: "项目点合规", workspace: "项目点", icon: ClipboardCheck, permissionArea: "projectUsage" },
      { label: "人员权限", workspace: "人员权限", icon: Users, permissionArea: "employees" },
    ],
  },
  {
    label: "基础与系统",
    items: [
      { label: "基础资料", workspace: "基础资料", icon: Building2, permissionArea: "masterData" },
      { label: "Excel 导入", workspace: "Excel 导入", icon: FileSpreadsheet, permissionArea: "masterData" },
    ],
  },
];

export const navigationItems: NavigationItem[] = navigationGroups.flatMap((group) => group.items);

export const externalProjectSiteNavigationItems: NavigationItem[] = [
  { label: "我的项目点", workspace: "项目点", icon: MapPin, permissionArea: "projectUsage", portalSection: "overview" },
  { label: "物料领用", workspace: "项目点", icon: Truck, permissionArea: "projectUsage", portalSection: "usage" },
  { label: "现场人员/健康证", workspace: "证照资质", icon: Users, permissionArea: "certificates", portalSection: "rosterHealth" },
  { label: "食品经营许可证", workspace: "证照资质", icon: ShieldCheck, permissionArea: "certificates", portalSection: "foodLicense" },
  { label: "雇主责任险", workspace: "项目点", icon: ClipboardCheck, permissionArea: "projectUsage", portalSection: "insurance" },
  { label: "工资表", workspace: "项目点", icon: FileText, permissionArea: "projectUsage", portalSection: "payroll" },
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
