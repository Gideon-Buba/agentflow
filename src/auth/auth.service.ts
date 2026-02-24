import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthDto } from './dto/auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async register(dto: AuthDto): Promise<AuthResponseDto> {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedException(
        'Email confirmation required — check your inbox before logging in.',
      );
    }

    return {
      accessToken: data.session.access_token,
      user: { id: data.user.id, email: data.user.email ?? '' },
    };
  }

  async login(dto: AuthDto): Promise<AuthResponseDto> {
    const { data, error } =
      await this.supabaseService.client.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException(error?.message ?? 'Invalid credentials');
    }

    return {
      accessToken: data.session.access_token,
      user: { id: data.user.id, email: data.user.email ?? '' },
    };
  }
}
