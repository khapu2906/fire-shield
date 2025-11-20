import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { RBAC, BufferedAuditLogger, type AuditLog } from '@fire-shield/core';
import {
  RBACProvider,
  usePermission,
  useRole,
  useAuthorize,
  useAllPermissions,
  useAnyPermission,
  Can,
  Cannot,
  ProtectedRoute
} from '@fire-shield/react';

// Audit logger to track RBAC actions
const auditLogs: AuditLog[] = [];
const auditLogger = new BufferedAuditLogger(
  async (logs) => {
    auditLogs.push(...logs);
  },
  { maxBufferSize: 10, flushIntervalMs: 1000 }
);

// Initialize RBAC with audit logging
const rbac = new RBAC({ auditLogger });
rbac.createRole('admin', ['user:*', 'post:*', 'settings:*', 'analytics:*']);
rbac.createRole('editor', ['post:read', 'post:write', 'post:publish', 'analytics:read']);
rbac.createRole('viewer', ['post:read', 'analytics:read']);
rbac.createRole('moderator', ['post:read', 'post:moderate', 'user:read']);

// Mock users
const users = {
  admin: { id: 'admin-1', name: 'Admin User', roles: ['admin'] },
  editor: { id: 'editor-1', name: 'Editor User', roles: ['editor'] },
  moderator: { id: 'mod-1', name: 'Moderator', roles: ['moderator'] },
  viewer: { id: 'viewer-1', name: 'Viewer User', roles: ['viewer'] },
  guest: null,
};

type UserRole = keyof typeof users;

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const currentUser = users[currentRole];

  // Update activity logs periodically
  const updateLogs = () => {
    setActivityLogs([...auditLogs].reverse().slice(0, 20));
  };

  return (
    <BrowserRouter>
      <RBACProvider rbac={rbac} user={currentUser}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Header currentRole={currentRole} setCurrentRole={setCurrentRole} />

          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage updateLogs={updateLogs} />} />
              <Route
                path="/posts"
                element={
                  <ProtectedRoute permission="post:read" fallback={<Unauthorized />}>
                    <PostsPage updateLogs={updateLogs} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin" redirectTo="/">
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute permission="settings:write" fallback={<Unauthorized />}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity"
                element={<ActivityPage logs={activityLogs} updateLogs={updateLogs} />}
              />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </RBACProvider>
    </BrowserRouter>
  );
}

