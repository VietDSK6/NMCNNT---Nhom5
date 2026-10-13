import assert from "node:assert/strict";
import { test } from "node:test";
import { TrustedSourceBuilder } from "./source-build.mjs";

const source = {
  defaultBranch: "main",
  latestRevisionUrl: "https://api.github.test/repos/group/repo/git/ref/heads/main",
};

test("phân giải nhánh mặc định thành commit SHA bất biến", async () => {
  const commit = "a".repeat(40);
  let requestedUrl = null;
  const builder = new TrustedSourceBuilder({}, {
    fetch: async (url, options) => {
      requestedUrl = url;
      assert.equal(options.headers["user-agent"], "mini-paas-deployment-runner");
      return new Response(JSON.stringify({ object: { sha: commit } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(await builder.resolveLatestCommit(source), commit);
  assert.equal(requestedUrl, source.latestRevisionUrl);
});

test("từ chối metadata không có commit SHA hợp lệ", async () => {
  const builder = new TrustedSourceBuilder({}, {
    fetch: async () => new Response(JSON.stringify({ object: { sha: "main" } }), { status: 200 }),
  });

  await assert.rejects(builder.resolveLatestCommit(source), {
    code: "source_metadata_invalid",
    statusCode: 502,
  });
});

test("chuyển giới hạn GitHub thành lỗi có thể thử lại", async () => {
  const builder = new TrustedSourceBuilder({}, {
    fetch: async () => new Response("rate limited", { status: 403 }),
  });

  await assert.rejects(builder.resolveLatestCommit(source), {
    code: "source_provider_rate_limited",
    statusCode: 503,
  });
});
