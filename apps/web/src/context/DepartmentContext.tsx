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

export interface SubDepartment {
  id: string;
  name: string;
  departmentId: string;
  category?: string;
  fullTime?: string;
  interns?: string;
  createdAt?: string;
}

interface DepartmentContextType {
  departments: Department[];
  subDepartments: SubDepartment[];
  loading: boolean;
  addDepartment: (dept: Omit<Department, 'id'>) => Promise<Department>;
  updateDepartment: (id: string, updates: Partial<Omit<Department, 'id'>>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  getDepartmentByName: (name: string) => Department | undefined;
  refreshDepartments: () => Promise<void>;
  addSubDepartment: (sub: Omit<SubDepartment, 'id'>) => Promise<SubDepartment>;
  updateSubDepartment: (id: string, updates: Partial<Omit<SubDepartment, 'id'>>) => Promise<void>;
  deleteSubDepartment: (id: string) => Promise<void>;
  refreshSubDepartments: () => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, api, accessToken } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshDepartments = async () => {
    if (!user || !accessToken) {
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

  const refreshSubDepartments = async () => {
    if (!user || !accessToken) {
      setSubDepartments([]);
      return;
    }
    try {
      const res = await api.get('/sub-departments');
      setSubDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch sub-departments from database:', err);
    }
  };

  // Re-fetch when user logs in or API instance changes
  useEffect(() => {
    refreshDepartments();
    refreshSubDepartments();
  }, [user, api, accessToken]);

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

  const addSubDepartment = async (subData: Omit<SubDepartment, 'id'>): Promise<SubDepartment> => {
    const res = await api.post('/sub-departments', subData);
    const newSub = res.data;
    setSubDepartments((prev) => [...prev, newSub]);
    return newSub;
  };

  const updateSubDepartment = async (id: string, updates: Partial<Omit<SubDepartment, 'id'>>) => {
    const res = await api.patch(`/sub-departments/${id}`, updates);
    const updatedSub = res.data;
    setSubDepartments((prev) =>
      prev.map((s) => (s.id === id ? updatedSub : s))
    );
  };

  const deleteSubDepartment = async (id: string) => {
    await api.delete(`/sub-departments/${id}`);
    setSubDepartments((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <DepartmentContext.Provider
      value={{
        departments,
        subDepartments,
        loading,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        getDepartmentByName,
        refreshDepartments,
        addSubDepartment,
        updateSubDepartment,
        deleteSubDepartment,
        refreshSubDepartments,
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
