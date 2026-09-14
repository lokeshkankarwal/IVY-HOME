import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const link = ({ isActive }: { isActive: boolean }) =>
  `text-sm ${isActive ? "text-brass font-semibold" : "text-ink/80 hover:text-ink"}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-sand/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-serif text-2xl">
            Ivy Homes
          </Link>
          <nav className="flex flex-wrap items-center gap-4">
            <NavLink to="/properties" className={link}>
              Buy
            </NavLink>
            <NavLink to="/rentals" className={link}>
              Rent
            </NavLink>
            <NavLink to="/projects" className={link}>
              Projects
            </NavLink>
            <NavLink to="/insights" className={link}>
              Insights
            </NavLink>
            {user?.role === "CUSTOMER" && (
              <>
                <NavLink to="/customer/favourites" className={link}>
                  Saved
                </NavLink>
                <NavLink to="/customer/cart" className={link}>
                  Cart
                </NavLink>
                <NavLink to="/customer/orders" className={link}>
                  Orders
                </NavLink>
              </>
            )}
            {user?.role === "SELLER" && (
              <NavLink to="/seller/dashboard" className={link}>
                Seller
              </NavLink>
            )}
            {user?.role === "SUPERADMIN" && (
              <NavLink to="/admin/dashboard" className={link}>
                Admin
              </NavLink>
            )}
            {user ? (
              <>
                <NavLink to="/customer/profile" className={link}>
                  {user.name}
                </NavLink>
                <button
                  className="text-sm text-ink/70 hover:text-ink transition"
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={link}>
                  Login
                </NavLink>
                <NavLink to="/register" className="rounded-full bg-ink px-3 py-1 text-sm text-sand">
                  Register
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
