import React, { createContext, useContext } from 'react';
import { IRepository } from './repository';
import { LocalRepository } from './localRepository';

// Switchable Repository Provider
// In the future:
// import { SupabaseRepository } from './supabaseRepository';
// export const repository: IRepository = new SupabaseRepository();

export const repository: IRepository = new LocalRepository();

const RepositoryContext = createContext<IRepository>(repository);

export const RepositoryProvider: React.FC<{
  children: React.ReactNode;
  repo?: IRepository;
}> = ({ children, repo = repository }) => {
  return (
    <RepositoryContext.Provider value={repo}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepository = (): IRepository => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
};

export * from './repository';
export * from '../types';
