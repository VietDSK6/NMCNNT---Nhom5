export const authStrings = {
  brandName: "Mini PaaS",
  brandSub: "Control Center",
  heroTitle: "Một điểm điều khiển cho toàn bộ vòng đời ứng dụng.",
  heroText: "Từ commit Git tin cậy tới container, đường dẫn truy cập, nhật ký và chỉ số tài nguyên.",
  formEyebrow: "KHU VỰC QUẢN TRỊ",
  formTitle: "Đăng nhập hệ thống",
  formHint: "Sử dụng tài khoản quản trị được cấu hình trong môi trường triển khai.",
  usernameLabel: "Tên đăng nhập",
  passwordLabel: "Mật khẩu",
  showPassword: "Hiện mật khẩu",
  hidePassword: "Ẩn mật khẩu",
  submit: "Đăng nhập",
  submitting: "Đang xác thực",
  succeeded: "Đăng nhập thành công",
  sessionNote: "Mã phiên chỉ được lưu trong cookie HttpOnly.",
  usernameRequired: "Vui lòng nhập tên đăng nhập.",
  passwordRequired: "Vui lòng nhập mật khẩu.",
  invalidCredentials: "Tên đăng nhập hoặc mật khẩu không đúng.",
  locked: "Tài khoản tạm thời bị khóa. Hãy thử lại sau ít phút.",
  network: "Không thể kết nối tới Control API. Kiểm tra mạng rồi thử lại.",
  retry: "Thử lại",
  closeToast: "Đóng thông báo",
  connecting: "Đang kết nối Control API…",
} as const;

export const pipelineNodes = [
  { id: "git", label: "Git commit", left: 10, top: 69 },
  { id: "runner", label: "Runner", left: 37.5, top: 31 },
  { id: "container", label: "Container", left: 65, top: 69 },
  { id: "metrics", label: "Metrics", left: 90, top: 31 },
] as const;

export type PipelineNodeId = (typeof pipelineNodes)[number]["id"];

export const heroWidgets = [
  { id: "container", label: "Container chạy", tone: "success" },
  { id: "http", label: "HTTP ổn định", tone: "info" },
] as const;
