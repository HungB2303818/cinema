import React from 'react';
import { AdminMovieList } from '@/features/movies';

export const AdminMoviesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <AdminMovieList />
    </div>
  );
};
