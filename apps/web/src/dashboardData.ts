import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Box,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Home,
  MapPin,
  PackageCheck,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  icon: LucideIcon;
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
  { label: "采购", icon: ShoppingCart },
  { label: "库存", icon: Warehouse },
  { label: "合同", icon: FileText },
  { label: "项目点", icon: MapPin },
  { label: "人员权限", icon: Users },
  { label: "Excel 导入", icon: FileSpreadsheet },
];

export const workflowSteps = [
  { label: "采购需求", tone: "blue", icon: ClipboardCheck },
  { label: "待审批", tone: "orange", icon: Bell },
  { label: "采购执行", tone: "green", icon: ShoppingCart },
  { label: "入库", tone: "purple", icon: Truck },
  { label: "库存", tone: "blue", icon: Box },
  { label: "项目点领用", tone: "cyan", icon: MapPin },
] as const;

export const metrics: MetricCard[] = [
  { label: "待审批", value: "12", detail: "3 条超时", tone: "blue", icon: ClipboardCheck },
  { label: "采购需求", value: "23", detail: "本月创建", tone: "green", icon: ShoppingCart },
  { label: "入库记录", value: "18", detail: "本月入库", tone: "purple", icon: Truck },
  { label: "低库存物料", value: "15", detail: "低于安全库存", tone: "orange", icon: PackageCheck },
  { label: "项目点领用", value: "36", detail: "本月领用", tone: "cyan", icon: MapPin },
];

export const approvals = [
  { title: "采购需求单 PR20240511012", applicant: "张三", amount: "¥12,450.00", age: "2 小时前", risk: "超时" },
  { title: "采购需求单 PR20240511011", applicant: "李四", amount: "¥8,760.00", age: "4 小时前", risk: "超时" },
  { title: "合同审批 HT20240509008", applicant: "王五", amount: "¥55,000.00", age: "1 天前", risk: "" },
  { title: "采购需求单 PR20240510009", applicant: "赵六", amount: "¥3,210.00", age: "1 天前", risk: "" },
  { title: "入库单审批 RK20240510007", applicant: "张三", amount: "¥6,800.00", age: "1 天前", risk: "" },
];

export const purchaseRecords = [
  {
    id: "PO20240511013",
    purchaser: "张三",
    sourceType: "供应商采购",
    sourceName: "晨光贸易有限公司",
    supplierName: "晨光贸易有限公司",
    materials: "5",
    status: "已下单",
    time: "05-11 10:15",
  },
  {
    id: "PO20240511012",
    purchaser: "李四",
    sourceType: "平台采购",
    sourceName: "京东企业购",
    supplierName: "",
    materials: "8",
    status: "已下单",
    time: "05-11 09:41",
  },
  {
    id: "PO20240510010",
    purchaser: "赵六",
    sourceType: "平台采购",
    sourceName: "1688",
    supplierName: "1688商家待建档",
    materials: "3",
    status: "部分到货",
    time: "05-10 16:22",
  },
  {
    id: "PO20240510009",
    purchaser: "赵六",
    sourceType: "线下采购",
    sourceName: "线下门店",
    supplierName: "线下门店待建档",
    materials: "6",
    status: "待采购",
    time: "05-10 15:18",
  },
  {
    id: "PO20240509008",
    purchaser: "李四",
    sourceType: "供应商采购",
    sourceName: "华强五金厂",
    supplierName: "华强五金厂",
    materials: "4",
    status: "已到货",
    time: "05-09 11:07",
  },
];

export const receivingRecords = [
  { id: "RK20240511005", supplier: "晨光贸易有限公司", materials: "7", amount: "¥14,220.00", time: "05-11 14:23" },
  { id: "RK20240510004", supplier: "华强五金厂", materials: "5", amount: "¥6,800.00", time: "05-10 10:32" },
  { id: "RK20240509003", supplier: "上海达信建材", materials: "9", amount: "¥23,450.00", time: "05-09 15:44" },
  { id: "RK20240508002", supplier: "汇丰电气设备", materials: "3", amount: "¥3,150.00", time: "05-08 09:16" },
  { id: "RK20240507001", supplier: "优品机电科技", materials: "4", amount: "¥5,600.00", time: "05-07 16:30" },
];

