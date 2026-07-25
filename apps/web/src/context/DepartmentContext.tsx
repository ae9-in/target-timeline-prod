import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
  lead?: string;
  description?: string;
  isSystem?: boolean;
  locationId?: string;
  locationName?: string;
}

interface DepartmentContextType {
  departments: Department[];
  loading: boolean;
  addDepartment: (dept: Omit<Department, 'id'>) => Promise<Department>;
  updateDepartment: (id: string, updates: Partial<Omit<Department, 'id'>>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  getDepartmentByName: (name: string) => Department | undefined;
  refreshDepartments: () => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, api } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshDepartments = async () => {
    if (!user) {
      setDepartments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments from database:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when user logs in or API instance changes
  useEffect(() => {
    refreshDepartments();
  }, [user, api]);

  const addDepartment = async (deptData: Omit<Department, 'id'>): Promise<Department> => {
    const res = await api.post('/departments', deptData);
    const newDept = res.data;
    setDepartments((prev) => [...prev, newDept]);
    return newDept;
  };

  const updateDepartment = async (id: string, updates: Partial<Omit<Department, 'id'>>) => {
    const res = await api.patch(`/departments/${id}`, updates);
    const updatedDept = res.data;
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? updatedDept : d))
    );
  };

  const deleteDepartment = async (id: string) => {
    await api.delete(`/departments/${id}`);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  const getDepartmentByName = (name: string) => {
    if (!name) return undefined;
    return departments.find(
      (d) => d.name.toLowerCase() === name.toLowerCase() || d.id === name
    );
  };

  return (
    <DepartmentContext.Provider
      value={{
        departments,
        loading,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        getDepartmentByName,
        refreshDepartments,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartments = (): DepartmentContextType => {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error('useDepartments must be used within a DepartmentProvider');
  }
  return context;
};
