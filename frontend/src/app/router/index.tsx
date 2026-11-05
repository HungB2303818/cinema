import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout, AdminLayout, AuthLayout } from '@/shared/components/layout';
import {
  HomePage,
  MovieDetailsPage,
  CinemasPage,
  ShowtimesPage,
  SeatSelectionPage,
  CheckoutPage,
  MyTicketsPage,
  LoginPage,
  RegisterPage,
  AdminDashboardPage,
  NotFoundPage,
} from '@/pages';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public & Customer Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<HomePage />} />
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
        <Route path="/cinemas" element={<CinemasPage />} />
        <Route path="/showtimes" element={<ShowtimesPage />} />
        <Route path="/showtimes/:showtimeId/seats" element={<SeatSelectionPage />} />

        {/* Customer Protected Route - Recoverable Checkout (FE-05) */}
        <Route
          path="/bookings/:bookingId/checkout"
          element={
            <ProtectedRoute requiredRole="CUSTOMER">
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Protected Route */}
        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute>
              <MyTicketsPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
      </Route>
    </Routes>
  );
};
