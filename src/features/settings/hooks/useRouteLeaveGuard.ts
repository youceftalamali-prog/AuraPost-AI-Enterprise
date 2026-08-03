import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useSettings } from './useSettings';

export const useRouteLeaveGuard = () => {
  const { isDirty } = useSettings();

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return isDirty && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);
};