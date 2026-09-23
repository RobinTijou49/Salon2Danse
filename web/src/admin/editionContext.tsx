import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { admin, AdminEdition } from '../lib/api';

type Ctx = {
  editionId?: string;
  setEditionId: (id: string) => void;
  editions: AdminEdition[];
};

const EditionCtx = createContext<Ctx>({ setEditionId: () => {}, editions: [] });

export function AdminEditionProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({ queryKey: ['admin', 'editions'], queryFn: admin.editions });
  const [editionId, setEditionId] = useState<string | undefined>();

  useEffect(() => {
    if (!editionId && data?.length) {
      const current = data.find((e) => !e.isArchived) ?? data[0];
      setEditionId(current.id);
    }
  }, [data, editionId]);

  return (
    <EditionCtx.Provider value={{ editionId, setEditionId, editions: data ?? [] }}>
      {children}
    </EditionCtx.Provider>
  );
}

export const useEdition = () => useContext(EditionCtx);
