// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'TRRT Specifications',
  tagline: 'Term Reference Resolution Tool (TRRT)',
  favicon: 'img/logo-tno-terminology-design.ico',

  // Set the production url of your site here
  url: 'https://tno-terminology-design.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/trrt/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'tno-terminology-design', // Usually your GitHub org/user name.
  projectName: 'trrt', // Usually your repo name.

  onBrokenLinks: 'log',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  // i18n: {
  //   defaultLocale: 'en',
  //   locales: ['en'],
  // },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/tno-terminology-design/trrt/blob/master/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          breadcrumbs: false,
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/tno-terminology-design/trrt/blob/master/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      // image: 'img/docusaurus-social-card.jpg',
      docs: {
        sidebar: {
          autoCollapseCategories: true, 
          hideable: true,
        },
      },
      navbar: {
        title: 'Home',
        logo: { src: 'img/tev2-new-babylon-medium.png', },
        items: [
          { to: 'docs/intro',          label: 'Term Reference Resolution Tool',      position: 'left'},
          // { to: 'docs/trrt/translate-your-site', label: 'Translate Your Site', position: 'left'},
          { href: 'https://github.com/tno-terminology-design/trrt', label: 'Github',     position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Toolbox Repositories',
            items: [
              { label: 'TRRT',  href: 'https://github.com/tno-terminology-design/trrt' },
              { label: 'MRGT',  href: 'https://github.com/tno-terminology-design/mrgt' },
              { label: 'MRG importer',  href: 'https://github.com/tno-terminology-design/mrg-import' },
            ],
          },
          {
            title: 'Terminology Design',
            items: [
              { label: 'Introduction',  href: 'https://tno-terminology-design.github.io/tev2-specifications/docs/terminology-design/overview' },
              { label: 'Methods',       href: 'https://tno-terminology-design.github.io/tev2-specifications/docs/terminology-design/methods' },
              { label: 'Github', href: 'https://github.com/tno-terminology-design/tev2-specifications/tree/master/docs/terms' },
            ],
          },
          {
            title: 'TEv2 User Manuals',
            items: [
              { label: 'Curators',      href: 'https://tno-terminology-design.github.io/tev2-specifications/docs/manuals/curator' },
              { label: 'Contributors',  href: 'https://tno-terminology-design.github.io/tev2-specifications/docs/manuals/contributor' },
              { label: 'Authors',       href: 'https://tno-terminology-design.github.io/tev2-specifications/docs/manuals/author' },
              // { label: 'Github', href: 'https://github.com/tno-terminology-design/tev2-specifications/tree/master/docs/terms' },
            ],
          },
          {
            title: 'TEv2 Specifications',
            items: [
              { label: 'Files',     href: 'https://tno-terminology-design.github.io/tev2-specifications/docs/tev2-spec-files' },
              { label: 'Syntaxes',  href: 'https://tno-terminology-design.github.io/tev2-specifications/docs/tev2-syntax' },
              { label: 'Toolbox',   href: 'https://tno-terminology-design.github.io/tev2-specifications/docs/tev2-toolbox' },
              { label: 'Github', href: 'https://github.com/tno-terminology-design/tev2-specifications/tree/master/docs/terms' },
            ],
          },
        ],
        copyright: `<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/">
                    <span property="dct:title">The TNO Terminology Design texts in this website</span> are licensed under
                    <a href="http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">
                    CC BY-SA 4.0
                      <img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;"
                             src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1">
                      <img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;"
                             src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1">
                      <img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;"
                             src="https://mirrors.creativecommons.org/presskit/icons/sa.svg?ref=chooser-v1">
                    </a>.&nbsp&nbsp(Copyright © 2022-${new Date().getFullYear()} by <span property="cc:attributionName">TNO</span>).</p>`
      },
      prism: {
        additionalLanguages: ['handlebars', 'regex', 'bash'],
      },
    }),
};

module.exports = config;
