import React from 'react';
import { TicketCheckinForm } from '@/features/tickets';

export const StaffCheckinPage: React.FC = () => {
  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <TicketCheckinForm />
    </div>
  );
};
