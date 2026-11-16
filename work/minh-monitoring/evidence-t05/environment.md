# Môi trường kiểm thử T05 & OBS-02 (Local Windows)

- **Người thực hiện:** Trần Hải Minh (`B24DCCC206`, GitHub `THM-B24DCCC206`)
- **Ngày chạy kiểm chứng:** `16/11/2026` (giờ địa phương `Asia/Ho_Chi_Minh`)
- **Hệ điều hành:** Windows (Docker Desktop + WSL 2 backend), chạy script `.sh` qua Git Bash
- **Docker Client / Server:** `29.5.3`
- **Docker Compose:** `v5.1.4`
- **Node.js:** `v22.22.2` (trên host) / `Node 24` (bên trong container)
- **Commit nền:** `18d6a53` (`v1.0.0-rc.2` + giao diện Glass Aurora UI)
- **Phạm vi:** Kiểm chứng thực tế trên máy cá nhân với đầy đủ 8 container `healthy`, gồm:
  1. Bộ test nền `tests/integration/p1_observability.sh` (15 bước).
  2. Script mở rộng `verify-observability-rules.mjs` (target UP, 3 alert rules, 9 nhóm metric).
  3. Kịch bản sự cố giả lập `test-alert-app-a-stop.sh` (dừng `app-a` → kích hoạt `MiniPaasApplicationNotHealthy` `FIRING` → khôi phục `inactive`).
