import { Link } from "react-router-dom";
import { FileQuestion, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
        <FileQuestion className="h-10 w-10 text-gray-400" />
      </div>

      <h1 className="mt-6 text-6xl font-extrabold tracking-tight text-gray-900">404</h1>
      <p className="mt-3 text-xl font-semibold text-gray-700">Page not found</p>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        The page you are looking for does not exist or may have been moved.
      </p>

      <Link
        to="/"
        className="mt-8 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90"
      >
        <Home className="h-4 w-4" />
        Go to Dashboard
      </Link>
    </div>
  );
}
