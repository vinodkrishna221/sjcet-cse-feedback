import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { toast } from 'sonner';

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  sections: string[];
}

export const useTeachers = (section: string | undefined) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!section) return;

    const fetchTeachers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.getTeachersBySection(section);
        
        if (response.success && response.data) {
          setTeachers(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch teachers');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teachers';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [section]);

  const refetch = async () => {
    if (!section) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getTeachersBySection(section);
      
      if (response.success && response.data) {
        setTeachers(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch teachers');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teachers';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { teachers, loading, error, refetch };
};