import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const key = this.configService.getOrThrow<string>('SUPABASE_ANON_KEY');
    // Supabase 2.x infers a slightly different generic signature than
    // SupabaseClient's own defaults. The cast through `unknown` acknowledges
    // this at one place instead of spreading `any` across every query site.
    this.client = createClient(url, key) as unknown as SupabaseClient;
  }
}
