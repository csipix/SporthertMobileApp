import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';

export interface MatchItem {
  id: string;
  sport: string;
  round: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  location: string;
  startTime: string;
  endTime: string;
  isFinished: boolean;
}

interface MatchesContextType {
  matches: MatchItem[];
  loading: boolean;
}

const MatchesContext = createContext<MatchesContextType>({
  matches: [],
  loading: true,
});

export const useMatches = () => useContext(MatchesContext);

export const MatchesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "matches"), orderBy("startTime", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchItem[];
      setMatches(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <MatchesContext.Provider value={{ matches, loading }}>
        {children}
    </MatchesContext.Provider>
  );
};
