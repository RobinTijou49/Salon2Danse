import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Me } from './api';

type AuthCtx = {
  user: Me | null;
  loading: boolean;
  refresh: () => void;
  setUser: (u: Me | null) => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  refresh: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  });

  return (
    <Ctx.Provider
      value={{
        user: data ?? null,
        loading: isLoading,
        refresh: () => qc.invalidateQueries({ queryKey: ['me'] }),
        setUser: (u) => qc.setQueryData(['me'], u),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
