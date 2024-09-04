import { useContext } from 'react';
import { EventHistoryContext } from './EventHistoryProvider';

const useEventHistory = () => {
  const context = useContext(EventHistoryContext);
  if (!context) {
    throw new Error('useEventHistory must be used within an EventHistoryProvider');
  }
  return context.eventHistory;
};

export default useEventHistory;