const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('release metadata uses the final release identity and project links', () => {
  const packageJson = JSON.parse(read('package.json'));
  const readme = read('README.md');
  const changelog = read('CHANGELOG.md');
  const release = read('RELEASE.md');
  const funding = read('.github/FUNDING.yml');

  assert.equal(packageJson.version, '0.1.13');
  assert.equal(packageJson.repository.url, 'https://github.com/MarkusSela/PokeTokenBarWindows.git');
  assert.equal(packageJson.homepage, 'https://github.com/MarkusSela/PokeTokenBarWindows');
  assert.equal(packageJson.description, 'A local-first desktop companion that turns AI coding usage into Pokémon progress.');
  assert.equal(packageJson.build.nsis.artifactName, 'PokeTokenBar-Windows-Setup-${version}.exe');
  assert.equal(packageJson.private, undefined);
  assert.match(readme, /> \*\*Current release: v0\.1\.13\*\*/);
  assert.match(readme, /The current release is `v0\.1\.13`\./);
  assert.match(readme, /MarkusSela\/PokeTokenBarWindows/);
  assert.match(readme, /https:\/\/ko-fi\.com\/marukoshi/);
  assert.match(funding, /https:\/\/ko-fi\.com\/marukoshi/);
  assert.match(readme, /## About this project/);
  assert.match(readme, /## 📸 Screenshots/);
  assert.match(readme, /## 📦 Install/);
  assert.match(changelog, /## \[0\.1\.13\] — Mint icon and Poké Doll follow-up/);
  assert.match(release, /PokeTokenBar-Windows-Setup-0\.1\.13\.exe/);
  assert.match(release, /tag: `v0\.1\.13`/);
  for (const document of [readme, changelog, release]) {
    assert.doesNotMatch(document, /private preview|private-preview|preview build|early Windows preview/i);
  }
  assert.doesNotMatch(readme, /platform-/i);
  assert.doesNotMatch(readme, /PokeTokenBarWindows-Lab|PokeTokenBar-Windows-Lab/);
  assert.doesNotMatch(readme, /Support future ports|future companion ports/i);
});

test('README language selector points to local translated documents', () => {
  const documents = [
    ['README.md', 'English'],
    ['README.zh-CN.md', '简体中文'],
    ['README.it.md', 'Italiano'],
    ['README.ja.md', '日本語'],
    ['README.ko.md', '한국어'],
  ];

  for (const [documentName, languageLabel] of documents) {
    const documentPath = path.join(root, documentName);
    assert.equal(fs.existsSync(documentPath), true, `${languageLabel} README is missing`);
    const document = read(documentName);
    assert.match(document, /aria-label="Language selector"/, `${documentName} has no language selector`);
    assert.ok(document.includes('https://ko-fi.com/marukoshi'), `${documentName} is missing the Ko-fi link`);
    assert.ok(document.includes('img.shields.io/badge/Support%20on-Ko--fi-ff5e5b?logo=ko-fi&logoColor=white'), `${documentName} is missing the Ko-fi badge`);
    assert.equal((document.match(/&nbsp;\|&nbsp;/g) || []).length, 4, `${documentName} has an incomplete language row`);
    for (const [targetName, targetLabel] of documents) {
      assert.ok(document.includes(`href="${targetName}"`), `${documentName} is missing ${targetLabel} link`);
    }
  }

  const english = read('README.md');
  assert.ok(english.indexOf('href="README.md"') < english.indexOf('href="README.zh-CN.md"'));
});

test('Windows packaging never triggers implicit GitHub publishing', () => {
  const packageJson = JSON.parse(read('package.json'));

  assert.match(packageJson.scripts.dist, /electron-builder --win nsis --publish never/);
});

test('README screenshot table references only existing documentation images', () => {
  const readme = read('README.md');
  const imagePaths = [...readme.matchAll(/(?:src|href)="(docs\/images\/[^"?#]+\.(?:png|gif))"/g)].map((match) => match[1]);

  assert.equal(new Set(imagePaths).size, 10);
  for (const imagePath of imagePaths) {
    assert.equal(fs.existsSync(path.join(root, imagePath)), true, imagePath);
  }
});

test('README uses the supplied animated Home screenshot', () => {
  const readme = read('README.md');
  const homeGif = path.join(root, 'docs/images/screenshot-home.gif');
  const homePng = path.join(root, 'docs/images/screenshot-home.png');

  assert.match(readme, /src="docs\/images\/screenshot-home\.gif"/);
  assert.match(readme, /The place to start\./);
  assert.equal(fs.existsSync(homeGif), true);
  assert.equal(fs.existsSync(homePng), false);
});

test('README pairs every visual preview with an explanation and groups Settings previews', () => {
  const readme = read('README.md');
  const rows = [...readme.matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((match) => match[0]);
  const visualPaths = [
    ...[...readme.matchAll(/(?:src|href)="(docs\/images\/[^"?#]+\.(?:png|gif))"/g)].map((match) => match[1]),
    'assets/gold-companion-walking.gif',
  ];

  assert.match(readme, /class="screenshot-table"/);
  assert.equal((readme.match(/class="screenshot-explanation"/g) || []).length, 10);
  for (const visualPath of visualPaths) {
    const row = rows.find((candidate) => candidate.includes(`src="${visualPath}"`));
    assert.ok(row, `missing README row for ${visualPath}`);
    assert.match(row, /class="screenshot-explanation"/);
  }

  const settingsRow = rows.find((row) => row.includes('docs/images/settings.png'));
  assert.ok(settingsRow, 'missing Settings README row');
  assert.match(settingsRow, /docs\/images\/screenshot-scan-folders\.png/);
  assert.match(settingsRow, /General:/);
  assert.match(settingsRow, /Advanced scan:/);
});
