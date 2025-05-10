import { createContext, ReactNode, useContext, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { UserPreferences } from '@shared/schema';

type UserPreferencesContextType = {
  preferences: UserPreferences | null;
  isLoading: boolean;
  updatePreferences: (data: Partial<UserPreferences>) => void;
  setShowTimeOfDayDividers: (show: boolean) => void;
  setShowSimplifiedTasks: (show: boolean) => void;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch user preferences
  const { 
    data: preferences, 
    isLoading,
  } = useQuery({
    queryKey: ['/api/user/preferences'],
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const res = await apiRequest('PATCH', '/api/user/preferences', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update preferences',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Convenience methods for common preference updates
  const updatePreferences = (data: Partial<UserPreferences>) => {
    updatePreferencesMutation.mutate(data);
  };

  const setShowTimeOfDayDividers = (show: boolean) => {
    updatePreferencesMutation.mutate({ showTimeOfDayDividers: show });
  };

  const setShowSimplifiedTasks = (show: boolean) => {
    updatePreferencesMutation.mutate({ showSimplifiedTasks: show });
  };

  // Context value
  const value: UserPreferencesContextType = {
    preferences: preferences as UserPreferences | null,
    isLoading,
    updatePreferences,
    setShowTimeOfDayDividers,
    setShowSimplifiedTasks,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
}