import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getCountFromServer,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData,
  WhereFilterOp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { PaginationState } from '../components/DataTable/types';

export interface FilterRule {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

export interface UseFirestorePaginationOptions {
  collectionName: string;
  filters?: (FilterRule | null | undefined)[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  initialPageSize?: number;
  enabled?: boolean; // Set to false to disable fetching (e.g. while auth is resolving)
}

export interface UseFirestorePaginationResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
  totalCount?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  setPageSize: (size: number) => void;
  refetch: () => void;
  // Pre-configured pagination props to plug directly into <DataTable pagination={paginationProps} />
  paginationProps: PaginationState;
}

export function useFirestorePagination<T = DocumentData>({
  collectionName,
  filters = [],
  orderByField = 'created_at',
  orderDirection = 'desc',
  initialPageSize = 25,
  enabled = true,
}: UseFirestorePaginationOptions): UseFirestorePaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Stack of cursors: index 0 = cursor to start page 2, index 1 = cursor to start page 3, etc.
  // cursorsRef.current[pageIndex] stores the first document of that page or last of previous page
  const pageCursorsRef = useRef<Map<number, QueryDocumentSnapshot>>(new Map());

  // Filter signature to detect changes and reset pagination
  const filterSignature = JSON.stringify(
    filters
      .filter((f): f is FilterRule => !!f && f.value !== undefined && f.value !== 'ALL' && f.value !== '')
      .map(f => `${f.field}:${f.operator}:${f.value}`)
  ) + `|${orderByField}|${orderDirection}`;

  const lastFilterSignatureRef = useRef(filterSignature);

  // Fetch count when filters change
  useEffect(() => {
    if (!db || !enabled) return;

    let isMounted = true;
    async function fetchTotalCount() {
      try {
        const validFilters = filters.filter(
          (f): f is FilterRule => !!f && f.value !== undefined && f.value !== 'ALL' && f.value !== ''
        );

        const constraints: QueryConstraint[] = validFilters.map(f => 
          where(f.field, f.operator, f.value)
        );

        const countQuery = query(collection(db!, collectionName), ...constraints);
        const snapshot = await getCountFromServer(countQuery);
        if (isMounted) {
          setTotalCount(snapshot.data().count);
        }
      } catch (err: any) {
        // Count failure is non-blocking (e.g., missing permissions or offline)
        if (isMounted) {
          setTotalCount(undefined);
        }
      }
    }

    fetchTotalCount();
    return () => {
      isMounted = false;
    };
  }, [collectionName, filterSignature, enabled]);

  // Main data fetching function
  const fetchData = useCallback(async (targetPage: number, targetSize: number) => {
    if (!db || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validFilters = filters.filter(
        (f): f is FilterRule => !!f && f.value !== undefined && f.value !== 'ALL' && f.value !== ''
      );

      const constraints: QueryConstraint[] = validFilters.map(f => 
        where(f.field, f.operator, f.value)
      );

      // OrderBy
      if (orderByField) {
        constraints.push(orderBy(orderByField, orderDirection));
      }

      // If targetPage > 1, apply cursor startAfter from targetPage - 1
      if (targetPage > 1) {
        const cursorDoc = pageCursorsRef.current.get(targetPage - 1);
        if (cursorDoc) {
          constraints.push(startAfter(cursorDoc));
        }
      }

      // We fetch targetSize + 1 to check if hasNextPage exists without an extra query
      constraints.push(limit(targetSize + 1));

      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      const docs = snapshot.docs;
      const hasMore = docs.length > targetSize;
      const resultDocs = hasMore ? docs.slice(0, targetSize) : docs;

      // Save cursor for next page (the last doc of this page)
      if (resultDocs.length > 0) {
        const lastDoc = resultDocs[resultDocs.length - 1];
        pageCursorsRef.current.set(targetPage, lastDoc);
      }

      const parsedData = resultDocs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      setData(parsedData);
      setHasNextPage(hasMore);
      setCurrentPage(targetPage);
    } catch (err: any) {
      console.warn(`[useFirestorePagination] Error loading ${collectionName}:`, err);
      setError(err?.message || 'Gagal memuat data dari Firestore.');
    } finally {
      setLoading(false);
    }
  }, [collectionName, filters, orderByField, orderDirection, enabled]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    if (lastFilterSignatureRef.current !== filterSignature) {
      lastFilterSignatureRef.current = filterSignature;
      pageCursorsRef.current.clear();
      fetchData(1, pageSize);
    } else {
      fetchData(currentPage, pageSize);
    }
  }, [filterSignature, pageSize, fetchData]);

  const nextPage = useCallback(() => {
    if (!hasNextPage || loading) return;
    fetchData(currentPage + 1, pageSize);
  }, [hasNextPage, loading, currentPage, pageSize, fetchData]);

  const prevPage = useCallback(() => {
    if (currentPage <= 1 || loading) return;
    fetchData(currentPage - 1, pageSize);
  }, [currentPage, loading, pageSize, fetchData]);

  const goToFirstPage = useCallback(() => {
    if (currentPage === 1 && !loading) return;
    pageCursorsRef.current.clear();
    fetchData(1, pageSize);
  }, [currentPage, loading, pageSize, fetchData]);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    pageCursorsRef.current.clear();
    fetchData(1, newSize);
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData(currentPage, pageSize);
  }, [fetchData, currentPage, pageSize]);

  // Standardized props object for <DataTable pagination={paginationProps} />
  const paginationProps: PaginationState = {
    currentPage,
    pageSize,
    totalCount,
    hasNextPage,
    hasPrevPage: currentPage > 1,
    onNextPage: nextPage,
    onPrevPage: prevPage,
    onPageSizeChange: setPageSize,
  };

  return {
    data,
    loading,
    error,
    currentPage,
    pageSize,
    totalCount,
    hasNextPage,
    hasPrevPage: currentPage > 1,
    nextPage,
    prevPage,
    goToFirstPage,
    setPageSize,
    refetch,
    paginationProps,
  };
}
