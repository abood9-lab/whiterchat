import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { MobileNavigator } from "./navigation/MobileNavigator";

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MobileNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
};
