import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import dashboardService from '../services/dashboard';

const ChildContext = createContext();

export function ChildProvider({ children }) {
  const { user } = useAuth();
  const [childrenList, setChildrenList] = useState([]);
  const [activeChild, setActiveChild] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadChildren = async () => {
      try {
        if (user.role === 'PARENT') {
          const data = await dashboardService.getParentChildren();

          if (!ignore) {
            setChildrenList(data);
            setActiveChild((current) => current || data[0] || null);
          }

          return;
        }

        if (user.role === 'TEACHER') {
          const data = await dashboardService.getTeacherStudents();

          if (!ignore) {
            setChildrenList(data);
            setActiveChild((current) => current || data[0] || null);
          }

          return;
        }

        const resolvedChildId = user.linkedChildId || String(user.id);
        const childRecord = {
          id: resolvedChildId,
          name: user.name,
          className: 'Student account'
        };

        if (!ignore) {
          setChildrenList([childRecord]);
          setActiveChild(childRecord);
        }
      } catch (error) {
        if (!ignore) {
          setChildrenList([]);
          setActiveChild(null);
        }
      }
    };

    if (!user) {
      setChildrenList([]);
      setActiveChild(null);
      return;
    }

    loadChildren();

    return () => {
      ignore = true;
    };
  }, [user]);

  const value = useMemo(() => ({
    activeChild,
    setActiveChild,
    childrenList,
    setChildrenList
  }), [activeChild, childrenList]);

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useChild() {
  const context = useContext(ChildContext);

  if (!context) {
    throw new Error('useChild must be used within ChildProvider');
  }

  return context;
}

export default ChildContext;
