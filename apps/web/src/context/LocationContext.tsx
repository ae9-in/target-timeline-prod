import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface Location {
  id: string;
  name: string;
  status: string; // "ACTIVE" | "INACTIVE"
  address?: string;
  timezone?: string;
  createdAt?: string;
  _count?: { targets: number };
}

interface LocationContextType {
  locations: Location[];         // ACTIVE locations — for dropdowns
  allLocations: Location[];      // ALL locations (incl. inactive) — admin only
  loading: boolean;
  refetch: () => void;
  // Admin operations (fail silently for non-admins — UI hides them anyway)
  createLocation: (data: { name: string; address?: string; timezone?: string }) => Promise<Location>;
  updateLocation: (id: string, data: { name?: string; address?: string; timezone?: string }) => Promise<Location>;
  setLocationStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => Promise<Location>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { api, user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  const isAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchLocations = async () => {
      setLoading(true);
      try {
        // All users get active locations for dropdowns
        const activeRes = await api.get<Location[]>('/locations');
        if (!cancelled) setLocations(activeRes.data);

        // Admins additionally get the full list (for management page)
        if (isAdmin) {
          const allRes = await api.get<Location[]>('/locations/all');
          if (!cancelled) setAllLocations(allRes.data);
        } else {
          if (!cancelled) setAllLocations(activeRes.data);
        }
      } catch (err) {
        console.error('Failed to load locations:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLocations();
    return () => { cancelled = true; };
  }, [api, user, isAdmin, tick]);

  const createLocation = async (data: { name: string; address?: string; timezone?: string }) => {
    const res = await api.post<Location>('/locations', data);
    refetch();
    return res.data;
  };

  const updateLocation = async (id: string, data: { name?: string; address?: string; timezone?: string }) => {
    const res = await api.patch<Location>(`/locations/${id}`, data);
    refetch();
    return res.data;
  };

  const setLocationStatus = async (id: string, status: 'ACTIVE' | 'INACTIVE') => {
    const res = await api.patch<Location>(`/locations/${id}/status`, { status });
    refetch();
    return res.data;
  };

  return (
    <LocationContext.Provider value={{ locations, allLocations, loading, refetch, createLocation, updateLocation, setLocationStatus }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocations = (): LocationContextType => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocations must be used within a LocationProvider');
  return ctx;
};
