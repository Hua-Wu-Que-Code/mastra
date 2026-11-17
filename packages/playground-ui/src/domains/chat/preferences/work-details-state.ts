import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { WorkDetailsPresentation } from './work-details';

export const WorkDetailsContext = createContext<WorkDetailsPresentation | undefined>(undefined);
export const WorkDetailsControlContext = createContext<ReactNode>(undefined);
export const useWorkDetails = () => useContext(WorkDetailsContext);
