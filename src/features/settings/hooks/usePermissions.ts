type UserRole = 'admin' | 'developer' | 'owner' | 'member';

function resolveCurrentRole(): UserRole {
  return 'admin';
}

export const usePermissions = () => {
  const role = resolveCurrentRole();

  return { 
    role,
    isDeveloper: role === 'developer' || role === 'admin' || role === 'owner',
    isAdmin: role === 'admin' || role === 'owner'
  };
};