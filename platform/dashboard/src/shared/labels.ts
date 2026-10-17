import type { DeploymentItem, OperationAction, OperationItem, ReleaseItem } from "../types";

export const actionLabels: Record<string, string> = {
  "auth.login": "Đăng nhập",
  "auth.logout": "Đăng xuất",
  "application.start": "Khởi động ứng dụng",
  "application.stop": "Dừng ứng dụng",
  "application.restart": "Khởi động lại ứng dụng",
  "application.update": "Cập nhật phiên bản",
  "application.environment.update": "Cập nhật biến môi trường",
  "deployment.create": "Triển khai từ Git",
  "release.rollback": "Khôi phục phiên bản",
  "service.create": "Tạo Web Service",
};

export const operationActionLabels: Record<OperationAction, string> = {
  start: "Khởi động",
  stop: "Dừng",
  restart: "Khởi động lại",
  update: "Cập nhật",
};

export const operationStatusLabels: Record<OperationItem["status"], string> = {
  queued: "Đang chờ",
  running: "Đang xử lý",
  succeeded: "Thành công",
  failed: "Thất bại",
};

export const deploymentStatusLabels: Record<DeploymentItem["status"], string> = {
  queued: "Đang chờ",
  running: "Đang build",
  succeeded: "Thành công",
  failed: "Thất bại",
};

export const releaseOriginLabels: Record<ReleaseItem["origin"], string> = {
  catalog: "Cập nhật phiên bản",
  source: "Triển khai từ Git",
  rollback: "Khôi phục phiên bản",
};
