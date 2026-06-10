import { Injectable } from '@nestjs/common';
import { prisma } from 'src/database';
import { PASSWORD, JWT, RES } from 'src/utils';
import { Role } from 'src/common/interface/role.enum';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import logger from 'src/utils/logger';

@Injectable()
export class AuthService {

  async accessToken(payload: any, role: Role): Promise<string | null> {
    try {
      return await JWT.access.create({
        ...payload,
        role,
      });
    } catch (error) {
      logger.error(error);
      return null;
    }
  }

  async refreshToken(payload: any, role: Role): Promise<string | null> {
    try {
      return await JWT.refresh.create({
        ...payload,
        role,
      });
    } catch (error) {
      logger.error(error);
      return null;
    }
  }

  async signup(dto: SignupDto) {
    try {
      const { username, password } = dto;
      if (!username || !password) {
        return RES.error(400, 'Username and password are required', 'กรุณากรอก username และ password');
      }

      // Check duplicate username
      const existUser = await prisma.user.findUnique({
        where: { username },
      });
      if (existUser) {
        return RES.error(400, 'Username already exists', 'username นี้มีผู้ใช้งานแล้ว');
      }

      // Hash password
      const hashedPassword = await PASSWORD.hash(password);
      if (!hashedPassword) {
        return RES.error(500, 'Failed to secure password', 'เข้ารหัสผ่านไม่สำเร็จ');
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
        },
      });

      return RES.ok(201, 'User created successfully', 'สมัครสมาชิกสำเร็จ', {
        id: user.id,
        username: user.username,
      });
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  async login(dto: LoginDto) {
    try {
      const { username, password } = dto;
      if (!username || !password) {
        return RES.error(400, 'Username and password are required', 'กรุณากรอก username และ password');
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { username },
      });
      if (!user) {
        return RES.error(404, 'User not found', 'ไม่พบชื่อผู้ใช้งานนี้');
      }

      // Verify password
      const isMatch = await PASSWORD.compare(password, user.password);
      if (!isMatch) {
        return RES.error(401, 'Invalid password', 'รหัสผ่านไม่ถูกต้อง');
      }

      // Generate tokens
      const payload = { id: user.id, username: user.username };
      const access = await this.accessToken(payload, Role.USER);
      const refresh = await this.refreshToken(payload, Role.USER);

      if (!access || !refresh) {
        return RES.error(500, 'Failed to generate token', 'สร้าง token ไม่สำเร็จ');
      }

      return RES.ok(200, 'Login successful', 'เข้าสู่ระบบสำเร็จ', {
        accessToken: access,
        refreshToken: refresh,
        user: {
          id: user.id,
          username: user.username,
        },
      });
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  async refresh(token: string) {
    try {
      if (!token) {
        return RES.error(400, 'Refresh token is required', 'กรุณาระบุ refresh token');
      }

      // Verify and decode refresh token
      const decoded = await JWT.refresh.expose(token);
      if (!decoded) {
        return RES.error(401, 'Invalid or expired refresh token', 'refresh token ไม่ถูกต้องหรือหมดอายุ');
      }

      const payload = { id: decoded.id, username: decoded.username };
      const access = await this.accessToken(payload, decoded.role as Role);

      if (!access) {
        return RES.error(500, 'Failed to generate token', 'สร้าง token ไม่สำเร็จ');
      }

      return RES.ok(200, 'Token refreshed successfully', 'ต่ออายุ token สำเร็จ', {
        accessToken: access,
      });
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }
}
