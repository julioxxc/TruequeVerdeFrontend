import React, { createContext, useContext, useState, useCallback } from 'react';

type ConversationContextType = {
  onRatingSubmitted: () => void;
  subscribeToRatingChange: (callback: () => void) => () => void;
};

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ratingListeners, setRatingListeners] = useState<Array<() => void>>([]);

  const onRatingSubmitted = useCallback(() => {
    // Notificar a todos los listeners
    ratingListeners.forEach((listener) => listener());
  }, [ratingListeners]);

  const subscribeToRatingChange = useCallback((callback: () => void) => {
    setRatingListeners((prev) => [...prev, callback]);
    
    // Retornar función para desuscribirse
    return () => {
      setRatingListeners((prev) => prev.filter((listener) => listener !== callback));
    };
  }, []);

  return (
    <ConversationContext.Provider value={{ onRatingSubmitted, subscribeToRatingChange }}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      'useConversationContext debe ser usado dentro de ConversationProvider'
    );
  }
  return context;
};
