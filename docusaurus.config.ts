import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import fs from 'node:fs';

// Written by scripts/sync.mjs; absent only before the first sync.
let version = {sha: 'unknown', short: 'unknown', ref: 'master', date: ''};
try {
  version = JSON.parse(fs.readFileSync('generated/version.json', 'utf8'));
} catch {
  console.warn('generated/version.json missing: run `node scripts/sync.mjs` first');
}

const repo = 'https://github.com/zell-lang/zell';

const config: Config = {
  title: 'Zell',
  tagline: 'A compiled language with Go-like simplicity, typed errors, async/await and no GC',
  favicon: 'img/logo.svg',
  url: 'https://zell-lang.github.io',
  baseUrl: '/docs/',
  organizationName: 'zell-lang',
  projectName: 'docs',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',
  onDuplicateRoutes: 'throw',
  markdown: {
    // Sources are plain CommonMark written for GitHub, not MDX.
    format: 'detect',
    hooks: {onBrokenMarkdownLinks: 'throw'},
  },
  i18n: {defaultLocale: 'en', locales: ['en']},
  customFields: {zellSha: version.sha, zellShort: version.short, zellRef: version.ref},

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/zell-lang/docs/edit/master/',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        docsRouteBasePath: '/',
        indexBlog: false,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig: {
    colorMode: {defaultMode: 'light', respectPrefersColorScheme: true},
    navbar: {
      title: 'Zell',
      logo: {alt: 'Zell', src: 'img/logo.svg'},
      items: [
        {type: 'docSidebar', sidebarId: 'guide', position: 'left', label: 'Guide'},
        {type: 'docSidebar', sidebarId: 'spec', position: 'left', label: 'Specification'},
        {type: 'docSidebar', sidebarId: 'design', position: 'left', label: 'Design docs'},
        {type: 'docSidebar', sidebarId: 'std', position: 'left', label: 'Standard library'},
        {type: 'docSidebar', sidebarId: 'examples', position: 'left', label: 'Examples'},
        {type: 'docSidebar', sidebarId: 'editors', position: 'left', label: 'Editors'},
        {type: 'docSidebar', sidebarId: 'download', position: 'right', label: 'Download'},
        {href: repo, label: 'GitHub', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {label: 'Getting started', to: '/guide/getting-started'},
            {label: 'Tour of Zell', to: '/guide/tour'},
            {label: 'Specification', to: '/spec'},
            {label: 'Standard library', to: '/std'},
          ],
        },
        {
          title: 'Get Zell',
          items: [
            {label: 'Download', to: '/download'},
            {label: 'Releases', href: `${repo}/releases`},
            {label: 'VS Code extension', to: '/editors/vscode'},
            {label: 'IDEA plugin', href: 'https://github.com/zell-lang/zell-idea-plugin'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'zell-lang on GitHub', href: 'https://github.com/zell-lang'},
            {label: 'Language repository', href: repo},
            {label: 'Issues', href: `${repo}/issues`},
          ],
        },
      ],
      copyright: `Docs built from <a href="${repo}/commit/${version.sha}">zell@${version.short}</a> (${version.ref}). Documentation sources live in zell-lang/zell.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'toml', 'json', 'powershell', 'yaml', 'diff', 'sql', 'c', 'rust', 'go', 'lua'],
    },
    docs: {sidebar: {hideable: true, autoCollapseCategories: false}},
    tableOfContents: {minHeadingLevel: 2, maxHeadingLevel: 3},
  } satisfies Preset.ThemeConfig,
};

export default config;
