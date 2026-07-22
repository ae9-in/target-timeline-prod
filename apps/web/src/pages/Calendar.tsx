import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Calendar: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoading(true);
        const res = await api.get('/targets');
        setTargets(res.data);
      } catch (err) {
        console.error('Error fetching targets for calendar', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTargets();
  }, [api]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return <div className="text-center" style={{ padding: '40px' }}>Loading calendar...</div>;
  }

  // Calendar logic
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const days: { dayNumber: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    days.push({
      dayNumber: d,
      isCurrentMonth: false,
      date: new Date(year, month - 1, d),
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    days.push({
      dayNumber: d,
      isCurrentMonth: true,
      date: new Date(year, month, d),
    });
  }

  // Next month padding days
  const remainingCells = 42 - days.length; // 6 rows of 7 cells
  for (let d = 1; d <= remainingCells; d++) {
    days.push({
      dayNumber: d,
      isCurrentMonth: false,
      date: new Date(year, month + 1, d),
    });
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to get targets with deadline matching a specific date
  const getEventsForDate = (date: Date) => {
    return targets.filter(t => {
      const deadlineDate = new Date(t.deadline);
      return (
        deadlineDate.getFullYear() === date.getFullYear() &&
        deadlineDate.getMonth() === date.getMonth() &&
        deadlineDate.getDate() === date.getDate()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };

  return (
    <div className="content-container">
      {/* Calendar Header with navigation */}
      <div className="flex justify-between items-center glass-card" style={{ padding: '16px 24px' }}>
        <div className="flex items-center gap-16">
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-8">
          <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={handleToday}>
            Today
          </button>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={handlePrevMonth}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={handleNextMonth}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div className="calendar-grid">
          {/* Weekday headers */}
          {weekdays.map(d => (
            <div key={d} className="calendar-header-cell">{d}</div>
          ))}

          {/* Day cells */}
          {days.map((cell, idx) => {
            const dateEvents = getEventsForDate(cell.date);
            const today = isToday(cell.date);

            return (
              <div 
                key={idx} 
                className={`calendar-day-cell ${today ? 'today' : ''}`}
                style={{ opacity: cell.isCurrentMonth ? 1 : 0.4 }}
              >
                <span className="calendar-day-number">{cell.dayNumber}</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
                  {dateEvents.map(event => (
                    <div
                      key={event.id}
                      className={`calendar-event ${event.ragStatus.toLowerCase()}`}
                      title={`${event.name} (${event.vertical})`}
                      onClick={() => navigate(`/targets/${event.id}`)}
                    >
                      {event.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
