import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Services from "./pages/Services";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MatchProviders from "./pages/MatchProviders";
import CreateBooking from "./pages/CreateBooking";
import UserBookings from "./pages/UserBookings";
import ProviderBookings from "./pages/ProviderBookings";
import BookingDetail from "./pages/BookingDetail";
import ServiceDetail from "./pages/ServiceDetail";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Optional router export (not currently used by main.jsx)
export const router = createBrowserRouter([
  { path: "/", element: <Services /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/match",
    element: (
      <ProtectedRoute allowedRoles={["customer", "user", "provider", "admin"]}>
        <MatchProviders />
      </ProtectedRoute>
    ),
  },
  {
    path: "/book",
    element: (
      <ProtectedRoute allowedRoles={["customer", "user", "provider", "admin"]}>
        <CreateBooking />
      </ProtectedRoute>
    ),
  },
  {
    path: "/bookings",
    element: (
      <ProtectedRoute allowedRoles={["customer", "user", "provider", "admin"]}>
        <UserBookings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/provider/bookings",
    element: (
      <ProtectedRoute allowedRoles={["provider"]}>
        <ProviderBookings />
      </ProtectedRoute>
    ),
  },
  { path: "/booking/:bookingId", element: <BookingDetail /> },
  { path: "/bookings/:bookingId", element: <BookingDetail /> },
  { path: "/service/:id", element: <ServiceDetail /> },
]);

