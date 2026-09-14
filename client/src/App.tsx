import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// Public pages
import HomePage from "./pages/public/HomePage";
import PropertiesPage from "./pages/public/PropertiesPage";
import PropertyDetailPage from "./pages/public/PropertyDetailPage";
import RentalsPage from "./pages/public/RentalsPage";
import RentalDetailPage from "./pages/public/RentalDetailPage";
import ProjectsPage from "./pages/public/ProjectsPage";
import ProjectDetailPage from "./pages/public/ProjectDetailPage";
import InsightsPage from "./pages/public/InsightsPage";
import LoginPage from "./pages/public/LoginPage";
import RegisterPage from "./pages/public/RegisterPage";

// Customer pages
import FavouritesPage from "./pages/customer/FavouritesPage";
import CartPage from "./pages/customer/CartPage";
import OrdersPage from "./pages/customer/OrdersPage";
import ProfilePage from "./pages/customer/ProfilePage";

// Seller pages
import SellerDashboardPage from "./pages/seller/SellerDashboardPage";
import SellerPropertiesPage from "./pages/seller/SellerPropertiesPage";
import SellerClientsPage from "./pages/seller/SellerClientsPage";

// Admin pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminSellersPage from "./pages/admin/AdminSellersPage";
import AdminPropertiesPage from "./pages/admin/AdminPropertiesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
        <Route path="rentals" element={<RentalsPage />} />
        <Route path="rentals/:id" element={<RentalDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Customer area */}
        <Route path="customer/favourites" element={<FavouritesPage />} />
        <Route path="customer/cart" element={<CartPage />} />
        <Route path="customer/orders" element={<OrdersPage />} />
        <Route path="customer/profile" element={<ProfilePage />} />

        {/* Seller area */}
        <Route path="seller/dashboard" element={<SellerDashboardPage />} />
        <Route path="seller/properties" element={<SellerPropertiesPage />} />
        <Route path="seller/clients" element={<SellerClientsPage />} />

        {/* Admin area */}
        <Route path="admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="admin/sellers" element={<AdminSellersPage />} />
        <Route path="admin/properties" element={<AdminPropertiesPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="admin/audit" element={<AdminAuditPage />} />
        <Route path="admin/orders" element={<OrdersPage />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
