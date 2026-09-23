import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { admin, AdminEdition } from '../lib/api';

type Ctx = {
  editionId?: string;
  setEditionId: (id: string) => void;
  editions: AdminEdition[];
};

const EditionCtx = createContext<Ctx>({ setEditionId: () => {}, editions: [] });

function readStored(): string | undefined {
  try {
    return localStorage.getItem('adminEdition') || undefined;
  } catch {
    return undefined;
  }
}

export function AdminEditionProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({ queryKey: ['admin', 'editions'], queryFn: admin.editions });
  const [editionId, setEditionIdState] = useState<string | undefined>(readStored);

  const setEditionId = (id: string) => {
    setEditionIdState(id);
    try {
      localStorage.setItem('adminEdition', id);
    } catch {
      /* stockage indisponible : on garde juste l'état en mémoire */
    }
  };

  useEffect(() => {
    if (!data?.length) return;
    // Si aucune sélection (ou une sélection qui n'existe plus), on choisit
    // l'édition courante par défaut.
    if (!editionId || !data.some((e) => e.id === editionId)) {
      setEditionId((data.find((e) => !e.isArchived) ?? data[0]).id);
    }
  }, [data, editionId]);

  return (
    <EditionCtx.Provider value={{ editionId, setEditionId, editions: data ?? [] }}>
      {children}
    </EditionCtx.Provider>
  );
}

export const useEdition = () => useContext(EditionCtx);
