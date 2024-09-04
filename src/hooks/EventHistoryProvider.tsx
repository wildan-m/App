import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface EventHistoryContextType {
  eventHistory: string[];
}

const defaultEventHistoryContext: EventHistoryContextType = {
  eventHistory: [],
};

const EventHistoryContext = createContext<EventHistoryContextType>(defaultEventHistoryContext);

const EventHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [eventHistory, setEventHistory] = useState<string[]>([]);

  const handleEvent = (event: Event) => {
    console.log(`[wildebug] Event triggered: ${event.type}`);
    setEventHistory((prevHistory) => {
      const newHistory = [event.type, ...prevHistory];
      console.log(`[wildebug] Updated event history: ${newHistory}`);
      return newHistory;
    });
  };

  useEffect(() => {
    const events = ['copy', 'cut', 'contextmenu', 'focus', 'blur', 'keydown', 'keyup', 'click'];

    events.forEach((eventType) => {
      window.addEventListener(eventType, handleEvent, true);
    });

    return () => {
      events.forEach((eventType) => {
        window.removeEventListener(eventType, handleEvent, true);
      });
    };
  }, []);

  return (
    <EventHistoryContext.Provider value={{ eventHistory }}>
      {children}
    </EventHistoryContext.Provider>
  );
};

export { EventHistoryProvider, EventHistoryContext };