import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
  lead?: string;
  description?: string;
  isSystem?: boolean;
}

interface DepartmentContextType {
  departments: Department[];
  addDepartment: (dept: Omit<Department, 'id'>) => Department;
  updateDepartment: (id: string, updates: Partial<Omit<Department, 'id'>>) => void;
  deleteDepartment: (id: string) => void;
  getDepartmentByName: (name: string) => Department | undefined;
}

const DEFAULT_DEPARTMENTS: Department[] = [];

// Bump version whenever a clean slate is needed (removes stale/dummy data from old keys)
const STORAGE_KEY = 'targettrack_departments_v3';
const STALE_KEYS = ['targettrack_departments', 'targettrack_departments_v1', 'targettrack_departments_v2'];

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>(() => {
    // Clean up any stale keys from previous versions
    STALE_KEYS.forEach((key) => {
      try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
    });

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse stored departments:', e);
    }
    return DEFAULT_DEPARTMENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(departments));
    } catch (e) {
      console.error('Failed to persist departments to localStorage:', e);
    }
  }, [departments]);

  const addDepartment = (deptData: Omit<Department, 'id'>): Department => {
    const newDept: Department = {
      ...deptData,
      id: `dept-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    setDepartments((prev) => [...prev, newDept]);
    return newDept;
  };

  const updateDepartment = (id: string, updates: Partial<Omit<Department, 'id'>>) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const deleteDepartment = (id: string) => {
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
        addDepartment,
        updateDepartment,
        deleteDepartment,
        getDepartmentByName,
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
