import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ApiKeyResult {
  key: string;
  keyId: string;
  success: boolean;
}

export class ApiKeyManager {
  constructor(private supabase: SupabaseClient, private service: 'sora2api' | 'atlascloud') {}

  /**
   * Get active API keys sorted by failure count (least failed first)
   */
  async getActiveKeys(): Promise<Array<{ id: string; key_value: string }>> {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('id, key_value')
      .eq('service', this.service)
      .eq('is_active', true)
      .order('failure_count', { ascending: true });

    if (error) {
      console.error('Error fetching API keys:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark key as used successfully
   */
  async markKeySuccess(keyId: string) {
    await this.supabase
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        failure_count: 0,
      })
      .eq('id', keyId);
  }

  /**
   * Mark key as failed
   */
  async markKeyFailure(keyId: string) {
    // Increment failure count
    const { data: keyData } = await this.supabase
      .from('api_keys')
      .select('failure_count')
      .eq('id', keyId)
      .single();

    const newFailureCount = (keyData?.failure_count || 0) + 1;

    // Deactivate key if it failed too many times (e.g., 3 times)
    const updates: any = {
      failure_count: newFailureCount,
    };

    if (newFailureCount >= 3) {
      updates.is_active = false;
      console.log(`Deactivating key ${keyId} after ${newFailureCount} failures`);
    }

    await this.supabase
      .from('api_keys')
      .update(updates)
      .eq('id', keyId);
  }

  /**
   * Try API call with automatic key rotation
   * @param apiCall Function that takes API key and returns response
   * @returns API response or throws error if all keys failed
   */
  async executeWithKeyRotation<T>(
    apiCall: (apiKey: string) => Promise<T>
  ): Promise<T> {
    const keys = await this.getActiveKeys();

    if (keys.length === 0) {
      throw new Error(`No active ${this.service} API keys available`);
    }

    let lastError: Error | null = null;

    for (const keyData of keys) {
      try {
        console.log(`Trying ${this.service} key: ${keyData.id.substring(0, 8)}...`);
        
        const result = await apiCall(keyData.key_value);
        
        // Success! Mark key as successful and return
        await this.markKeySuccess(keyData.id);
        console.log(`✅ ${this.service} key ${keyData.id.substring(0, 8)}... succeeded`);
        
        return result;
      } catch (error: any) {
        console.error(`❌ ${this.service} key ${keyData.id.substring(0, 8)}... failed:`, error.message);
        lastError = error;

        // Check if error is due to quota/rate limit/insufficient credits
        const errorMessage = error.message?.toLowerCase() || '';
        const isQuotaError = 
          errorMessage.includes('quota') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('insufficient') ||
          errorMessage.includes('402') || // Payment Required
          errorMessage.includes('429'); // Too Many Requests

        if (isQuotaError) {
          console.log(`Key exhausted, marking as failed and trying next key...`);
          await this.markKeyFailure(keyData.id);
          continue; // Try next key
        } else {
          // Non-quota error, might be request issue, don't mark as failed
          console.log(`Non-quota error, trying next key anyway...`);
          continue;
        }
      }
    }

    // All keys failed
    throw new Error(
      `All ${this.service} API keys failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }
}
