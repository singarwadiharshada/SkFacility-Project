import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import managerService, { Manager } from '@/services/managerService';

interface AuthContextType {
  currentUser: Manager | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: Manager) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Manager | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        
        // Try to get user data from localStorage
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (userData && token) {
          try {
            const user = JSON.parse(userData);
            
            // Check if this is a manager user
            if (user.email) {
              // Try to find this user in managers database
              const managersResponse = await managerService.getAllManagers({ limit: 100, page: 1 });
              const managers = managersResponse.data || [];
              
              const foundManager = managers.find(m => 
                m.email.toLowerCase() === user.email.toLowerCase()
              );
              
              if (foundManager) {
                console.log("✅ Found manager from database:", foundManager);
                setCurrentUser(foundManager);
                localStorage.setItem('managerId', foundManager._id);
                localStorage.setItem('managerEmail', foundManager.email);
                return;
              }
              
              // If not found in database but has manager role
              if (user.role === 'manager' || user.role === 'admin') {
                const managerFromUser: Manager = {
                  _id: user._id || user.id,
                  name: user.name || 'Manager',
                  email: user.email,
                  phone: user.phone || '',
                  site: user.site || 'Mumbai Office',
                  department: user.department || 'Operations',
                  isActive: true,
                  status: 'active',
                  employees: 0,
                  tasks: 0
                };
                console.log("✅ Using manager from auth data:", managerFromUser);
                setCurrentUser(managerFromUser);
                localStorage.setItem('managerId', managerFromUser._id);
                localStorage.setItem('managerEmail', managerFromUser.email);
                return;
              }
            }
          } catch (error) {
            console.error("Error parsing user data:", error);
          }
        }
        
        // If no user found, try to use stored manager
        const storedManagerId = localStorage.getItem('managerId');
        if (storedManagerId) {
          try {
            const response = await managerService.getManagerById(storedManagerId);
            if (response.success && response.data) {
              console.log("✅ Using stored manager:", response.data);
              setCurrentUser(response.data);
              return;
            }
          } catch (error) {
            console.log("Stored manager not found");
          }
        }
        
        console.log("⚠️ No user logged in");
        setCurrentUser(null);
        
      } catch (error) {
        console.error("Error loading user:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const login = (user: Manager) => {
    setCurrentUser(user);
    localStorage.setItem('managerId', user._id);
    localStorage.setItem('managerEmail', user.email);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('managerId');
    localStorage.removeItem('managerEmail');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const refreshUser = async () => {
    if (currentUser?._id) {
      try {
        const response = await managerService.getManagerById(currentUser._id);
        if (response.success && response.data) {
          setCurrentUser(response.data);
        }
      } catch (error) {
        console.error("Error refreshing user:", error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};