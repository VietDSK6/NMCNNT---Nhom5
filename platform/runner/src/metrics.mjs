function finiteMetric(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function escapeLabel(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll('"', '\\"');
}

function labels(values) {
  return `{${Object.entries(values)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(",")}}`;
}

function metric(lines, name, labelValues, value) {
  lines.push(`${name}${labels(labelValues)} ${finiteMetric(value)}`);
}

export function renderPrometheusMetrics(samples, collectedAt = new Date()) {
  const lines = [
    "# HELP mini_paas_exporter_collection_timestamp_seconds Thời điểm Runner hoàn tất lần thu thập gần nhất.",
    "# TYPE mini_paas_exporter_collection_timestamp_seconds gauge",
    `mini_paas_exporter_collection_timestamp_seconds ${Math.floor(collectedAt.getTime() / 1_000)}`,
    "# HELP mini_paas_app_running Container ứng dụng đang chạy (1) hoặc không chạy (0).",
    "# TYPE mini_paas_app_running gauge",
    "# HELP mini_paas_app_healthy Health check của container đạt (1) hoặc chưa đạt (0).",
    "# TYPE mini_paas_app_healthy gauge",
    "# HELP mini_paas_app_scrape_success Runner đọc được trạng thái và số liệu cần thiết (1) hoặc gặp lỗi (0).",
    "# TYPE mini_paas_app_scrape_success gauge",
    "# HELP mini_paas_app_info Thông tin định danh phiên bản và container hiện tại.",
    "# TYPE mini_paas_app_info gauge",
    "# HELP mini_paas_app_cpu_percent Phần trăm CPU container sử dụng tại thời điểm lấy mẫu.",
    "# TYPE mini_paas_app_cpu_percent gauge",
    "# HELP mini_paas_app_memory_working_set_bytes Working set RAM của container tính bằng byte.",
    "# TYPE mini_paas_app_memory_working_set_bytes gauge",
    "# HELP mini_paas_app_memory_limit_bytes Giới hạn RAM của container tính bằng byte.",
    "# TYPE mini_paas_app_memory_limit_bytes gauge",
    "# HELP mini_paas_app_memory_usage_ratio Tỷ lệ working set RAM trên giới hạn RAM, từ 0 đến 1.",
    "# TYPE mini_paas_app_memory_usage_ratio gauge",
    "# HELP mini_paas_app_pids Số tiến trình hiện có trong container.",
    "# TYPE mini_paas_app_pids gauge",
    "# HELP mini_paas_app_network_receive_bytes_total Tổng byte container đã nhận kể từ khi khởi động.",
    "# TYPE mini_paas_app_network_receive_bytes_total counter",
    "# HELP mini_paas_app_network_transmit_bytes_total Tổng byte container đã gửi kể từ khi khởi động.",
    "# TYPE mini_paas_app_network_transmit_bytes_total counter",
  ];

  for (const sample of samples) {
    const appLabels = { app_id: sample.appId };
    metric(lines, "mini_paas_app_running", appLabels, sample.running ? 1 : 0);
    metric(lines, "mini_paas_app_healthy", appLabels, sample.healthy ? 1 : 0);
    metric(lines, "mini_paas_app_scrape_success", appLabels, sample.scrapeSuccess ? 1 : 0);
    metric(lines, "mini_paas_app_info", {
      ...appLabels,
      container_id: sample.containerId ?? "",
      version: sample.version ?? "",
      status: sample.status ?? "unknown",
      health: sample.health ?? "unknown",
    }, 1);

    if (!sample.stats) continue;
    metric(lines, "mini_paas_app_cpu_percent", appLabels, sample.stats.cpuPercent);
    metric(lines, "mini_paas_app_memory_working_set_bytes", appLabels, sample.stats.memoryWorkingSetBytes);
    metric(lines, "mini_paas_app_memory_limit_bytes", appLabels, sample.stats.memoryLimitBytes);
    metric(lines, "mini_paas_app_memory_usage_ratio", appLabels, sample.stats.memoryPercent / 100);
    metric(lines, "mini_paas_app_pids", appLabels, sample.stats.pids);
    metric(lines, "mini_paas_app_network_receive_bytes_total", appLabels, sample.stats.networkRxBytes);
    metric(lines, "mini_paas_app_network_transmit_bytes_total", appLabels, sample.stats.networkTxBytes);
  }

  return `${lines.join("\n")}\n`;
}
