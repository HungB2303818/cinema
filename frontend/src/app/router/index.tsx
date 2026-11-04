import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/shared/components/layout';
import {
  HomePage,
  MovieDetailsPage,
  CinemasPage,
  ShowtimesPage,
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
      <Route path="/" element={<MainLayout />}>
        {/* Public Routes */}
        <Route index element={<HomePage />} />
        <Route path="movies" element={<HomePage />} />
        <Route path="movies/:id" element={<MovieDetailsPage />} />
        <Route path="cinemas" element={<CinemasPage />} />
        <Route path="showtimes" element={<ShowtimesPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Customer Protected Routes */}
        <Route
          path="my-tickets"
          element={
            <ProtectedRoute>
              <MyTicketsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Protected Routes */}
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
