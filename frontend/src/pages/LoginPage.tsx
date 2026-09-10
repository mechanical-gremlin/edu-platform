import type { User } from '../types/models'

interface LoginPageProps {
  users: User[]
  onLogin: (user: User) => void
}

export const LoginPage = ({ users, onLogin }: LoginPageProps) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-white p-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Welcome to Edu Platform</h1>
      <p className="mt-2 text-sm text-slate-600">Login to access your courses, assignments, and progress.</p>
      <button className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
        Continue with Google (placeholder)
      </button>
      <div className="mt-6 space-y-2">
        {users.map((user) => (
          <button
            key={user.id}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            onClick={() => onLogin(user)}
          >
            Demo login as {user.role}: {user.name}
          </button>
        ))}
      </div>
    </div>
  </div>
)
