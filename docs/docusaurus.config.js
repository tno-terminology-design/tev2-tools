const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const terminology_design = require('./footer-links/terminology-design.json');
const manuals = require('./footer-links/manuals.json');
const specifications = require('./footer-links/specifications.json');
const repositories = require('./footer-links/repositories.json');
const copyright = require('./footer-links/copyright.json');

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
          { title: terminology_design.title, items: terminology_design.items },
          { title: manuals.title, items: manuals.items },
          { title: specifications.title, items: specifications.items, },
          { title: repositories.title, items: repositories.items },
        ],
        copyright: copyright.text.replace("[20XX-20YY]",`2022-${new Date().getFullYear()}`)
      }, 
      prism: {
        additionalLanguages: ['handlebars', 'regex', 'bash'],
      },
    }),
};

module.exports = config;
