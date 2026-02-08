# Installation

Install Fire Shield in your project with your preferred package manager.

## Core Package

All Fire Shield integrations require the core package:

::: code-group

```bash [npm]
npm install @fire-shield/core
```

```bash [yarn]
yarn add @fire-shield/core
```

```bash [pnpm]
pnpm add @fire-shield/core
```

:::

## Framework Adapters

Install the adapter for your framework:

### Vue.js

```bash
npm install @fire-shield/vue @fire-shield/core
```

### React

```bash
npm install @fire-shield/react @fire-shield/core
```

### Next.js

```bash
npm install @fire-shield/next @fire-shield/core
```

### Nuxt

```bash
npm install @fire-shield/nuxt @fire-shield/core
```

### Angular

```bash
npm install @fire-shield/angular @fire-shield/core
```

### Svelte

```bash
npm install @fire-shield/svelte @fire-shield/core
```

### Express

```bash
npm install @fire-shield/express @fire-shield/core
```

### Fastify

```bash
npm install @fire-shield/fastify @fire-shield/core
```

### Hono

```bash
npm install @fire-shield/hono @fire-shield/core
```

## Requirements

- Node.js 18.0.0 or higher
- TypeScript 5.0 or higher (for TypeScript projects)

## CDN Usage

For quick prototyping or demos, you can use Fire Shield via CDN:

```html
<!-- Core library -->
<script type="module">
  import { RBAC } from 'https://esm.sh/@fire-shield/core'

  const rbac = new RBAC()
  // Your code here
</script>
```

::: warning
CDN usage is not recommended for production applications. Use a package manager instead.
:::

## Next Steps

- [Getting Started Guide](/guide/getting-started)
- [Framework Integration](/frameworks/vue)
