import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthDto } from './dto/auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async register(dto: AuthDto): Promise<AuthResponseDto> {
    // Use the admin client so the user is auto-confirmed regardless of the
    // project's email confirmation setting — no inbox required.
    const { data, error } =
      await this.supabaseService.admin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });

    if (error || !data.user) {
      throw new UnauthorizedException(error?.message ?? 'Registration failed');
    }

    // admin.createUser doesn't return a session — sign in immediately to get one
    const { data: session, error: loginError } =
      await this.supabaseService.client.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (loginError || !session.session || !session.user) {
      throw new UnauthorizedException(
        loginError?.message ?? 'Registered but could not create session',
      );
    }

    return {
      accessToken: session.session.access_token,
      user: { id: session.user.id, email: session.user.email ?? '' },
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
