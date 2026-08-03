import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from './useSettings';
import { ALL_NAVIGATION, CLIENT_NAVIGATION, DEVELOPER_NAVIGATION } from '../data/navigation';
import { SettingsNavItem, SettingsArea } from '../types/settings.types';
import { usePermissions } from './usePermissions';

export const useNavigation = () => {
  const { searchQuery } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDeveloper } = usePermissions();

  const activeModule = useMemo(() => {
    const path = location.pathname.split('/').pop();
    const found = ALL_NAVIGATION.find(item => item.id === path);
    return found ? found.id : null;
  }, [location.pathname]);

  const activeArea = useMemo(() => {
    if (!activeModule) return SettingsArea.CLIENT;
    const item = ALL_NAVIGATION.find(i => i.id === activeModule);
    return item ? item.area : SettingsArea.CLIENT;
  }, [activeModule]);

  const filteredNavigation = useMemo(() => {
    let items = ALL_NAVIGATION;
    
    if (!isDeveloper) {
      items = items.filter(item => item.area !== SettingsArea.DEVELOPER);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.label.toLowerCase().includes(query)
      );
    }

    return items;
  }, [searchQuery, isDeveloper]);

  const clientNavigation = useMemo(
    () => filteredNavigation.filter((item) => item.area === SettingsArea.CLIENT),
    [filteredNavigation]
  );

  const developerNavigation = useMemo(
    () => filteredNavigation.filter((item) => item.area === SettingsArea.DEVELOPER),
    [filteredNavigation]
  );

  const handleNavigationClick = (item: SettingsNavItem) => {
    navigate(`/settings/${item.id}`);
  };

  return {
    filteredNavigation,
    clientNavigation,
    developerNavigation,
    activeModule,
    activeArea,
    handleNavigationClick,
  };
};