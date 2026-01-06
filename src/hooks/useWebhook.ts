import { useState, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, fetchWebhook, WebhookResponse, WebhookEndpoint } from '@/lib/api/webhooks';

interface UseWebhookOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export function useWebhook<T = unknown>(endpoint: WebhookEndpoint | string, options?: UseWebhookOptions) {
  const { tenantId } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const call = useCallback(async (payload: Record<string, unknown> = {}): Promise<WebhookResponse<T>> => {
    if (!tenantId) {
      const errorMsg = 'No tenant selected';
      setError(errorMsg);
      options?.onError?.(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await callWebhook<T>(endpoint, payload, tenantId);
      
      if (result.success && result.data) {
        setData(result.data);
        options?.onSuccess?.(result.data);
      } else if (result.error) {
        setError(result.error);
        options?.onError?.(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      options?.onError?.(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, tenantId, options]);

  const fetch = useCallback(async (params?: Record<string, string>): Promise<WebhookResponse<T>> => {
    if (!tenantId) {
      const errorMsg = 'No tenant selected';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchWebhook<T>(endpoint, tenantId, params);
      
      if (result.success && result.data) {
        setData(result.data);
      } else if (result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, tenantId]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { 
    call, 
    fetch,
    reset,
    isLoading, 
    error, 
    data,
    tenantId 
  };
}

// Mutation hook with optimistic updates support
export function useWebhookMutation<TData = unknown, TVariables = Record<string, unknown>>(
  endpoint: WebhookEndpoint | string,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: string) => void;
    onMutate?: (variables: TVariables) => void;
  }
) {
  const { tenantId } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (variables: TVariables): Promise<WebhookResponse<TData>> => {
    if (!tenantId) {
      const errorMsg = 'No tenant selected';
      setError(errorMsg);
      options?.onError?.(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsLoading(true);
    setError(null);
    options?.onMutate?.(variables);

    try {
      const result = await callWebhook<TData>(endpoint, variables as Record<string, unknown>, tenantId);
      
      if (result.success && result.data) {
        options?.onSuccess?.(result.data);
      } else if (result.error) {
        setError(result.error);
        options?.onError?.(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      options?.onError?.(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, tenantId, options]);

  return { mutate, isLoading, error };
}
