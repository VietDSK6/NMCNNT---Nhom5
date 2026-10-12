import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const manifestPath = process.argv[2];
const expectedCommit = process.argv[3]?.toLowerCase();

if (!manifestPath || !expectedCommit) {
  console.error('Cách dùng: node verify-image-manifest.mjs <manifest> <commit-sha>');
  process.exit(2);
}

function fail(message) {
  console.error(`KHÔNG ĐẠT: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`ĐẠT: ${message}`);
}

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (error) {
  fail(`không đọc được manifest JSON: ${error.message}`);
}

if (manifest.schemaVersion !== 1 || manifest.publishStatus !== 'local-only') {
  fail('schema hoặc trạng thái phát hành của manifest không đúng');
}
pass('manifest dùng schema 1 và ghi rõ ảnh mới chỉ tồn tại cục bộ');

const expectedTag = `sha-${expectedCommit.slice(0, 12)}`;
if (manifest.commit !== expectedCommit || manifest.tag !== expectedTag) {
  fail('commit hoặc tag không khớp mã commit được yêu cầu');
}
pass('commit đầy đủ và tag rút gọn liên kết đúng với nhau');

if (!Array.isArray(manifest.images) || manifest.images.length !== 2) {
  fail('manifest phải có đúng hai ảnh ứng dụng');
}
const applications = new Set(manifest.images.map((image) => image.application));
if (applications.size !== 2 || !applications.has('app-a') || !applications.has('app-b')) {
  fail('manifest thiếu app-a hoặc app-b');
}
pass('manifest có đúng hai ứng dụng trong danh sách cho phép');

for (const image of manifest.images) {
  const expectedReference = `mini-paas/${image.application}:${expectedTag}`;
  if (image.reference !== expectedReference) {
    fail(`tham chiếu ảnh ${image.application} không dùng tag commit`);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(image.imageId)) {
    fail(`image ID của ${image.application} không hợp lệ`);
  }
  if (!/^linux\/[a-z0-9_]+$/.test(image.platform)) {
    fail(`platform của ${image.application} không hợp lệ`);
  }
}
pass('tham chiếu, image ID và platform của hai ảnh đúng định dạng');

const imageIds = new Set(manifest.images.map((image) => image.imageId));
if (imageIds.size !== manifest.images.length) {
  fail('hai ứng dụng không được trỏ đến cùng một image ID');
}
pass('hai ứng dụng có image ID riêng biệt');

for (const image of manifest.images) {
  let actualId;
  let revision;
  let version;
  try {
    actualId = execFileSync('docker', ['image', 'inspect', '--format', '{{.Id}}', image.reference], { encoding: 'utf8' }).trim();
    revision = execFileSync(
      'docker',
      ['image', 'inspect', '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}', image.reference],
      { encoding: 'utf8' },
    ).trim();
    version = execFileSync(
      'docker',
      ['image', 'inspect', '--format', '{{index .Config.Labels "org.opencontainers.image.version"}}', image.reference],
      { encoding: 'utf8' },
    ).trim();
  } catch (error) {
    fail(`không inspect được ảnh ${image.reference}: ${error.message}`);
  }

  if (actualId !== image.imageId) {
    fail(`image ID thực tế của ${image.application} khác manifest`);
  }
  if (revision !== expectedCommit || version !== expectedTag) {
    fail(`nhãn revision/version của ${image.application} không khớp commit`);
  }
}
pass('image ID trong manifest khớp ảnh Docker thực tế');
pass('nhãn OCI revision và version truy vết đúng về commit');

console.log('\nP1.1A manifest: 7/7 kiểm tra đạt.');
