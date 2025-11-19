import { defineComponent, h, type PropType, type VNode } from 'vue';
import { useCan, useRole } from './index';

/**
 * Can Component - Render if user has permission/role
 *
 * Usage:
 * <Can permission="posts:read">
 *   <button>Read Posts</button>
 * </Can>
 *
 * <Can role="admin">
 *   <div>Admin Panel</div>
 * </Can>
 *
 * With scoped slot:
 * <Can permission="posts:write" v-slot="{ allowed }">
 *   <button :disabled="!allowed">Write Post</button>
 * </Can>
 */
export const Can = defineComponent({
  name: 'Can',
  props: {
    permission: {
      type: String as PropType<string | undefined>,
      default: undefined
    },
    role: {
      type: String as PropType<string | undefined>,
      default: undefined
    }
  },
  setup(props, { slots }) {
    const hasPermission = props.permission ? useCan(props.permission) : { value: true };
    const hasRole = props.role ? useRole(props.role) : { value: true };

    return () => {
      const allowed = hasPermission.value && hasRole.value;

      // If slot provides scoped slot, pass allowed state
      if (slots.default) {
        const slotContent = slots.default({ allowed });

        // If not allowed and no scoped slot usage, don't render
        if (!allowed && !slotContent.some((vnode: VNode) =>
          vnode.props && Object.keys(vnode.props).length > 0
        )) {
          return null;
        }

        return allowed ? slotContent : null;
      }

      return null;
    };
  }
});

/**
 * Cannot Component - Render if user lacks permission/role
 *
 * Usage:
 * <Cannot permission="posts:delete">
 *   <p>You don't have permission to delete posts</p>
 * </Cannot>
 */
export const Cannot = defineComponent({
  name: 'Cannot',
  props: {
    permission: {
      type: String as PropType<string | undefined>,
      default: undefined
    },
    role: {
      type: String as PropType<string | undefined>,
      default: undefined
    }
  },
  setup(props, { slots }) {
    const hasPermission = props.permission ? useCan(props.permission) : { value: true };
    const hasRole = props.role ? useRole(props.role) : { value: true };

    return () => {
      const allowed = hasPermission.value && hasRole.value;

      if (slots.default) {
        return !allowed ? slots.default() : null;
      }

      return null;
    };
  }
});

/**
 * RequirePermission Component - Throws error if permission denied
 * Use with Vue error boundaries
 *
 * Usage:
 * <RequirePermission permission="admin:access">
 *   <AdminPanel />
 * </RequirePermission>
 */
export const RequirePermission = defineComponent({
  name: 'RequirePermission',
  props: {
    permission: {
      type: String,
      required: true
    }
  },
  setup(props, { slots }) {
    const result = useCan(props.permission);

    return () => {
      if (!result.value) {
        throw new Error(`Permission denied: ${props.permission}`);
      }

      return slots.default ? slots.default() : null;
    };
  }
});
