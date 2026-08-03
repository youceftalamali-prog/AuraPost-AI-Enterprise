import { MemoryRouter } from 'react-router-dom';
import { SettingsLayout } from '../features/settings/layouts/SettingsLayout';

/**
 * Mounts the Settings feature module as a tab within the tab-switcher
 * shell (see App.tsx). The settings module is internally built around
 * react-router-dom (nested <Routes>) and its own SettingsLayout (sidebar,
 * header, save bar, toasts), while the rest of the app uses plain
 * state-based tab switching with no app-wide Router. Rather than
 * introduce a BrowserRouter (and URL-sync side effects) across the whole
 * app, we scope a MemoryRouter to just this subtree so the settings
 * module's internal navigation (sidebar links, breadcrumbs, deep pages)
 * works exactly as designed, without altering the host app's routing
 * model or existing tabs.
 */
export default function SettingsModule() {
  return (
    <MemoryRouter initialEntries={['/workspace']}>
      <SettingsLayout />
    </MemoryRouter>
  );
}
