import { createContext } from 'react';
import { QueryData } from '../hooks/useQueryData';

const QueryDataContext = createContext<QueryData>(undefined as unknown as QueryData);

export default QueryDataContext;
