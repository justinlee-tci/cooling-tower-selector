"use client";

import { useAuth } from "./authContext"; // Import the authentication context
import { useRouter } from "next/navigation"; // Using next/navigation for client-side routing

// This higher-order component (HOC) will protect the routes
const withProtectedRoute = (WrappedComponent) => {
  // Add display name to the component
  const ComponentWithAuth = (props) => {
    const { user } = useAuth(); // Get the user from the context
    const router = useRouter(); // Router to redirect
    
    // If the user is not logged in, redirect to the login page
    if (!user) {
      router.push("/login");
      return null;
    }
    
    // If the user is logged in, render the wrapped component
    return <WrappedComponent {...props} />;
  };
  
  // Set the display name
  ComponentWithAuth.displayName = `withProtectedRoute(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;
  
  return ComponentWithAuth;
};

export default withProtectedRoute;