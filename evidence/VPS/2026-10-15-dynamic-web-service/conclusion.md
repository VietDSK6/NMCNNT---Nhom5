# Kết luận

Luồng Web Service động đã hoạt động trên VPS: Control API đăng ký service, Runner lấy đúng commit, build image, tạo container giới hạn quyền, Gateway định tuyến theo hostname và thao tác restart thành công. Kết quả này chứng minh service không còn chỉ là App A/B cố định hoặc đường dẫn con của Control Center.

URL service đã được công khai hoàn chỉnh sau khi bổ sung wildcard `*.ai2p.id.vn` vào Cloudflare Tunnel. Kiểm tra lại từ máy ngoài xác nhận `vps-demo.ai2p.id.vn` trả đúng health/version qua HTTPS. Sản phẩm độc lập `demo` cũng trả đúng nhận diện và commit tại `demo.ai2p.id.vn`, chứng minh nền tảng không chỉ phục vụ App A/B bằng đường dẫn con.

`vps-demo` vẫn dùng context `apps/app-a` nên endpoint nhận diện là App A; bản ghi này được giữ để truy vết bài thử ban đầu. `demo` là đối tượng phù hợp hơn cho kịch bản demo cuối. Giới hạn còn lại là repository chỉ hỗ trợ GitHub công khai thuộc owner allowlist, nhánh `main`, cổng 3000; chưa có webhook, registry digest hoặc sandbox đa thuê.
