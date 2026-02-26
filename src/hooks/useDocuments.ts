import { useState, useEffect } from 'react';
import { Document, DocumentHistory, DocumentWithHistory } from '../types';

const mockDocumentsData: Document[] = [
  {
    id: '1',
    title: 'Employee Handbook 2024.pdf',
    category_type: 'Guideline',
    department: 'HR',
    type: 'pdf',
    size: '2.4 MB',
    updatedAt: '2 hours ago',
    author: 'HR Dept',
    tags: ['Policy', 'HR'],
    version: 'v2.0',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    drive_folder_id: 'gdrive_guideline_hr',
  },
  {
    id: '2',
    title: 'Vendor Contract Template.doc',
    category_type: 'Template',
    department: 'Legal',
    type: 'doc',
    size: '45 KB',
    updatedAt: '1 month ago',
    author: 'Legal Team',
    tags: ['Template', 'Vendor'],
    version: 'v1.1',
    url: '#',
    drive_folder_id: 'gdrive_template_legal',
  },
  {
    id: '3',
    title: 'Tech Summit Venue Agreement.pdf',
    category_type: 'Contract',
    department: 'Event',
    type: 'pdf',
    size: '1.5 MB',
    updatedAt: '1 day ago',
    author: 'Alex Morgan',
    tags: ['Contract', 'TechSummit'],
    version: 'v1.0',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    drive_folder_id: 'gdrive_contract_event',
  },
  {
    id: '4',
    title: 'Q4 Marketing Agency NDA.pdf',
    category_type: 'Contract',
    department: 'Marketing',
    type: 'pdf',
    size: '800 KB',
    updatedAt: '3 days ago',
    author: 'Alex Morgan',
    tags: ['NDA', 'Marketing'],
    version: 'v1.0',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    drive_folder_id: 'gdrive_contract_marketing',
  }
];

const mockHistoryData: DocumentHistory[] = [
  { id: 'h1', document_id: '1', action: 'Uploaded', user: 'HR Dept', timestamp: '2 hours ago' },
  { id: 'h2', document_id: '2', action: 'Uploaded', user: 'Legal Team', timestamp: '1 month ago' },
  { id: 'h3', document_id: '3', action: 'Uploaded', user: 'Alex Morgan', timestamp: '1 day ago' },
  { id: 'h4', document_id: '4', action: 'Uploaded', user: 'Alex Morgan', timestamp: '4 days ago' }
];

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const combined = mockDocumentsData.map(doc => ({
          ...doc,
          history: mockHistoryData.filter(h => h.document_id === doc.id)
        }));
        setDocuments(combined);
        setIsLoading(false);
      }, 500);
    };

    fetchDocs();
  }, []);

  const addDocument = (newDoc: Document, historyEntry: Omit<DocumentHistory, 'id' | 'document_id'>) => {
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
