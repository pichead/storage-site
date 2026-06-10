import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JWT } from 'src/utils';

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.query && request.query.token) {
      token = request.query.token;
    }

    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header or token parameter');
    }
    const decoded = await JWT.access.expose(token);

    if (!decoded) {
      throw new UnauthorizedException('Token is invalid or expired');
    }

    // แนบข้อมูลผู้ใช้งานไปกับ request object
    request.user = decoded;
    return true;
  }
}
