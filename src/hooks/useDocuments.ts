import { useState, useEffect } from 'react';
import { Document, DocumentHistory, DocumentWithHistory } from '../types';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      setIsLoading(true);
      // Currently no database connection for documents
      setDocuments([]);
      setIsLoading(false);
    };

    fetchDocs();
  }, []);

  const addDocument = (newDoc: Document, historyEntry: Omit<DocumentHistory, 'id' | 'document_id'>) => {
    // Optimistic update or just local state for now
    const docWithHistory: DocumentWithHistory = {
      ...newDoc,
      history: [{
        id: `h-${Date.now()}`,
        document_id: newDoc.id,
        ...historyEntry
      }]
    };
    setDocuments(prev => [docWithHistory, ...prev]);
  };

  return { documents, isLoading, addDocument };
}