export const lowStockMaterials = [
  { code: "M-1002001", name: "6分镀锌管（4米/根）", current: "28", safe: "50", status: "预警" },
  { code: "M-1003002", name: "PVC线管 DN20（3米/根）", current: "42", safe: "80", status: "预警" },
  { code: "M-2001005", name: "M8x60 膨胀螺栓", current: "120", safe: "200", status: "预警" },
  { code: "M-3004003", name: "32A 漏电保护器", current: "8", safe: "20", status: "紧急" },
  { code: "M-4001002", name: "水泥 P·O 42.5（袋）", current: "35", safe: "100", status: "预警" },
];

export const siteUsage = [
  { site: "科技园一期项目部", amount: "¥18,450.00", count: "12", materials: "26" },
  { site: "滨江商业综合体项目部", amount: "¥15,230.00", count: "9", materials: "22" },
  { site: "高新产业园项目部", amount: "¥9,860.00", count: "8", materials: "18" },
  { site: "市政道路改造项目部", amount: "¥6,320.00", count: "6", materials: "12" },
  { site: "维护维修项目组", amount: "¥3,210.00", count: "4", materials: "7" },
];

export const systemStatus = [
  { label: "API 服务", detail: "运行正常", side: "响应时间 120ms", tone: "success" },
  { label: "数据库连接", detail: "运行正常", side: "PostgreSQL", tone: "success" },
  { label: "附件存储", detail: "运行正常", side: "本地存储", tone: "success" },
  { label: "应用版本", detail: "v0.1.0", side: "当前版本", tone: "info" },
];

export const inventoryTabs = ["物料管理", "入库登记", "出库登记", "当前库存查询", "项目点领用记录"] as const;

export const inventoryMaterials = [
  { code: "MAT0001", name: "定制员工工服", specification: "夏装 L 码", unit: "套", category: "定制物料", status: "启用" },
  { code: "MAT0002", name: "定制纸杯", specification: "250ml / 1000只", unit: "箱", category: "定制物料", status: "启用" },
  { code: "MAT0003", name: "办公复印纸", specification: "A4 70g", unit: "箱", category: "办公物料", status: "启用" },
];

export const inventoryInboundRecords = [
  { id: "IN20260511001", date: "2026-05-11", material: "定制员工工服", quantity: "120 套", source: "采购" },
  { id: "IN20260510002", date: "2026-05-10", material: "定制纸杯", quantity: "80 箱", source: "采购" },
  { id: "IN20260509003", date: "2026-05-09", material: "办公复印纸", quantity: "40 箱", source: "期初" },
];

export const inventoryOutboundRecords = [
  { id: "OUT20260511001", date: "2026-05-11", target: "project_site", material: "定制员工工服", quantity: "32 套" },
  { id: "OUT20260510001", date: "2026-05-10", target: "internal_office", material: "办公复印纸", quantity: "6 箱" },
  { id: "OUT20260509001", date: "2026-05-09", target: "subcontractor", material: "定制纸杯", quantity: "12 箱" },
];

export const inventorySnapshot = [
  { warehouse: "WH-WX-HQ", material: "MAT0001", current: "90", unit: "箱", status: "正常" },
  { warehouse: "WH-WX-HQ", material: "MAT0002", current: "9", unit: "套", status: "低库存" },
  { warehouse: "WH-SITE-01", material: "MAT0001", current: "4", unit: "箱", status: "项目点" },
];

export const projectUsageRequests = [
  { requestNo: "USE20260511001", site: "科技园一期项目部", material: "MAT0001", quantity: "12", status: "待处理" },
  { requestNo: "USE20260510002", site: "滨江商业综合体项目部", material: "MAT0002", quantity: "3", status: "部分出库" },
];

export const SettingsIcon = Settings;
