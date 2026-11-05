import { Navigate } from 'react-router-dom';
import React from 'react';

interface PrivateRouteProps {
    children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
