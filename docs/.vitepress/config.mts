import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Fire Shield',
  description: 'Type-safe RBAC library for JavaScript/TypeScript - Fast, flexible, and framework-agnostic',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Fire Shield - Type-safe RBAC Library' }],
    ['meta', { property: 'og:description', content: 'Fast, flexible, and framework-agnostic RBAC library for JavaScript/TypeScript' }],
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/core' },
      { text: 'Frameworks', link: '/frameworks/vue' },
      {
        text: 'Examples',
        items: [
          { text: 'Basic Usage', link: '/examples/basic-usage' },
          { text: 'Role Hierarchy', link: '/examples/role-hierarchy' },
          { text: 'Wildcards', link: '/examples/wildcards' },
          { text: 'Audit Logging', link: '/examples/audit-logging' },
          { text: 'Multi-Tenancy', link: '/examples/multi-tenancy' },
          { text: 'Best Practices', link: '/examples/best-practices' },
        ]
      },
      { text: 'Roadmap', link: '/roadmap' },
      {
        text: 'v2.1',
        items: [
          { text: 'Changelog', link: 'https://github.com/khapu2906/fire-shield/releases' },
          { text: 'Contributing', link: 'https://github.com/khapu2906/fire-shield/blob/main/CONTRIBUTING.md' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Fire Shield?', link: '/guide/what-is-fire-shield' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Permissions', link: '/guide/permissions' },
            { text: 'Roles', link: '/guide/roles' },
            { text: 'Role Hierarchy', link: '/guide/role-hierarchy' },
            { text: 'Wildcards', link: '/guide/wildcards' },
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Audit Logging', link: '/guide/audit-logging' },
            { text: 'Performance', link: '/guide/performance' },
            { text: 'TypeScript', link: '/guide/typescript' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Core API', link: '/api/core' },
            { text: 'RBAC Builder', link: '/api/builder' },
            { text: 'Audit Logger', link: '/api/audit' },
            { text: 'TypeScript Types', link: '/api/types' },
          ]
        }
      ],
      '/frameworks/': [
        {
          text: 'Frontend Frameworks',
          items: [
            { text: 'Vue.js', link: '/frameworks/vue' },
            { text: 'React', link: '/frameworks/react' },
            { text: 'Next.js', link: '/frameworks/next' },
            { text: 'Nuxt', link: '/frameworks/nuxt' },
            { text: 'Angular', link: '/frameworks/angular' },
            { text: 'Svelte', link: '/frameworks/svelte' },
          ]
        },
        {
          text: 'Backend Frameworks',
          items: [
            { text: 'Express', link: '/frameworks/express' },
            { text: 'Fastify', link: '/frameworks/fastify' },
            { text: 'Hono', link: '/frameworks/hono' },
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Usage', link: '/examples/basic-usage' },
            { text: 'Role Hierarchy', link: '/examples/role-hierarchy' },
            { text: 'Wildcards', link: '/examples/wildcards' },
            { text: 'Audit Logging', link: '/examples/audit-logging' },
            { text: 'Multi-Tenancy', link: '/examples/multi-tenancy' },
            { text: 'Best Practices', link: '/examples/best-practices' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/khapu2906/fire-shield' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@fire-shield/core' }
    ],

    footer: {
      message: 'Released under the DIB License. | <a href="https://buymeacoffee.com/kentphung92" target="_blank" style="color: var(--vp-c-brand);">☕ Support the Project</a>',
      copyright: 'Copyright © 2025 Fire Shield Team'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/khapu2906/fire-shield/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
