import React from 'react';
import { useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();

  const getPageDetails = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Dashboard Overview', subtitle: 'Real-time targets summary and key performance indicators.' };
      case '/targets':
        return { title: 'Master Target Tracker', subtitle: 'Monitor, update, and manage cross-vertical metrics.' };
      case '/timeline':
        return { title: 'Gantt Timeline', subtitle: 'Visual representation of project schedules and deadlines.' };
      case '/calendar':
        return { title: 'Calendar View', subtitle: 'Chronological roadmap of targets and deadlines.' };
      case '/performance':
        return { title: 'Department Performance', subtitle: 'Vertical breakdowns and average pace metrics.' };
      case '/analytics':
        return { title: 'Advanced Analytics', subtitle: 'Statistical insight into target distributions and completion rates.' };
      case '/alerts':
        return { title: 'Alerts & Risks Log', subtitle: 'Active status alerts requiring attention or resolution.' };
      case '/reports':
        return { title: 'Weekly PDF Reports', subtitle: 'Generate and review formal leadership RAG summaries.' };
      default:
        if (location.pathname.startsWith('/targets/')) {
          return { title: 'Target Details', subtitle: 'Detailed trend history, audit logs, and associated alerts.' };
        }
        return { title: 'Targets & Timelines', subtitle: 'Cross-functional operations system.' };
    }
  };

  const { title, subtitle } = getPageDetails();

  return (
    <header className="header">
      <div className="header-title-container">
        <h1 className="header-title">{title}</h1>
        <span className="header-subtitle">{subtitle}</span>
      </div>
    </header>
  );
};
