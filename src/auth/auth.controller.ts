import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiCreatedTypedResponse,
  ApiOkTypedResponse,
} from '../common/decorators/api-typed-response.decorator';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a Supabase Auth account and returns a JWT access token.\n\n' +
      '> **Note:** If email confirmation is enabled in your Supabase project, ' +
      'the session will be `null` until the user confirms their email. ' +
      'Disable it in *Authentication → Email* for local development.',
  })
  @ApiCreatedTypedResponse(AuthResponseDto)
  @ApiBadRequestResponse({
    description: 'Email already in use or invalid input',
  })
  register(@Body() dto: AuthDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in',
    description:
      'Authenticates with email and password and returns a JWT access token. ' +
      'Pass the `accessToken` as `Authorization: Bearer <token>` on protected endpoints.',
  })
  @ApiOkTypedResponse(AuthResponseDto)
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: AuthDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}
