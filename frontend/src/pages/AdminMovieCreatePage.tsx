import React from 'react';
import { AdminMovieForm } from '@/features/movies';

export const AdminMovieCreatePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <AdminMovieForm isEditing={false} />
    </div>
  );
};
