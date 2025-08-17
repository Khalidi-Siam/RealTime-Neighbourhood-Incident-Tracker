import { useState, useEffect, useCallback, useRef } from 'react';

const useInfiniteScroll = (fetchMoreData, hasNextPage) => {
  const [isFetching, setIsFetching] = useState(false);
  const observerRef = useRef();

  // Callback ref for the last element
  const lastElementRef = useCallback(node => {
    if (isFetching) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        setIsFetching(true);
      }
    });
    if (node) observerRef.current.observe(node);
  }, [isFetching, hasNextPage]);

  useEffect(() => {
    if (!isFetching) return;
    
    const fetchMore = async () => {
      try {
        await fetchMoreData();
      } catch (error) {
        console.error('Error fetching more data:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchMore();
  }, [isFetching, fetchMoreData]);

  return [lastElementRef, isFetching];
};

export default useInfiniteScroll;
