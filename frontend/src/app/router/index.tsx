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
  BookingDetailPage,
  BookingSuccessPage,
  MyTicketsPage,
  StaffCheckinPage,
  LoginPage,
  RegisterPage,
  AdminDashboardPage,
  AdminMoviesPage,
  AdminMovieCreatePage,
  AdminMovieEditPage,
  AdminRoomsPage,
  AdminSeatsPage,
  AdminShowtimesPage,
  AdminShowtimeFormPage,
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

        {/* Customer Protected Route - Booking Success & Issued Tickets (FE-06) */}
        <Route
          path="/bookings/:bookingId/success"
          element={
            <ProtectedRoute requiredRole="CUSTOMER">
              <BookingSuccessPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Protected Route - Booking Detail & Actions (FE-07) */}
        <Route
          path="/bookings/:bookingId"
          element={
            <ProtectedRoute requiredRole="CUSTOMER">
              <BookingDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Protected Route */}
        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute requiredRole="CUSTOMER">
              <MyTicketsPage />
            </ProtectedRoute>
          }
        />

        {/* Staff & Admin Ticket Check-in Route (FE-08) */}
        <Route
          path="/staff/check-in"
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
              <StaffCheckinPage />
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
        <Route path="movies" element={<AdminMoviesPage />} />
        <Route path="movies/new" element={<AdminMovieCreatePage />} />
        <Route path="movies/:movieId/edit" element={<AdminMovieEditPage />} />
        <Route path="rooms" element={<AdminRoomsPage />} />
        <Route path="rooms/:roomId/seats" element={<AdminSeatsPage />} />
        <Route path="showtimes" element={<AdminShowtimesPage />} />
        <Route path="showtimes/new" element={<AdminShowtimeFormPage />} />
        <Route path="showtimes/:showtimeId/edit" element={<AdminShowtimeFormPage />} />
      </Route>
    </Routes>
  );
};
