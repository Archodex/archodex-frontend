import { createContext } from 'react';
import { QueryDataEvent } from '../hooks/useQueryData';

const QueryDataDispatchContext = createContext<React.Dispatch<QueryDataEvent>>(() => {
  throw new Error('QueryDataDispatchContext not initialized');
});

export default QueryDataDispatchContext;
