import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/providers", label: "Providers" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/reports", label: "Reports" },
];

export default function AdminLayout() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-md transform transition-transform duration-200 md:translate-x-0 md:static md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        <div className="p-4 text-xl font-semibold border-b flex items-center justify-between">
          <span>HelpX Admin</span>
          <button
            className="md:hidden text-gray-500 text-xl"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white shadow px-4 py-3 min-h-[56px]">
          <button
            className="md:hidden text-2xl text-gray-700"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <div className="flex-1" />
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 h-10"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="p-3 sm:p-4 flex-1 w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

