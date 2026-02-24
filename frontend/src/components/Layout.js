import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  BarChart3, 
  LogOut,
  Flame,
  Menu,
  X,
  BookMarked
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/add", label: "Add Problem", icon: PlusCircle },
  { path: "/problems", label: "Problems", icon: BookOpen },
  { path: "/pattern-cheat-sheet", label: "Pattern Cheat Sheet", icon: BookMarked },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid bg-grid-fade pointer-events-none" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center glow-violet">
                <span className="font-heading font-bold text-white text-lg">D</span>
              </div>
              <span className="font-heading font-semibold text-lg text-zinc-100 hidden sm:block">
                DSA Tracker
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* User section */}
            <div className="flex items-center gap-4">
              {/* Streak */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Flame size={16} className="text-amber-400" />
                <span className="font-mono text-sm text-amber-400" data-testid="streak-count">
                  {user?.streak || 0}
                </span>
              </div>

              {/* User name */}
              <span className="text-sm text-zinc-400 hidden lg:block">
                {user?.name}
              </span>

              {/* Logout */}
              <button
                onClick={logout}
                data-testid="logout-btn"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline text-sm">Logout</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800/50 bg-zinc-900/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-violet-600/20 text-violet-400"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="relative z-10 pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
