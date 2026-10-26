import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FarmerDashboard from '../components/FarmerDashboard';
import BuyerDashboard from '../components/BuyerDashboard';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin users are directed to the Admin Governance Portal
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Buyer Dashboard
  if (user.role === 'buyer') {
    return <BuyerDashboard />;
  }

  // Farmer Dashboard (default for 'farmer' role)
  return <FarmerDashboard />;
}
