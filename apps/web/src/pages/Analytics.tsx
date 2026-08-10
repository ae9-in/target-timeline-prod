import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocations } from '../context/LocationContext';
import { useDepartments } from '../context/DepartmentContext';
import ReactECharts from 'echarts-for-react';
import {
  MapPin, BarChart3, ChevronDown, ChevronRight, User,
  Building2, Target, Award, AlertCircle, Briefcase, ListFilter,
  CheckCircle, ShieldAlert, TrendingUp, Filter, Sparkles, Trophy
} from 'lucide-react';

type AnalysisTab = 'location' | 'department' | 'employee';

interface PerformanceStat {
  name: string;
  id: string;
  total: number;
  green: number;
  amber: number;
  red: number;
  avg: number;
  gapCount: number;
  targets: any[];
  note: {
    status: 'excellent' | 'good' | 'warning' | 'critical' | 'idle';
    text: string;
  };
}

export const Analytics: React.FC = () => {
  const { api } = useAuth();
  const { locations, loading: locLoading } = useLocations();
  const { departments, subDepartments } = useDepartments();
  const [targets, setTargets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab and Cascading filter states
  const [activeTab, setActiveTab] = useState<AnalysisTab>('location');
  const [selectedLocId, setSelectedLocId] = useState<string>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');

  // Collapsible list detail state
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Reset cascading filters when changing the primary analysis dimension tab
  useEffect(() => {
    setSelectedLocId('all');
    setSelectedDeptId('all');
    setSelectedEmpId('all');
    setExpandedRows({});
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [targetsRes, employeesRes] = await Promise.all([
          api.get('/targets'),
          api.get('/employees'),
        ]);
        setTargets(targetsRes.data);
        setEmployees(employeesRes.data);
      } catch (err) {
        console.error('Error fetching analytics data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api]);

  // Helper for generating dynamic performance evaluation summaries
  const getPerformanceNote = (
    type: AnalysisTab,
    stats: { total: number; green: number; amber: number; red: number; avg: number; gapCount: number }
  ) => {
    if (stats.total === 0) {
      if (type === 'employee') return { status: 'idle' as const, text: 'Unassigned. Employee is available for new target allocations.' };
      return { status: 'idle' as const, text: 'No active targets are assigned to this entity.' };
    }

    if (stats.red > 0) {
      return {
        status: 'critical' as const,
        text: `Urgent review required. Out of ${stats.total} targets, ${stats.red} are Off Track (Red). Average completion is at ${stats.avg}%. Gaps identified on ${stats.gapCount} metrics.`
      };
    }

    if (stats.amber > 0) {
      return {
        status: 'warning' as const,
        text: `At Risk. Contains ${stats.amber} target(s) showing signs of delays (Amber). Monitor progress closely to prevent slippage.`
      };
    }

    if (stats.avg >= 85) {
      return {
        status: 'excellent' as const,
        text: `Exceptional performance. Mapped objectives are on track with a high average completion of ${stats.avg}%. Gaps are fully closed.`
      };
    }

    return {
      status: 'good' as const,
      text: `On track. Standard progression with average completion at ${stats.avg}%. Target execution matches expectation.`
    };
  };

  // 1. LOCATION-WISE DATA COMPILATION
  const locationStatsList = useMemo<PerformanceStat[]>(() => {
    const stats: PerformanceStat[] = locations.map(loc => {
      const locTargets = targets.filter(t => t.locationId === loc.id);
      const total = locTargets.length;
      const green = locTargets.filter(t => t.ragStatus === 'GREEN').length;
      const amber = locTargets.filter(t => t.ragStatus === 'AMBER').length;
      const red = locTargets.filter(t => t.ragStatus === 'RED').length;
      const avg = total > 0 ? Math.min(100, Math.round((locTargets.reduce((sum, t) => sum + (t.actualProgress || 0), 0) / total) * 100)) : 0;
      const gapCount = locTargets.filter(t => t.gap > 0).length;

      const baseStats = { total, green, amber, red, avg, gapCount };
      return {
        id: loc.id,
        name: loc.name,
        ...baseStats,
        targets: locTargets,
        note: getPerformanceNote('location', baseStats),
      };
    });

    const unassignedTargets = targets.filter(t => !t.locationId);
    if (unassignedTargets.length > 0) {
      const total = unassignedTargets.length;
      const green = unassignedTargets.filter(t => t.ragStatus === 'GREEN').length;
      const amber = unassignedTargets.filter(t => t.ragStatus === 'AMBER').length;
      const red = unassignedTargets.filter(t => t.ragStatus === 'RED').length;
      const avg = total > 0 ? Math.min(100, Math.round((unassignedTargets.reduce((sum, t) => sum + (t.actualProgress || 0), 0) / total) * 100)) : 0;
      const gapCount = unassignedTargets.filter(t => t.gap > 0).length;

      const baseStats = { total, green, amber, red, avg, gapCount };
      stats.push({
        id: 'unassigned',
        name: 'Unassigned Location',
        ...baseStats,
        targets: unassignedTargets,
        note: getPerformanceNote('location', baseStats),
      });
    }

    return stats;
  }, [locations, targets]);

  const departmentStatsList = useMemo<PerformanceStat[]>(() => {
    return departments.map(dept => {
      const deptTargets = targets.filter(t => t.vertical === dept.name);
      const total = deptTargets.length;
      const green = deptTargets.filter(t => t.ragStatus === 'GREEN').length;
      const amber = deptTargets.filter(t => t.ragStatus === 'AMBER').length;
      const red = deptTargets.filter(t => t.ragStatus === 'RED').length;
      const avg = total > 0 ? Math.min(100, Math.round((deptTargets.reduce((sum, t) => sum + (t.actualProgress || 0), 0) / total) * 100)) : 0;
      const gapCount = deptTargets.filter(t => t.gap > 0).length;

      const baseStats = { total, green, amber, red, avg, gapCount };
      return {
        id: dept.id,
        name: dept.name,
        ...baseStats,
        targets: deptTargets,
        note: getPerformanceNote('department', baseStats),
      };
    });
  }, [departments, targets]);

  const employeeStatsList = useMemo<PerformanceStat[]>(() => {
    const compiledMap: Record<string, PerformanceStat> = {};

    employees.forEach(emp => {
      compiledMap[emp.name.toLowerCase()] = {
        id: emp.id,
        name: emp.name,
        total: 0,
        green: 0,
        amber: 0,
        red: 0,
        avg: 0,
        gapCount: 0,
        targets: [],
        note: { status: 'idle', text: 'Unassigned. Employee is available for target allocation.' },
      };
    });

    targets.forEach(t => {
      const ownerKey = t.owner.toLowerCase();
      if (!compiledMap[ownerKey]) {
        compiledMap[ownerKey] = {
          id: `dynamic-${t.owner}`,
          name: t.owner,
          total: 0,
          green: 0,
          amber: 0,
          red: 0,
          avg: 0,
          gapCount: 0,
          targets: [],
          note: { status: 'idle', text: '' },
        };
      }
      compiledMap[ownerKey].targets.push(t);
    });

    return Object.values(compiledMap).map(emp => {
      const total = emp.targets.length;
      const green = emp.targets.filter(t => t.ragStatus === 'GREEN').length;
      const amber = emp.targets.filter(t => t.ragStatus === 'AMBER').length;
      const red = emp.targets.filter(t => t.ragStatus === 'RED').length;
      const avg = total > 0 ? Math.min(100, Math.round((emp.targets.reduce((sum, t) => sum + (t.actualProgress || 0), 0) / total) * 100)) : 0;
      const gapCount = emp.targets.filter(t => t.gap > 0).length;

      const baseStats = { total, green, amber, red, avg, gapCount };
      return {
        ...emp,
        ...baseStats,
        note: getPerformanceNote('employee', baseStats),
      };
    }).sort((a, b) => b.avg - a.avg);
  }, [employees, targets]);

  // Translate filter IDs to names/entities
  const selectedLocName = useMemo(() => {
    if (selectedLocId === 'all') return '';
    if (selectedLocId === 'unassigned') return 'Unassigned';
    return locations.find(l => l.id === selectedLocId)?.name || '';
  }, [selectedLocId, locations]);

  const selectedDeptName = useMemo(() => {
    if (selectedDeptId === 'all') return '';
    return departments.find(d => d.id === selectedDeptId)?.name || '';
  }, [selectedDeptId, departments]);

  const selectedEmpName = useMemo(() => {
    if (selectedEmpId === 'all') return '';
    if (selectedEmpId.startsWith('dynamic-')) return selectedEmpId.replace('dynamic-', '');
    return employees.find(e => e.id === selectedEmpId)?.name || '';
  }, [selectedEmpId, employees]);

  // CASCADING OPTION FILTERING DYNAMIC SELECTIONS
  const filteredLocOptions = useMemo(() => {
    if (activeTab !== 'location') {
      if (activeTab === 'department' && selectedDeptName) {
        const targetLocs = targets.filter(t => t.vertical === selectedDeptName).map(t => t.locationId);
        return locations.filter(l => targetLocs.includes(l.id));
      }
      if (activeTab === 'employee' && selectedEmpName) {
        const targetLocs = targets.filter(t => t.owner === selectedEmpName).map(t => t.locationId);
        return locations.filter(l => targetLocs.includes(l.id));
      }
    }
    return locations;
  }, [activeTab, selectedDeptName, selectedEmpName, locations, targets]);

  const filteredDeptOptions = useMemo(() => {
    if (activeTab !== 'department') {
      if (activeTab === 'location' && selectedLocId) {
        const targetDepts = targets.filter(t => t.locationId === (selectedLocId === 'unassigned' ? null : selectedLocId)).map(t => t.vertical);
        return departments.filter(d => targetDepts.includes(d.name));
      }
      if (activeTab === 'employee' && selectedEmpName) {
        const targetDepts = targets.filter(t => t.owner === selectedEmpName).map(t => t.vertical);
        return departments.filter(d => targetDepts.includes(d.name));
      }
    }
    return departments;
  }, [activeTab, selectedLocId, selectedEmpName, departments, targets]);

  const filteredEmpOptions = useMemo(() => {
    if (activeTab !== 'employee') {
      let filteredTargets = targets;
      if (activeTab === 'location') {
        if (selectedLocId) {
          filteredTargets = filteredTargets.filter(t => t.locationId === (selectedLocId === 'unassigned' ? null : selectedLocId));
        }
        if (selectedDeptName) {
          filteredTargets = filteredTargets.filter(t => t.vertical === selectedDeptName);
        }
      } else if (activeTab === 'department') {
        if (selectedDeptName) {
          filteredTargets = filteredTargets.filter(t => t.vertical === selectedDeptName);
        }
        if (selectedLocId) {
          filteredTargets = filteredTargets.filter(t => t.locationId === (selectedLocId === 'unassigned' ? null : selectedLocId));
        }
      }
      
      const activeOwners = Array.from(new Set(filteredTargets.map(t => t.owner.toLowerCase())));
      return employeeStatsList.filter(emp => activeOwners.includes(emp.name.toLowerCase()));
    }
    return employeeStatsList;
  }, [activeTab, selectedLocId, selectedDeptName, employeeStatsList, targets]);

  // Scopes targets based on tab and cascading dropdown states
  const scopedTargets = useMemo(() => {
    let tSet = targets;

    if (activeTab === 'location') {
      if (selectedLocId !== 'all') {
        tSet = tSet.filter(t => t.locationId === (selectedLocId === 'unassigned' ? null : selectedLocId));
      }
      if (selectedDeptId !== 'all' && selectedDeptName) {
        tSet = tSet.filter(t => t.vertical === selectedDeptName);
      }
      if (selectedEmpId !== 'all' && selectedEmpName) {
        tSet = tSet.filter(t => t.owner === selectedEmpName);
      }
    } else if (activeTab === 'department') {
      if (selectedDeptId !== 'all' && selectedDeptName) {
        tSet = tSet.filter(t => t.vertical === selectedDeptName);
      }
      if (selectedLocId !== 'all') {
        tSet = tSet.filter(t => t.locationId === (selectedLocId === 'unassigned' ? null : selectedLocId));
      }
      if (selectedEmpId !== 'all' && selectedEmpName) {
        tSet = tSet.filter(t => t.owner === selectedEmpName);
      }
    } else if (activeTab === 'employee') {
      if (selectedEmpId !== 'all' && selectedEmpName) {
        tSet = tSet.filter(t => t.owner === selectedEmpName);
      }
      if (selectedDeptId !== 'all' && selectedDeptName) {
        tSet = tSet.filter(t => t.vertical === selectedDeptName);
      }
      if (selectedLocId !== 'all') {
        tSet = tSet.filter(t => t.locationId === (selectedLocId === 'unassigned' ? null : selectedLocId));
      }
    }

    return tSet;
  }, [activeTab, selectedLocId, selectedLocName, selectedDeptId, selectedDeptName, selectedEmpId, selectedEmpName, targets]);

  // Derived Performance Metrics for Scoped Selection
  const scopedMetrics = useMemo(() => {
    const total = scopedTargets.length;
    const green = scopedTargets.filter(t => t.ragStatus === 'GREEN').length;
    const amber = scopedTargets.filter(t => t.ragStatus === 'AMBER').length;
    const red = scopedTargets.filter(t => t.ragStatus === 'RED').length;
    const avg = total > 0 ? Math.min(100, Math.round((scopedTargets.reduce((sum, t) => sum + (t.actualProgress || 0), 0) / total) * 100)) : 0;
    const gapCount = scopedTargets.filter(t => t.gap > 0).length;

    const baseStats = { total, green, amber, red, avg, gapCount };
    return {
      ...baseStats,
      note: getPerformanceNote(activeTab, baseStats)
    };
  }, [scopedTargets, activeTab]);

  // ── Employee Specific Metrices: Efficiency, Performance Tier, and Achievements ──
  const employeeDetails = useMemo(() => {
    if (!selectedEmpName) return null;

    const total = scopedTargets.length;
    if (total === 0) {
      return {
        efficiency: 0,
        tier: 'Idle / No Active Scope',
        achievements: []
      };
    }

    // 1. Compute Efficiency Score (Average ratio of actual progress to expected schedule)
    const efficiencies = scopedTargets.map(t => {
      if ((t.actualProgress || 0) >= 1) return 1; // Completed is 100% efficient
      if ((t.expectedProgress || 0) <= 0) return 1; // Ahead/No expected pacing is 100% efficient
      return Math.min(1.2, (t.actualProgress || 0) / (t.expectedProgress || 0)); // Limit individual target weight to 120%
    });
    const avgEff = efficiencies.reduce((s, val) => s + val, 0) / total;
    const efficiency = Math.min(100, Math.round(avgEff * 100));

    // 2. Performance Tier
    const avgProgress = scopedMetrics.avg;
    let tier = 'Needs Support';
    if (avgProgress >= 90) tier = 'Outstanding Performer';
    else if (avgProgress >= 75) tier = 'High Performer';
    else if (avgProgress >= 60) tier = 'Solid Contributor';

    // 3. Compile Achievements (Strictly concrete target accomplishments)
    const achievements: string[] = [];
    
    // Complete targets (Progress >= 100%)
    const completedTargets = scopedTargets.filter(t => (t.actualProgress || 0) >= 1);
    completedTargets.forEach(t => {
      achievements.push(`🏆 Completed target: "${t.name}" (${t.targetValue} ${t.unit})`);
    });

    // Pacing ahead of schedule (actualProgress > expectedProgress, not completed, and expectedProgress > 0)
    const aheadTargets = scopedTargets.filter(t => 
      (t.actualProgress || 0) > (t.expectedProgress || 0) && 
      (t.actualProgress || 0) < 1 &&
      (t.expectedProgress || 0) > 0
    );
    aheadTargets.forEach(t => {
      const actualPct = Math.round(t.actualProgress * 100);
      const expPct = Math.round(t.expectedProgress * 100);
      achievements.push(`⚡ Pacing ahead of schedule on "${t.name}" (Actual: ${actualPct}%, Expected: ${expPct}%)`);
    });

    // On track with zero gap (not already listed in ahead targets)
    const perfectTargets = scopedTargets.filter(t => 
      t.ragStatus === 'GREEN' && 
      (t.gap || 0) <= 0 && 
      (t.actualProgress || 0) < 1 &&
      !aheadTargets.some(at => at.id === t.id)
    );
    perfectTargets.forEach(t => {
      achievements.push(`🎯 On track with zero gap on "${t.name}" (Progress: ${Math.round(t.actualProgress * 100)}%)`);
    });

    return { efficiency, tier, achievements };
  }, [selectedEmpName, scopedTargets, scopedMetrics]);

  // Dynamic lists rendered inside detailed tables depending on nesting level
  const drillDownStatsList = useMemo<PerformanceStat[]>(() => {
    if (activeTab === 'location') {
      if (selectedLocId === 'all') {
        return locationStatsList;
      }
      if (selectedDeptId === 'all') {
        return filteredDeptOptions.map(dept => {
          const deptTargets = scopedTargets.filter(t => t.vertical === dept.name);
          const total = deptTargets.length;
          const green = deptTargets.filter(t => t.ragStatus === 'GREEN').length;
          const amber = deptTargets.filter(t => t.ragStatus === 'AMBER').length;
          const red = deptTargets.filter(t => t.ragStatus === 'RED').length;
          const avg = total > 0 ? Math.min(100, Math.round((deptTargets.reduce((s, t) => s + (t.actualProgress || 0), 0) / total) * 100)) : 0;
          const gapCount = deptTargets.filter(t => t.gap > 0).length;
          const base = { total, green, amber, red, avg, gapCount };
          return { id: dept.id, name: dept.name, ...base, targets: deptTargets, note: getPerformanceNote('department', base) };
        });
      }
      if (selectedEmpId === 'all') {
        return filteredEmpOptions.map(emp => {
          const empTargets = scopedTargets.filter(t => t.owner === emp.name);
          const total = empTargets.length;
          const green = empTargets.filter(t => t.ragStatus === 'GREEN').length;
          const amber = empTargets.filter(t => t.ragStatus === 'AMBER').length;
          const red = empTargets.filter(t => t.ragStatus === 'RED').length;
          const avg = total > 0 ? Math.min(100, Math.round((empTargets.reduce((s, t) => s + (t.actualProgress || 0), 0) / total) * 100)) : 0;
          const gapCount = empTargets.filter(t => t.gap > 0).length;
          const base = { total, green, amber, red, avg, gapCount };
          return { id: emp.id, name: emp.name, ...base, targets: empTargets, note: getPerformanceNote('employee', base) };
        });
      }
    } else if (activeTab === 'department') {
      if (selectedDeptId === 'all') {
        return departmentStatsList;
      }
      if (selectedLocId === 'all') {
        return [{ id: 'unassigned', name: 'Unassigned Location' }, ...locations].map(loc => {
          const locTargets = scopedTargets.filter(t => t.locationId === (loc.id === 'unassigned' ? null : loc.id));
          const total = locTargets.length;
          const green = locTargets.filter(t => t.ragStatus === 'GREEN').length;
          const amber = locTargets.filter(t => t.ragStatus === 'AMBER').length;
          const red = locTargets.filter(t => t.ragStatus === 'RED').length;
          const avg = total > 0 ? Math.min(100, Math.round((locTargets.reduce((s, t) => s + (t.actualProgress || 0), 0) / total) * 100)) : 0;
          const gapCount = locTargets.filter(t => t.gap > 0).length;
          const base = { total, green, amber, red, avg, gapCount };
          return { id: loc.id, name: loc.name, ...base, targets: locTargets, note: getPerformanceNote('location', base) };
        }).filter(s => s.total > 0 || s.id !== 'unassigned');
      }
      if (selectedEmpId === 'all') {
        return filteredEmpOptions.map(emp => {
          const empTargets = scopedTargets.filter(t => t.owner === emp.name);
          const total = empTargets.length;
          const green = empTargets.filter(t => t.ragStatus === 'GREEN').length;
          const amber = empTargets.filter(t => t.ragStatus === 'AMBER').length;
          const red = empTargets.filter(t => t.ragStatus === 'RED').length;
          const avg = total > 0 ? Math.min(100, Math.round((empTargets.reduce((s, t) => s + (t.actualProgress || 0), 0) / total) * 100)) : 0;
          const gapCount = empTargets.filter(t => t.gap > 0).length;
          const base = { total, green, amber, red, avg, gapCount };
          return { id: emp.id, name: emp.name, ...base, targets: empTargets, note: getPerformanceNote('employee', base) };
        });
      }
    } else if (activeTab === 'employee') {
      if (selectedEmpId === 'all') {
        return employeeStatsList;
      }
      if (selectedDeptId === 'all') {
        return filteredDeptOptions.map(dept => {
          const deptTargets = scopedTargets.filter(t => t.vertical === dept.name);
          const total = deptTargets.length;
          const green = deptTargets.filter(t => t.ragStatus === 'GREEN').length;
          const amber = deptTargets.filter(t => t.ragStatus === 'AMBER').length;
          const red = deptTargets.filter(t => t.ragStatus === 'RED').length;
          const avg = total > 0 ? Math.min(100, Math.round((deptTargets.reduce((s, t) => s + (t.actualProgress || 0), 0) / total) * 100)) : 0;
          const gapCount = deptTargets.filter(t => t.gap > 0).length;
          const base = { total, green, amber, red, avg, gapCount };
          return { id: dept.id, name: dept.name, ...base, targets: deptTargets, note: getPerformanceNote('department', base) };
        });
      }
      if (selectedLocId === 'all') {
        return [{ id: 'unassigned', name: 'Unassigned Location' }, ...locations].map(loc => {
          const locTargets = scopedTargets.filter(t => t.locationId === (loc.id === 'unassigned' ? null : loc.id));
          const total = locTargets.length;
          const green = locTargets.filter(t => t.ragStatus === 'GREEN').length;
          const amber = locTargets.filter(t => t.ragStatus === 'AMBER').length;
          const red = locTargets.filter(t => t.ragStatus === 'RED').length;
          const avg = total > 0 ? Math.min(100, Math.round((locTargets.reduce((s, t) => s + (t.actualProgress || 0), 0) / total) * 100)) : 0;
          const gapCount = locTargets.filter(t => t.gap > 0).length;
          const base = { total, green, amber, red, avg, gapCount };
          return { id: loc.id, name: loc.name, ...base, targets: locTargets, note: getPerformanceNote('location', base) };
        }).filter(s => s.total > 0 || s.id !== 'unassigned');
      }
    }
    return [];
  }, [activeTab, selectedLocId, selectedDeptId, selectedEmpId, locationStatsList, departmentStatsList, employeeStatsList, filteredDeptOptions, filteredEmpOptions, scopedTargets, locations]);

  // Overall calculations for KPI boxes
  const kpis = useMemo(() => {
    const activeWithTargets = drillDownStatsList.filter(s => s.total > 0);
    if (activeWithTargets.length === 0) return { top: 'N/A', needAttention: 'N/A', average: 0 };

    const sortedByAvg = [...activeWithTargets].sort((a, b) => b.avg - a.avg);
    const sortedByRed = [...activeWithTargets].sort((a, b) => b.red - a.red || a.avg - b.avg);

    const top = sortedByAvg[0]?.name || 'N/A';
    const needAttention = sortedByRed[0]?.red > 0 ? sortedByRed[0].name : [...activeWithTargets].sort((a, b) => a.avg - b.avg)[0]?.name || 'N/A';
    
    const totalTargets = targets.length;
    const average = totalTargets > 0
      ? Math.min(100, Math.round((targets.reduce((sum, t) => sum + (t.actualProgress || 0), 0) / totalTargets) * 100))
      : 0;

    return { top, needAttention, average };
  }, [drillDownStatsList, targets]);

  // Chart Rendering Options based on Scoped Targets
  const chartOptions = useMemo(() => {
    const displayList = drillDownStatsList.filter(s => s.total > 0);
    const names = displayList.map(s => s.name);
    const avgs = displayList.map(s => s.avg);
    const totals = displayList.map(s => s.total);

    const barColors = avgs.map(val => {
      if (val >= 85) return '#10b981';
      if (val >= 60) return '#f59e0b';
      return '#ef4444';
    });

    const progressAndDensityOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item1 = params[0];
          const item2 = params[1];
          return `<strong>${item1.name}</strong><br/>
                  ${item1.marker} ${item1.seriesName}: ${item1.value}%<br/>
                  ${item2 ? `${item2.marker} ${item2.seriesName}: ${item2.value} Target(s)` : ''}`;
        }
      },
      legend: {
        data: ['Avg Progress (%)', 'Total Targets'],
        textStyle: { color: '#9ca3af', fontFamily: 'Plus Jakarta Sans' },
        bottom: 0
      },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: names,
        axisLabel: { color: '#9ca3af', rotate: names.length > 6 ? 30 : 0 }
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { color: '#9ca3af', formatter: '{value}%' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        {
          type: 'value',
          axisLabel: { color: '#9ca3af', formatter: '{value}' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Avg Progress (%)',
          type: 'bar',
          data: avgs,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (params: any) => barColors[params.dataIndex]
          }
        },
        {
          name: 'Total Targets',
          type: 'line',
          yAxisIndex: 1,
          data: totals,
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 3 },
          itemStyle: { color: '#3b82f6' }
        }
      ]
    };

    const targetDistributionOption = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: { color: '#9ca3af', fontFamily: 'Plus Jakarta Sans', fontSize: 11 },
        type: 'scroll'
      },
      series: [
        {
          name: 'Target Volume',
          type: 'pie',
          radius: '60%',
          center: ['65%', '50%'],
          roseType: activeTab === 'employee' ? 'radius' : undefined,
          data: displayList.map(s => ({
            value: s.total,
            name: s.name
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: { show: false }
        }
      ]
    };

    return { progressAndDensityOption, targetDistributionOption };
  }, [drillDownStatsList, activeTab]);

  // Scoped Chart Options for Leaf Entity View (e.g. Single Selected Employee, or full drill-down leaf node)
  const leafChartOptions = useMemo(() => {
    const { green, amber, red, avg } = scopedMetrics;

    const pieOption = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
      legend: { textStyle: { color: '#9ca3af' }, bottom: '0%' },
      series: [{
        name: 'RAG Share', type: 'pie', radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: 'var(--bg-surface)', borderWidth: 2 },
        label: { show: false },
        data: [
          { value: green, name: 'Green (On Track)', itemStyle: { color: '#10b981' } },
          { value: amber, name: 'Amber (At Risk)', itemStyle: { color: '#f59e0b' } },
          { value: red, name: 'Red (Off Track)', itemStyle: { color: '#ef4444' } },
        ],
      }],
    };

    const gaugeOption = {
      backgroundColor: 'transparent',
      series: [{
        type: 'gauge', startAngle: 180, endAngle: 0, center: ['50%', '75%'], radius: '90%',
        min: 0, max: 100, splitNumber: 5,
        axisLine: { lineStyle: { width: 12, color: [[0.3, '#ef4444'], [0.7, '#f59e0b'], [1, '#10b981']] } },
        pointer: { icon: 'path://M12.8,29.5C12.2,30,11,30,10.4,29.5L1.3,21.5c-0.8-0.7-0.8-2,0-2.7l9.1-8c0.6-0.5,1.8-0.5,2.4,0l0.1,0.1c0.6,0.5,0.6,1.4,0,1.9L5.4,19.2l12.7,11.2c0.6,0.5,0.6,1.4,0,1.9L12.8,29.5z', length: '75%', width: 8, offsetCenter: [0, 5], itemStyle: { color: 'auto' } },
        axisTick: { length: 6, lineStyle: { color: 'auto', width: 2 } },
        splitLine: { length: 12, lineStyle: { color: 'auto', width: 4 } },
        axisLabel: { color: '#9ca3af', fontSize: 12, distance: -40, rotate: 'tangential', formatter: (v: number) => v === 0 ? '0%' : v === 50 ? '50%' : v === 100 ? '100%' : '' },
        title: { offsetCenter: [0, '-20%'], fontSize: 13, color: '#9ca3af', fontWeight: 600 },
        detail: { fontSize: 32, offsetCenter: [0, '-5%'], valueAnimation: true, formatter: '{value}%', color: '#f3f4f6', fontWeight: 800 },
        data: [{ value: avg, name: 'Average Progress' }],
      }],
    };

    return { pie: pieOption, gauge: gaugeOption };
  }, [scopedMetrics]);

  // Determine if we have drilled down to the leaf node (i.e. all active options selected)
  const isLeafSelected = useMemo(() => {
    if (activeTab === 'location') {
      return selectedLocId !== 'all' && selectedDeptId !== 'all' && selectedEmpId !== 'all';
    } else if (activeTab === 'department') {
      return selectedDeptId !== 'all' && selectedLocId !== 'all' && selectedEmpId !== 'all';
    } else {
      return selectedEmpId !== 'all' && selectedDeptId !== 'all' && selectedLocId !== 'all';
    }
  }, [activeTab, selectedLocId, selectedDeptId, selectedEmpId]);

  // Decide if we should render Employee detail profile view
  // Show Employee details whenever a specific employee is selected in the hierarchy
  const showEmployeeProfile = useMemo(() => {
    return !!selectedEmpName;
  }, [selectedEmpName]);

  if (loading || locLoading) {
    return <div className="text-center" style={{ padding: '60px', color: 'var(--text-muted)' }}>Loading advanced analytics...</div>;
  }

  return (
    <div className="content-container" style={{ padding: '32px' }}>
      
      {/* ── Tabs & Cascading Filter Bar Container ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '28px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '18px'
      }}>
        {/* Switcher Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '6px',
          gap: '6px',
          width: '100%',
          maxWidth: '520px'
        }}>
          {(['location', 'department', 'employee'] as AnalysisTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: isActive ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                {tab === 'location' && <MapPin size={16} />}
                {tab === 'department' && <Building2 size={16} />}
                {tab === 'employee' && <User size={16} />}
                <span style={{ textTransform: 'capitalize' }}>{tab}s</span>
              </button>
            );
          })}
        </div>

        {/* ── CASCADING FILTERS BAR ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Dropdown 1: Main activeTab dimension selector */}
          {activeTab === 'location' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <MapPin size={14} style={{ color: '#ef4444' }} />
              <select value={selectedLocId} onChange={(e) => { setSelectedLocId(e.target.value); setSelectedDeptId('all'); setSelectedEmpId('all'); }} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Locations</option>
                {locations.map(l => <option key={l.id} value={l.id} style={{ background: '#141520' }}>{l.name}</option>)}
                <option value="unassigned" style={{ background: '#141520' }}>Unassigned</option>
              </select>
            </div>
          )}

          {activeTab === 'department' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <Building2 size={14} style={{ color: '#3b82f6' }} />
              <select value={selectedDeptId} onChange={(e) => { setSelectedDeptId(e.target.value); setSelectedLocId('all'); setSelectedEmpId('all'); }} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id} style={{ background: '#141520' }}>{d.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'employee' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <User size={14} style={{ color: '#a78bfa' }} />
              <select value={selectedEmpId} onChange={(e) => { setSelectedEmpId(e.target.value); setSelectedDeptId('all'); setSelectedLocId('all'); }} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Employees</option>
                {employeeStatsList.map(emp => <option key={emp.id} value={emp.id} style={{ background: '#141520' }}>{emp.name}</option>)}
              </select>
            </div>
          )}

          {/* Dropdown 2: Cascades only if Dropdown 1 is selected */}
          {activeTab === 'location' && selectedLocId !== 'all' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <Building2 size={14} style={{ color: '#3b82f6' }} />
              <select value={selectedDeptId} onChange={(e) => { setSelectedDeptId(e.target.value); setSelectedEmpId('all'); }} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Departments</option>
                {filteredDeptOptions.map(d => <option key={d.id} value={d.id} style={{ background: '#141520' }}>{d.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'department' && selectedDeptId !== 'all' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <MapPin size={14} style={{ color: '#ef4444' }} />
              <select value={selectedLocId} onChange={(e) => { setSelectedLocId(e.target.value); setSelectedEmpId('all'); }} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Locations</option>
                {filteredLocOptions.map(l => <option key={l.id} value={l.id} style={{ background: '#141520' }}>{l.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'employee' && selectedEmpId !== 'all' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <Building2 size={14} style={{ color: '#3b82f6' }} />
              <select value={selectedDeptId} onChange={(e) => { setSelectedDeptId(e.target.value); setSelectedLocId('all'); }} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Departments</option>
                {filteredDeptOptions.map(d => <option key={d.id} value={d.id} style={{ background: '#141520' }}>{d.name}</option>)}
              </select>
            </div>
          )}

          {/* Dropdown 3: Cascades only if Dropdown 2 is also selected */}
          {activeTab === 'location' && selectedLocId !== 'all' && selectedDeptId !== 'all' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <User size={14} style={{ color: '#a78bfa' }} />
              <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Employees</option>
                {filteredEmpOptions.map(emp => <option key={emp.id} value={emp.id} style={{ background: '#141520' }}>{emp.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'department' && selectedDeptId !== 'all' && selectedLocId !== 'all' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <User size={14} style={{ color: '#a78bfa' }} />
              <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Employees</option>
                {filteredEmpOptions.map(emp => <option key={emp.id} value={emp.id} style={{ background: '#141520' }}>{emp.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'employee' && selectedEmpId !== 'all' && selectedDeptId !== 'all' && (
            <div className="analytics-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px 14px', minWidth: '180px' }}>
              <MapPin size={14} style={{ color: '#ef4444' }} />
              <select value={selectedLocId} onChange={(e) => setSelectedLocId(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="all" style={{ background: '#141520' }}>All Locations</option>
                {filteredLocOptions.map(l => <option key={l.id} value={l.id} style={{ background: '#141520' }}>{l.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── VIEW 1: Aggregated comparison dashboard or intermediate level tables (NOT viewing specific employee) ── */}
      {!showEmployeeProfile && (
        <>
          {/* Summary KPI Cards */}
          <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '14px', borderRadius: '12px', color: '#10b981' }}>
                <Award size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Top Performer
                </span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {kpis.top}
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '14px', borderRadius: '12px', color: '#ef4444' }}>
                <AlertCircle size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Attention Required
                </span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {kpis.needAttention}
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '14px', borderRadius: '12px', color: '#3b82f6' }}>
                <TrendingUp size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Avg Scope Completion
                </span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
                  {scopedMetrics.avg}%
                </span>
              </div>
            </div>
          </div>

          {/* Analytical Charts */}
          {drillDownStatsList.filter(s => s.total > 0).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px', marginBottom: '32px' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <BarChart3 size={16} style={{ color: '#60a5fa' }} />
                  DRILL-DOWN PERFORMANCE MATRIX
                </h3>
                <div style={{ height: '320px' }}>
                  <ReactECharts option={chartOptions.progressAndDensityOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <ListFilter size={16} style={{ color: '#10b981' }} />
                  TARGET LOAD RATIO
                </h3>
                <div style={{ height: '320px' }}>
                  <ReactECharts option={chartOptions.targetDistributionOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Performance Callout for intermediate level selections */}
          {(selectedLocId !== 'all' || selectedDeptId !== 'all' || selectedEmpId !== 'all') && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '28px'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {scopedMetrics.note.status === 'excellent' && <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />}
                {scopedMetrics.note.status === 'good' && <CheckCircle size={18} style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />}
                {scopedMetrics.note.status === 'warning' && <AlertCircle size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />}
                {scopedMetrics.note.status === 'critical' && <ShieldAlert size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />}
                {scopedMetrics.note.status === 'idle' && <AlertCircle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />}
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#ffffff', fontWeight: 500 }}>
                  <strong>
                    {selectedLocName} {selectedDeptName ? ` • ${selectedDeptName}` : ''} {selectedEmpName ? ` • ${selectedEmpName}` : ''} Summary: 
                  </strong>{' '}
                  {scopedMetrics.note.text}
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Table listing next level drill down stats */}
          <div className="glass-card" style={{ padding: '28px', overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <Briefcase size={18} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                {activeTab === 'location' && selectedLocId === 'all' && 'Location Summary Matrix'}
                {activeTab === 'location' && selectedLocId !== 'all' && selectedDeptId === 'all' && `Departments operating in ${selectedLocName}`}
                {activeTab === 'location' && selectedLocId !== 'all' && selectedDeptId !== 'all' && `Employee ownership under ${selectedLocName} (${selectedDeptName})`}
                
                {activeTab === 'department' && selectedDeptId === 'all' && 'Department Summary Matrix'}
                {activeTab === 'department' && selectedDeptId !== 'all' && selectedLocId === 'all' && `Locations operating ${selectedDeptName}`}
                {activeTab === 'department' && selectedDeptId !== 'all' && selectedLocId !== 'all' && `Employee ownership under ${selectedDeptName} (${selectedLocName})`}
                
                {activeTab === 'employee' && selectedEmpId === 'all' && 'Employee Summary Matrix'}
                {activeTab === 'employee' && selectedEmpId !== 'all' && selectedDeptId === 'all' && `Departments assigned to ${selectedEmpName}`}
                {activeTab === 'employee' && selectedEmpId !== 'all' && selectedDeptId !== 'all' && `Locations assigned to ${selectedEmpName} (${selectedDeptName})`}
              </h3>
            </div>

            <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'visible' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', width: '240px' }}>
                      NAME
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', width: '160px' }}>
                      COMPLETION RATE
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', width: '140px' }}>
                      STATUS SHARE
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left' }}>
                      PERFORMANCE SUMMARY NOTES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {drillDownStatsList.map((stat) => {
                    const isExpanded = !!expandedRows[stat.id];
                    
                    let noteColor = 'var(--text-secondary)';
                    if (stat.note.status === 'excellent') {
                      noteColor = '#10b981';
                    } else if (stat.note.status === 'good') {
                      noteColor = '#34d399';
                    } else if (stat.note.status === 'warning') {
                      noteColor = '#fbbf24';
                    } else if (stat.note.status === 'critical') {
                      noteColor = '#f87171';
                    }

                    return (
                      <React.Fragment key={stat.id}>
                        <tr
                          onClick={() => stat.total > 0 && toggleRow(stat.id)}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            cursor: stat.total > 0 ? 'pointer' : 'default',
                            background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                          className={stat.total > 0 ? 'hoverable-row' : ''}
                        >
                          <td style={{ padding: '16px', fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {stat.total > 0 && (
                                <span>{isExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}</span>
                              )}
                              <span>{stat.name}</span>
                            </div>
                          </td>

                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                                <span style={{ color: noteColor }}>{stat.avg}%</span>
                                <span style={{ color: 'var(--text-muted)' }}>{stat.total} Target(s)</span>
                              </div>
                              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${stat.avg}%`,
                                  height: '100%',
                                  background: noteColor,
                                  borderRadius: '3px'
                                }} />
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            {stat.total > 0 ? (
                              <div style={{ display: 'inline-flex', gap: '6px', fontSize: '11px' }}>
                                {stat.green > 0 && <span className="badge green" style={{ padding: '2px 6px', letterSpacing: 'normal' }}>{stat.green}G</span>}
                                {stat.amber > 0 && <span className="badge amber" style={{ padding: '2px 6px', letterSpacing: 'normal' }}>{stat.amber}A</span>}
                                {stat.red > 0 && <span className="badge red" style={{ padding: '2px 6px', letterSpacing: 'normal' }}>{stat.red}R</span>}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>

                          <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              {stat.note.status === 'excellent' && <CheckCircle size={15} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />}
                              {stat.note.status === 'good' && <CheckCircle size={15} style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />}
                              {stat.note.status === 'warning' && <AlertCircle size={15} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />}
                              {stat.note.status === 'critical' && <ShieldAlert size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />}
                              {stat.note.status === 'idle' && <AlertCircle size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />}
                              <span style={{ color: stat.note.status === 'idle' ? 'var(--text-muted)' : '#ffffff' }}>
                                {stat.note.text}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && stat.total > 0 && (
                          <tr>
                            <td colSpan={4} style={{ background: 'rgba(0,0,0,0.15)', padding: '12px 24px 20px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Target Performance Breakdown:
                                </span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                  {stat.targets.map((t) => {
                                    const progPct = Math.round(t.actualProgress * 100);
                                    return (
                                      <div key={t.id} style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <strong style={{ fontSize: '13px', color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={t.name}>
                                            {t.name}
                                          </strong>
                                          <span className={`badge ${t.ragStatus.toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                                            {t.ragStatus}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                          <span>Owner: {t.owner}</span>
                                          <span>Progress: <strong>{progPct}%</strong></span>
                                        </div>
                                        <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                          <div style={{
                                            width: `${progPct}%`,
                                            height: '100%',
                                            background: `var(--color-rag-${t.ragStatus.toLowerCase()})`
                                          }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── VIEW 2: Employee Scoped Deep-Dive View (Selected Employee Profile) ── */}
      {showEmployeeProfile && employeeDetails && (
        <div>
          {/* Header describing employee parameters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '24px'
          }}>
            <User size={22} style={{ color: '#a78bfa' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                Employee Performance Profile: {selectedEmpName}
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {selectedLocName ? `Location: ${selectedLocName}` : 'All Locations'} 
                {selectedDeptName ? ` · Department: ${selectedDeptName}` : ' · All Departments'}
              </span>
            </div>
          </div>

          {/* Employee KPI Cards Grid (4 Column Layout for extra info) */}
          <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '10px', color: '#3b82f6' }}>
                <Target size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Assigned Targets
                </span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                  {scopedMetrics.total}
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '10px', color: '#10b981' }}>
                <TrendingUp size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Average Progress
                </span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  {scopedMetrics.avg}%
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '12px', borderRadius: '10px', color: '#60a5fa' }}>
                <Sparkles size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Efficiency Rating
                </span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#60a5fa', marginTop: '2px' }}>
                  {employeeDetails.efficiency}%
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '10px', color: '#f59e0b' }}>
                <Trophy size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Performance Tier
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {employeeDetails.tier}
                </span>
              </div>
            </div>
          </div>

          {/* Performance summary review box + achievements */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', marginBottom: '28px' }}>
            {/* Performance Notes Callout */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Performance Evaluation Review
              </h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {scopedMetrics.note.status === 'excellent' && <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />}
                {scopedMetrics.note.status === 'good' && <CheckCircle size={20} style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />}
                {scopedMetrics.note.status === 'warning' && <AlertCircle size={20} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />}
                {scopedMetrics.note.status === 'critical' && <ShieldAlert size={20} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />}
                {scopedMetrics.note.status === 'idle' && <AlertCircle size={20} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />}
                
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#ffffff',
                  fontWeight: 500
                }}>
                  {scopedMetrics.note.text}
                </p>
              </div>
            </div>

            {/* Achievements Card */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.02)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={14} />
                Key Achievements
              </h4>
              {employeeDetails.achievements.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {employeeDetails.achievements.map((ach, idx) => (
                    <li key={idx} style={{ fontSize: '13px', color: '#e5e7eb', lineHeight: '1.4' }}>
                      {ach}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>
                  No verified milestones completed under this scope.
                </div>
              )}
            </div>
          </div>

          {/* Scoped Charts */}
          {scopedMetrics.total > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  Target Pacing Distribution (RAG)
                </h3>
                <div style={{ height: '260px' }}>
                  <ReactECharts option={leafChartOptions.pie} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  Average Deliverables Completion
                </h3>
                <div style={{ height: '260px' }}>
                  <ReactECharts option={leafChartOptions.gauge} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Assigned Scoped Targets Table List */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Assigned Targets Scoped Breakdown ({scopedTargets.length})
            </h3>

            {scopedTargets.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active targets found for this scoped selection.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left' }}>Target Name</th>
                      <th style={{ padding: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left' }}>Dates</th>
                      <th style={{ padding: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', width: '220px' }}>Progress</th>
                      <th style={{ padding: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>RAG Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedTargets.map(t => {
                      const progPct = Math.round(t.actualProgress * 100);
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '14px 12px', fontWeight: 600, color: '#ffffff', fontSize: '13px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{t.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Base: {t.baseline} · Target: {t.targetValue} {t.unit}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {new Date(t.startDate).toLocaleDateString()} - {new Date(t.deadline).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: `var(--color-rag-${t.ragStatus.toLowerCase()})` }}>
                                {progPct}% Completed
                              </span>
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${progPct}%`,
                                  height: '100%',
                                  background: `var(--color-rag-${t.ragStatus.toLowerCase()})`
                                }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                            <span className={`badge ${t.ragStatus.toLowerCase()}`} style={{ fontSize: '11px' }}>
                              {t.ragStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