function Header({ currentRole, setCurrentRole }: { currentRole: UserRole; setCurrentRole: (role: UserRole) => void }) {
  const canManagePosts = usePermission('post:write');
  const canAccessAdmin = useRole('admin');
  const canAccessSettings = usePermission('settings:write');
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🛡️ Fire Shield
            </h1>
            <span className="hidden md:inline text-sm text-gray-500">React RBAC Example</span>
          </div>

          <div className="flex items-center gap-2">
            {(Object.keys(users) as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setCurrentRole(role)}
                className={`btn ${
                  currentRole === role
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex items-center space-x-6 pb-4 border-t pt-4 mt-2">
          <Link
            to="/"
            className={`font-medium transition-colors ${
              isActive('/') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            Home
          </Link>

          <Can permission="post:read">
            <Link
              to="/posts"
              className={`font-medium transition-colors ${
                isActive('/posts') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Posts
            </Link>
          </Can>

          {canAccessAdmin && (
            <Link
              to="/admin"
              className={`font-medium transition-colors ${
                isActive('/admin') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Admin
            </Link>
          )}

          {canAccessSettings && (
            <Link
              to="/settings"
              className={`font-medium transition-colors ${
                isActive('/settings') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Settings
            </Link>
          )}

          <Link
            to="/activity"
            className={`font-medium transition-colors ${
              isActive('/activity') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            Activity
          </Link>

          <Cannot permission="post:read">
            <span className="text-gray-400 cursor-not-allowed">Posts (No Access)</span>
          </Cannot>
        </nav>

        <div className="pb-4 flex items-center justify-between bg-gray-50 -mx-4 px-4 py-3 mt-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                {currentRole === 'guest' ? '?' : currentRole[0].toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {currentRole === 'guest' ? 'Guest' : users[currentRole]?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {currentRole === 'guest' ? 'Not logged in' : users[currentRole]?.id}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`badge ${canManagePosts ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {canManagePosts ? '✓' : '×'} Write Posts
            </span>
            <span className={`badge ${canAccessAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
              {canAccessAdmin ? '✓' : '×'} Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function HomePage({ updateLogs }: { updateLogs: () => void }) {
  const isEditor = useRole('editor');
  const isAdmin = useRole('admin');
  const isModerator = useRole('moderator');
  const postWrite = useAuthorize('post:write');
  const hasMultiplePerms = useAllPermissions(['post:read', 'post:write']);
  const hasAnyPerm = useAnyPermission(['post:read', 'analytics:read']);

  useState(() => {
    const interval = setInterval(updateLogs, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-3xl font-bold mb-4">Welcome to Fire Shield React Example</h2>
        <p className="text-gray-600 mb-6">
          This example demonstrates advanced role-based access control with @fire-shield/react
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="font-semibold text-blue-900 mb-1">RBACProvider</div>
            <div className="text-sm text-blue-700">Context provider for RBAC</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="font-semibold text-green-900 mb-1">usePermission()</div>
            <div className="text-sm text-green-700">Check single permission</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="font-semibold text-purple-900 mb-1">useRole()</div>
            <div className="text-sm text-purple-700">Check user role</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="font-semibold text-orange-900 mb-1">useAuthorize()</div>
            <div className="text-sm text-orange-700">Get detailed authorization</div>
          </div>
          <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
            <div className="font-semibold text-pink-900 mb-1">&lt;Can&gt; / &lt;Cannot&gt;</div>
            <div className="text-sm text-pink-700">Conditional rendering</div>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="font-semibold text-indigo-900 mb-1">&lt;ProtectedRoute&gt;</div>
            <div className="text-sm text-indigo-700">Route protection</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Permission Checks</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Write Posts</span>
              <span className={`badge ${postWrite.allowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {postWrite.allowed ? '✓ Allowed' : '× Denied'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">All: Read & Write</span>
              <span className={`badge ${hasMultiplePerms ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {hasMultiplePerms ? '✓ Has All' : '× Missing Some'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Any: Read or Analytics</span>
              <span className={`badge ${hasAnyPerm ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {hasAnyPerm ? '✓ Has Any' : '× Has None'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-4">Role Information</h3>
          <div className="space-y-3">
            {isAdmin && (
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">👑</span>
                  <span className="font-bold">Administrator</span>
                </div>
                <p className="text-sm opacity-90">Full system access with all permissions</p>
              </div>
            )}
            {isEditor && !isAdmin && (
              <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✏️</span>
                  <span className="font-bold">Editor</span>
                </div>
                <p className="text-sm opacity-90">Can create, edit, and publish posts</p>
              </div>
            )}
            {isModerator && (
              <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🛡️</span>
                  <span className="font-bold">Moderator</span>
                </div>
                <p className="text-sm opacity-90">Can moderate posts and view users</p>
              </div>
            )}
            <Cannot permission="post:write">
              <div className="p-4 bg-gray-100 text-gray-700 rounded-lg">
                <p className="text-sm">
                  💡 Switch to <strong>editor</strong> or <strong>admin</strong> role to create posts
                </p>
              </div>
            </Cannot>
          </div>
        </div>
      </div>

      {!postWrite.allowed && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Limited Access</h4>
              <p className="text-sm text-amber-700">
                <strong>Reason:</strong> {postWrite.reason}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostsPage({ updateLogs }: { updateLogs: () => void }) {
  const canWrite = usePermission('post:write');
  const canPublish = usePermission('post:publish');
  const canDelete = usePermission('post:delete');
  const canModerate = usePermission('post:moderate');
  const [posts, setPosts] = useState([
    { id: 1, title: 'Getting Started with RBAC', status: 'published', author: 'admin' },
    { id: 2, title: 'Advanced Permission Patterns', status: 'draft', author: 'editor' },
    { id: 3, title: 'Security Best Practices', status: 'published', author: 'admin' },
  ]);

  useState(() => {
    const interval = setInterval(updateLogs, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Posts Management</h2>
          <Can permission="post:write">
            <button className="btn btn-success">
              ➕ Create Post
            </button>
          </Can>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`badge ${canWrite ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
            {canWrite ? '✓' : '×'} Write
          </span>
          <span className={`badge ${canPublish ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
            {canPublish ? '✓' : '×'} Publish
          </span>
          <span className={`badge ${canDelete ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}`}>
            {canDelete ? '✓' : '×'} Delete
          </span>
          <span className={`badge ${canModerate ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'}`}>
            {canModerate ? '✓' : '×'} Moderate
          </span>
        </div>

        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                  <p className="text-sm text-gray-600">By {post.author}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {post.status}
                  </span>
                  <Can permission="post:write">
                    <button className="btn btn-secondary text-sm">✏️ Edit</button>
                  </Can>
                  {canPublish && post.status === 'draft' && (
                    <button className="btn btn-primary text-sm">🚀 Publish</button>
                  )}
                  {canDelete && (
                    <button className="btn btn-danger text-sm">🗑️</button>
                  )}
                  {canModerate && (
                    <button className="btn btn-secondary text-sm">🛡️ Moderate</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Cannot permission="post:write">
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              ℹ️ You can only view posts. Switch to <strong>editor</strong> or <strong>admin</strong> role to manage posts.
            </p>
          </div>
        </Cannot>
      </div>
    </div>
  );
}

function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
        <p className="text-gray-600 mb-8">Welcome to the admin panel. Only administrators can access this page.</p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="text-sm opacity-90 mb-2">Total Users</div>
            <div className="text-4xl font-bold mb-1">156</div>
            <div className="text-sm opacity-75">+12 this week</div>
          </div>
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="text-sm opacity-90 mb-2">Total Posts</div>
            <div className="text-4xl font-bold mb-1">432</div>
            <div className="text-sm opacity-75">+28 this week</div>
          </div>
          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="text-sm opacity-90 mb-2">System Health</div>
            <div className="text-4xl font-bold mb-1">98%</div>
            <div className="text-sm opacity-75">All systems operational</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-2">Notification Preferences</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm">Email notifications</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Push notifications</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-2">Security</label>
            <button className="btn btn-primary">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityPage({ logs, updateLogs }: { logs: AuditLog[]; updateLogs: () => void }) {
  useState(() => {
    updateLogs();
    const interval = setInterval(updateLogs, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Activity Log</h2>
        <p className="text-gray-600 mb-6">Real-time audit trail of RBAC permission checks</p>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-4 block">📋</span>
            <p>No activity yet. Navigate around to see permission checks.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${log.allowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {log.allowed ? '✓ Allowed' : '× Denied'}
                    </span>
                    <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {log.permission}
                    </span>
                    <span className="text-gray-600">
                      User: {log.user?.id || 'guest'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {!log.allowed && log.reason && (
                  <div className="mt-2 text-xs text-gray-600 pl-3 border-l-2 border-gray-300">
                    Reason: {log.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="card text-center py-12">
      <div className="text-6xl mb-4">🚫</div>
      <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
      <Link to="/" className="btn btn-primary">
        ← Go back to home
      </Link>
    </div>
  );
}

export default App;
