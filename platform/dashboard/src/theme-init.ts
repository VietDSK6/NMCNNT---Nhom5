// Chạy trước khi render để áp theme đã lưu; module thay cho script inline vì CSP chỉ cho phép script cùng nguồn.
try {
  const saved = localStorage.getItem("theme");
  const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}
