import { defineNuxtModule, addPlugin, createResolver, addImports } from '@nuxt/kit';
import type { RBAC } from '@fire-shield/core';

export interface ModuleOptions {
  /**
   * Roles configuration
   */
  roles?: Record<string, string[]>;

  /**
   * Enable audit logging
   */
  auditLogging?: boolean;

  /**
   * Enable wildcard permissions
   */
  enableWildcards?: boolean;

  /**
   * Use bit-based system
   */
  useBitSystem?: boolean;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@fire-shield/nuxt',
    configKey: 'fireShield',
    compatibility: {
      nuxt: '^3.0.0'
    }
  },
  defaults: {
    roles: {},
    auditLogging: false,
    enableWildcards: true,
    useBitSystem: true
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Add plugin
    addPlugin(resolver.resolve('./runtime/plugin'));

    // Add composables
    addImports([
      {
        name: 'useFireShield',
        from: resolver.resolve('./runtime/composables')
      },
      {
        name: 'useRBAC',
        from: resolver.resolve('./runtime/composables')
      }
    ]);

    // Add module options to runtime config
    nuxt.options.runtimeConfig.public.fireShield = options;
  }
});
