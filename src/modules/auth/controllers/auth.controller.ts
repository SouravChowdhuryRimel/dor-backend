import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { PartyLoginDto } from '../dto/party-login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RefreshTokenGuard } from '../../../common/guards/refresh-token.guard';
import {
  AuthSuccessResponseDto,
  AuthCreatedSuccessResponseDto,
  LogoutSuccessResponseDto,
  BadRequestErrorResponseDto,
  UnauthorizedErrorResponseDto,
  ForbiddenErrorResponseDto,
} from '../dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Registers a new user, hashes their password, stores them in the database, and returns JWT access & refresh tokens.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully created and tokens returned.',
    type: AuthCreatedSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation errors or user already exists.',
    type: BadRequestErrorResponseDto,
  })
  signup(@Body() registerDto: RegisterDto) {
    return this.authService.signUp(registerDto);
  }

  @Post('signin')
  @ApiOperation({
    summary: 'Authenticate a user (Sign-in)',
    description:
      'Authenticates a user via email and password, returning JWT access & refresh tokens.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully.',
    type: AuthSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid email or password.',
    type: UnauthorizedErrorResponseDto,
  })
  signin(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto);
  }

  @Post('company/login')
  @ApiOperation({
    summary: 'Authenticate a Company (Sign-in)',
    description:
      'Authenticates a company via email and password. Requires the company status to be APPROVED. Returns JWT tokens.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Company authenticated successfully.',
    type: AuthSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid email or password.',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Company account is not approved.',
    type: ForbiddenErrorResponseDto,
  })
  companyLogin(@Body() loginDto: LoginDto) {
    return this.authService.signInCompany(loginDto);
  }

  @Post('party/login')
  @ApiOperation({
    summary: 'Authenticate a Party (Sign-in)',
    description:
      'Authenticates a party via phone number and password. Returns JWT tokens with PARTY role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Party authenticated successfully.',
    type: AuthSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid phone number or password.',
    type: UnauthorizedErrorResponseDto,
  })
  partyLogin(@Body() partyLoginDto: PartyLoginDto) {
    return this.authService.signInParty(partyLoginDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Email a password-reset token' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'A reset email is sent when the account exists.',
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset a password using an emailed token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 201, description: 'Password reset successfully.' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Get('logout')
  @ApiOperation({
    summary: 'Log out a user',
    description:
      'Logs out the user by clearing/invalidating their stored refresh token in the database. Requires a valid Access Token.',
  })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully.',
    type: LogoutSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Access token is missing or invalid.',
    type: UnauthorizedErrorResponseDto,
  })
  logout(@Req() req: any) {
    return this.authService.logout(req.user['sub']);
  }

  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @Get('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Acquires a new pair of access and refresh tokens using a valid refresh token. Requires a valid Refresh Token in the Authorization header.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed.',
    type: AuthSuccessResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Refresh token is missing, expired, or invalid.',
    type: ForbiddenErrorResponseDto,
  })
  refreshTokens(@Req() req: any) {
    const userId = req.user['sub'];
    const refreshToken = req.user['refreshToken'];
    const tokenType = req.user['tokenType'];
    return this.authService.refreshTokens(userId, refreshToken, tokenType);
  }

  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token (POST)',
    description:
      'Acquires a new pair of access and refresh tokens using a valid refresh token. Requires a valid Refresh Token in the Authorization header or request body.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed.',
    type: AuthSuccessResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Refresh token is missing, expired, or invalid.',
    type: ForbiddenErrorResponseDto,
  })
  refreshTokensPost(@Req() req: any) {
    const userId = req.user['sub'];
    const refreshToken = req.user['refreshToken'];
    const tokenType = req.user['tokenType'];
    return this.authService.refreshTokens(userId, refreshToken, tokenType);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Delete('fcm-token')
  @ApiOperation({
    summary: 'Remove FCM token of logged in user',
    description:
      'Clears/removes the stored FCM token for the currently authenticated user, company, party, or driver.',
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token removed successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Access token is missing or invalid.',
    type: UnauthorizedErrorResponseDto,
  })
  removeFcmToken(@Req() req: any) {
    return this.authService.removeFcmToken(req.user['sub']);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Post('remove-fcm-token')
  @ApiOperation({
    summary: 'Remove FCM token of logged in user (POST alias)',
    description:
      'Clears/removes the stored FCM token for the currently authenticated user, company, party, or driver.',
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token removed successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Access token is missing or invalid.',
    type: UnauthorizedErrorResponseDto,
  })
  removeFcmTokenPost(@Req() req: any) {
    return this.authService.removeFcmToken(req.user['sub']);
  }
}
