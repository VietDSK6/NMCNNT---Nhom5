export interface WebServiceInput {
  readonly name: string;
  readonly slug: string;
  readonly repositoryUrl: string;
  readonly defaultBranch: "main";
  readonly buildContext: string;
}

export class WebServiceValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

const reservedSlugs = new Set(["paas", "www", "api", "app-a", "app-b"]);
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const contextPattern = /^(?:\.|[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*)$/;

export function normalizeWebService(
  input: unknown,
  trustedOwners: readonly string[],
): WebServiceInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new WebServiceValidationError("invalid_service", "Cấu hình Web Service không hợp lệ.");
  }
  const value = input as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    throw new WebServiceValidationError("invalid_service_name", "Tên Web Service phải có từ 2 đến 80 ký tự.");
  }
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  if (!slugPattern.test(slug) || reservedSlugs.has(slug)) {
    throw new WebServiceValidationError(
      "invalid_service_slug",
      "Slug chỉ gồm chữ thường, số, dấu gạch ngang và không được trùng tên hệ thống.",
    );
  }
  const repositoryUrlInput = typeof value.repositoryUrl === "string" ? value.repositoryUrl.trim() : "";
  const repositoryMatch = repositoryUrlInput.match(/^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:\.git)?$/);
  if (!repositoryMatch) {
    throw new WebServiceValidationError(
      "invalid_repository_url",
      "Chỉ hỗ trợ repository GitHub công khai dạng https://github.com/owner/repo.",
    );
  }
  const owner = repositoryMatch[1]!;
  const repository = repositoryMatch[2]!.replace(/\.git$/, "");
  if (!trustedOwners.some((item) => item.toLowerCase() === owner.toLowerCase())) {
    throw new WebServiceValidationError(
      "repository_owner_not_allowed",
      "Chủ sở hữu repository chưa nằm trong danh sách được phép.",
      403,
    );
  }
  const defaultBranch = value.defaultBranch ?? "main";
  if (defaultBranch !== "main") {
    throw new WebServiceValidationError("branch_not_allowed", "MVP hiện chỉ triển khai nhánh main.");
  }
  const buildContext = typeof value.buildContext === "string" ? value.buildContext.trim() : ".";
  if (!contextPattern.test(buildContext) || buildContext.split("/").includes("..")) {
    throw new WebServiceValidationError(
      "invalid_build_context",
      "Build context phải là đường dẫn tương đối an toàn trong repository.",
    );
  }
  return {
    name,
    slug,
    repositoryUrl: `https://github.com/${owner}/${repository}`,
    defaultBranch: "main",
    buildContext,
  };
}
